-- GitHub connection: verified identity plus a snapshot of public activity.
-- The database itself calls GitHub with the student's one-time OAuth token, so the numbers
-- cannot be forged by a client and no shared secret is needed.

create extension if not exists http with schema extensions;

alter table public.profiles
  add column github_id bigint unique,
  add column github_connected_at timestamptz;

create table public.github_snapshots (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  login text not null,
  public_repos integer not null check (public_repos >= 0),
  followers integer not null check (followers >= 0),
  contributions_total integer not null check (contributions_total >= 0),
  -- { start: "YYYY-MM-DD", counts: [int...], levels: ["NONE"|"FIRST_QUARTILE"|...] } one entry per day
  calendar jsonb not null check (pg_column_size(calendar) < 60000),
  top_repos jsonb not null,
  languages jsonb not null,
  account_created_on date,
  synced_at timestamptz not null default now()
);

alter table public.github_snapshots enable row level security;

create policy "Users can read their own GitHub snapshot"
on public.github_snapshots for select to authenticated
using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.github_snapshots from anon, authenticated;
revoke all on public.github_snapshots from anon;

-- ---------------------------------------------------------------------------
-- Internal: turn a GitHub GraphQL "viewer" object into a stored snapshot.
-- Not callable by users; only connect_github() below (and tests) use it.
-- ---------------------------------------------------------------------------

create function public.store_github_snapshot(p_uid uuid, p_viewer jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cal jsonb := p_viewer #> '{contributionsCollection,contributionCalendar}';
begin
  insert into public.github_snapshots as s (
    user_id, login, public_repos, followers, contributions_total, calendar,
    top_repos, languages, account_created_on, synced_at
  )
  values (
    p_uid,
    p_viewer ->> 'login',
    (p_viewer #>> '{repositories,totalCount}')::integer,
    (p_viewer #>> '{followers,totalCount}')::integer,
    (v_cal ->> 'totalContributions')::integer,
    jsonb_build_object(
      'start', jsonb_path_query_first(v_cal, '$.weeks[0].contributionDays[0].date'),
      'counts', jsonb_path_query_array(v_cal, '$.weeks[*].contributionDays[*].contributionCount'),
      'levels', jsonb_path_query_array(v_cal, '$.weeks[*].contributionDays[*].contributionLevel')
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', left(r ->> 'name', 100),
        'description', left(r ->> 'description', 200),
        'url', r ->> 'url',
        'stars', (r ->> 'stargazerCount')::integer,
        'forks', (r ->> 'forkCount')::integer,
        'language', r #>> '{primaryLanguage,name}'
      ))
      from jsonb_array_elements(p_viewer #> '{topRepos,nodes}') r
      where (r ->> 'url') like 'https://github.com/%'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('name', l.name, 'repos', l.n) order by l.n desc, l.name)
      from (
        select r #>> '{primaryLanguage,name}' as name, count(*) as n
        from jsonb_array_elements(p_viewer #> '{langRepos,nodes}') r
        where r #>> '{primaryLanguage,name}' is not null
        group by 1
        order by 2 desc, 1
        limit 8
      ) l
    ), '[]'::jsonb),
    (p_viewer ->> 'createdAt')::date,
    now()
  )
  on conflict (user_id) do update
  set login = excluded.login,
      public_repos = excluded.public_repos,
      followers = excluded.followers,
      contributions_total = excluded.contributions_total,
      calendar = excluded.calendar,
      top_repos = excluded.top_repos,
      languages = excluded.languages,
      account_created_on = excluded.account_created_on,
      synced_at = excluded.synced_at;

  update public.profiles
  set github_username = p_viewer ->> 'login',
      github_id = (p_viewer ->> 'databaseId')::bigint,
      github_connected_at = coalesce(github_connected_at, now())
  where id = p_uid;
end;
$$;

revoke execute on function public.store_github_snapshot from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Connect: called by the server right after the student authorizes GitHub.
-- ---------------------------------------------------------------------------

create function public.connect_github(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_identity text;
  v_resp extensions.http_response;
  v_body jsonb;
  v_viewer jsonb;
  v_query constant text := $q$
    query {
      viewer {
        login
        databaseId
        createdAt
        followers { totalCount }
        repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
        topRepos: repositories(first: 6, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false,
                               orderBy: { field: STARGAZERS, direction: DESC }) {
          nodes { name description url stargazerCount forkCount primaryLanguage { name } }
        }
        langRepos: repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false,
                                orderBy: { field: PUSHED_AT, direction: DESC }) {
          nodes { primaryLanguage { name } }
        }
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount contributionLevel } }
          }
        }
      }
    }
  $q$;
begin
  if coalesce(length(p_token), 0) < 20 or length(p_token) > 400 then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  -- The GitHub account must be the one linked to this login through OAuth.
  select i.provider_id into v_identity
  from auth.identities i
  where i.user_id = v_uid and i.provider = 'github'
  limit 1;
  if v_identity is null then
    raise exception 'github_not_linked' using errcode = 'P0001';
  end if;

  -- One refresh a minute is plenty; stops someone using the database as a request cannon.
  if exists (
    select 1 from public.github_snapshots where user_id = v_uid and synced_at > now() - interval '1 minute'
  ) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '10');
  v_resp := extensions.http((
    'POST',
    'https://api.github.com/graphql',
    array[
      extensions.http_header('Authorization', 'Bearer ' || p_token),
      extensions.http_header('User-Agent', 'findmyteam')
    ],
    'application/json',
    jsonb_build_object('query', v_query)::text
  )::extensions.http_request);

  if v_resp.status <> 200 then
    raise exception 'github_unavailable' using errcode = 'P0001';
  end if;

  v_body := v_resp.content::jsonb;
  v_viewer := v_body #> '{data,viewer}';
  if v_viewer is null or v_body ? 'errors' then
    raise exception 'github_unavailable' using errcode = 'P0001';
  end if;

  if (v_viewer ->> 'databaseId') is distinct from v_identity then
    raise exception 'identity_mismatch' using errcode = 'P0001';
  end if;

  perform public.store_github_snapshot(v_uid, v_viewer);
end;
$$;

-- ---------------------------------------------------------------------------
-- Disconnect: removes the snapshot and the stored handle. (The server also unlinks the identity.)
-- ---------------------------------------------------------------------------

create function public.disconnect_github()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  delete from public.github_snapshots where user_id = v_uid;
  update public.profiles
  set github_username = null, github_id = null, github_connected_at = null
  where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- LinkedIn on its own, for the optional onboarding step (PROF-8).
-- ---------------------------------------------------------------------------

create function public.set_linkedin_url(p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  update public.profiles set linkedin_url = nullif(trim(p_url), '') where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- save_profile no longer takes a GitHub username: GitHub now comes only from connecting.
-- ---------------------------------------------------------------------------

drop function public.save_profile(text, text, text, text, smallint, smallint, smallint, jsonb, smallint[]);

create function public.save_profile(
  p_display_name text,
  p_bio text,
  p_linkedin_url text,
  p_branch_id smallint,
  p_year_of_study smallint,
  p_graduation_year smallint,
  p_skills jsonb,
  p_role_ids smallint[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if jsonb_typeof(p_skills) is distinct from 'array' then
    raise exception 'invalid_skills' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_skills) > 15 then
    raise exception 'too_many_skills' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_role_ids, 1), 0) > 3 then
    raise exception 'too_many_roles' using errcode = 'P0001';
  end if;

  update public.profiles
  set display_name    = trim(p_display_name),
      bio             = nullif(trim(p_bio), ''),
      linkedin_url    = nullif(trim(p_linkedin_url), ''),
      branch_id       = p_branch_id,
      year_of_study   = p_year_of_study,
      graduation_year = p_graduation_year
  where id = v_uid;

  delete from public.profile_skills where user_id = v_uid;
  insert into public.profile_skills (user_id, skill_id, level)
  select distinct on (q.skill_id) v_uid, q.skill_id, q.level
  from (
    select (e ->> 'id')::smallint as skill_id, (e ->> 'level')::public.skill_level as level
    from jsonb_array_elements(p_skills) e
  ) q
  order by q.skill_id;

  delete from public.profile_roles where user_id = v_uid;
  insert into public.profile_roles (user_id, role_id)
  select distinct v_uid, r from unnest(coalesce(p_role_ids, '{}'::smallint[])) r;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_profile now includes the GitHub summary and whether it is verified.
-- ---------------------------------------------------------------------------

drop function public.get_profile(uuid);

create function public.get_profile(p_id uuid)
returns table (
  id uuid,
  display_name text,
  bio text,
  github_username text,
  github_verified boolean,
  github jsonb,
  linkedin_url text,
  degree public.degree,
  college_name text,
  branch_name text,
  year_of_study smallint,
  graduation_year smallint,
  skills jsonb,
  roles jsonb,
  is_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select p.id, p.display_name, p.bio, p.github_username, (p.github_id is not null),
         (select jsonb_build_object(
                   'login', g.login, 'public_repos', g.public_repos, 'followers', g.followers,
                   'contributions_total', g.contributions_total, 'calendar', g.calendar,
                   'top_repos', g.top_repos, 'languages', g.languages,
                   'account_created_on', g.account_created_on, 'synced_at', g.synced_at)
          from public.github_snapshots g where g.user_id = p.id),
         p.linkedin_url, p.degree,
         coalesce(c.name, p.college_other), b.name, p.year_of_study, p.graduation_year,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category, 'level', ps.level)
                            order by s.category, s.name)
           from public.profile_skills ps join public.skills s on s.id = ps.skill_id
           where ps.user_id = p.id
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.sort_order)
           from public.profile_roles pr join public.roles r on r.id = pr.role_id
           where pr.user_id = p.id
         ), '[]'::jsonb),
         (p.id = v_uid)
  from public.profiles p
  left join public.colleges c on c.id = p.college_id
  left join public.branches b on b.id = p.branch_id
  where p.id = p_id
    and p.onboarded_at is not null
    and (p.status = 'active' or p.id = v_uid);
end;
$$;

revoke execute on function
  public.connect_github, public.disconnect_github, public.set_linkedin_url,
  public.save_profile, public.get_profile
from public, anon;
grant execute on function
  public.connect_github, public.disconnect_github, public.set_linkedin_url,
  public.save_profile, public.get_profile
to authenticated;
