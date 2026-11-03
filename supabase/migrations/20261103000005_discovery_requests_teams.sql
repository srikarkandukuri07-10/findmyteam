-- People discovery (swipes), connection requests and teams.
-- Covers the visible parts of PRD DISC-1..7, REQ-1..5 and TEAM-5/6 (browsing). Creating and joining
-- teams, chat and notifications come in later modules.

-- Rows made by the demo seed are flagged so they can be removed in one command (supabase/seed/remove-demo.sql).
alter table public.profiles add column is_demo boolean not null default false;
alter table public.hackathons add column is_demo boolean not null default false;

-- ---------------------------------------------------------------------------
-- Swipes and requests
-- ---------------------------------------------------------------------------

create type public.swipe_action as enum ('connect', 'skip');
create type public.request_status as enum ('pending', 'accepted', 'rejected', 'cancelled', 'expired');

create table public.swipes (
  actor_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  action public.swipe_action not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, target_id),
  constraint swipes_not_self check (actor_id <> target_id)
);
create index swipes_actor_created_idx on public.swipes (actor_id, created_at desc);
create index swipes_target_idx on public.swipes (target_id);

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status public.request_status not null default 'pending',
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint requests_not_self check (sender_id <> recipient_id)
);
-- One live request per pair of students, whichever way round it was sent.
create unique index connection_requests_live_pair_idx
  on public.connection_requests (least(sender_id, recipient_id), greatest(sender_id, recipient_id))
  where status in ('pending', 'accepted');
create index connection_requests_recipient_idx on public.connection_requests (recipient_id, status);
create index connection_requests_sender_idx on public.connection_requests (sender_id, status);

-- ---------------------------------------------------------------------------
-- Teams (read-only for now)
-- ---------------------------------------------------------------------------

create type public.recruit_status as enum ('open', 'partially_filled', 'full', 'closed');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  hackathon_id uuid references public.hackathons (id) on delete set null,
  description text check (char_length(description) <= 500),
  idea text check (char_length(idea) <= 300),
  owner_id uuid references public.profiles (id) on delete set null,
  recruit_status public.recruit_status not null default 'open',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index teams_hackathon_idx on public.teams (hackathon_id);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_owner boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on public.team_members (user_id);

create table public.team_positions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  role_id smallint not null references public.roles (id),
  spots smallint not null check (spots between 1 and 5)
);
create index team_positions_team_idx on public.team_positions (team_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: own rows only; everything else goes through the functions below.
-- ---------------------------------------------------------------------------

alter table public.swipes enable row level security;
alter table public.connection_requests enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_positions enable row level security;

create policy "Users can read their own swipes"
on public.swipes for select to authenticated using (actor_id = (select auth.uid()));

create policy "Users can read requests they sent or received"
on public.connection_requests for select to authenticated
using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create policy "Signed-in users can read teams"
on public.teams for select to authenticated using (true);

create policy "Signed-in users can read team positions"
on public.team_positions for select to authenticated using (true);

revoke insert, update, delete, truncate on
  public.swipes, public.connection_requests, public.teams, public.team_members, public.team_positions
from anon, authenticated;
revoke all on public.swipes, public.connection_requests, public.teams, public.team_members, public.team_positions from anon;
revoke all on public.team_members from authenticated;

-- ---------------------------------------------------------------------------
-- Discovery: the next students to show, best matches first (DISC-1..6)
-- ---------------------------------------------------------------------------

create function public.discover_people(p_limit integer default 20)
returns table (
  id uuid,
  display_name text,
  bio text,
  degree public.degree,
  college_name text,
  branch_name text,
  year_of_study smallint,
  graduation_year smallint,
  skills jsonb,
  roles jsonb,
  github jsonb,
  github_verified boolean,
  is_demo boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_my_college smallint;
begin
  select p0.college_id into v_my_college from public.profiles p0 where p0.id = v_uid;

  return query
  with comp(a, b) as (
    values
      ('frontend', 'backend'), ('frontend', 'design'), ('frontend', 'ml-ai'), ('frontend', 'product'),
      ('backend', 'design'), ('backend', 'ml-ai'), ('backend', 'devops'), ('backend', 'mobile'),
      ('ml-ai', 'data'), ('ml-ai', 'design'), ('ml-ai', 'product'), ('ml-ai', 'embedded'),
      ('mobile', 'design'), ('embedded', 'backend'), ('security', 'devops'), ('security', 'backend'),
      ('product', 'design'), ('product', 'pitch'), ('fullstack', 'design'), ('fullstack', 'ml-ai'),
      ('data', 'product'), ('pitch', 'design'), ('devops', 'ml-ai')
  ),
  cand as (
    select p.id as cid, p.display_name as cname, p.bio as cbio, p.degree as cdegree,
           coalesce(c.name, p.college_other) as ccollege, p.college_id as ccollege_id, b.name as cbranch,
           p.year_of_study as cyear, p.graduation_year as cgrad, p.linkedin_url as clinkedin,
           p.github_id as cgithub_id, p.is_demo as cdemo,
           (select count(*) from public.profile_skills x where x.user_id = p.id) as cskill_count,
           (select count(*) from public.profile_roles x where x.user_id = p.id) as crole_count,
           (select g.contributions_total from public.github_snapshots g where g.user_id = p.id) as ccontribs
    from public.profiles p
    left join public.colleges c on c.id = p.college_id
    left join public.branches b on b.id = p.branch_id
    where p.id <> v_uid
      and p.onboarded_at is not null
      and p.status = 'active'
      -- a connect is final; a skip comes back after 30 days (DISC-5)
      and not exists (
        select 1 from public.swipes s
        where s.actor_id = v_uid and s.target_id = p.id
          and (s.action = 'connect' or s.created_at > now() - interval '30 days'))
      -- never someone with a live request in either direction (DISC-6)
      and not exists (
        select 1 from public.connection_requests r
        where ((r.sender_id = v_uid and r.recipient_id = p.id) or (r.sender_id = p.id and r.recipient_id = v_uid))
          and (r.status = 'accepted' or (r.status = 'pending' and r.created_at > now() - interval '14 days')))
  ),
  scored as (
    select cand.*,
           (select r2.name || '|' || r1.name
            from public.profile_roles pr2
            join public.roles r2 on r2.id = pr2.role_id
            join public.profile_roles pr1 on pr1.user_id = v_uid
            join public.roles r1 on r1.id = pr1.role_id
            join comp on (comp.a = r1.slug and comp.b = r2.slug) or (comp.a = r2.slug and comp.b = r1.slug)
            where pr2.user_id = cand.cid
            limit 1) as complement_pair,
           (select h.name
            from public.hackathon_interest i1
            join public.hackathon_interest i2 on i2.hackathon_id = i1.hackathon_id and i2.user_id = cand.cid
            join public.hackathons h on h.id = i1.hackathon_id
            where i1.user_id = v_uid and h.status = 'active' and h.ends_on >= current_date
            order by h.starts_on limit 1) as shared_hackathon,
           (select count(*)
            from public.hackathon_interest i1
            join public.hackathon_interest i2 on i2.hackathon_id = i1.hackathon_id and i2.user_id = cand.cid
            join public.hackathons h on h.id = i1.hackathon_id
            where i1.user_id = v_uid and h.status = 'active' and h.ends_on >= current_date) as shared_count
    from cand
  ),
  ranked as (
    select s.*,
           (case when s.complement_pair is not null then 3.0 else 0 end)
           + least(s.shared_count, 2) * 1.5
           + (case when s.ccollege_id is distinct from v_my_college then 0.5 else 0 end)
           -- how complete a profile is also counts, modestly (never shown to students)
           + (case when s.cgithub_id is not null then 1.0 else 0 end)
           + (case when coalesce(s.ccontribs, 0) >= 200 then 0.5 else 0 end)
           + (case when s.clinkedin is not null then 0.5 else 0 end)
           + (case when char_length(coalesce(s.cbio, '')) >= 40 then 0.5 else 0 end)
           + (case when s.cskill_count >= 3 then 0.5 else 0 end)
           + (case when s.crole_count >= 1 then 0.3 else 0 end)
           + random() * 1.5 as score
    from scored s
  )
  select k.cid, k.cname, k.cbio, k.cdegree, k.ccollege, k.cbranch, k.cyear, k.cgrad,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'category', t.category, 'level', t.level)
                            order by t.level_order, t.name)
           from (
             select s2.id, s2.name, s2.category, ps.level,
                    case ps.level when 'advanced' then 0 when 'intermediate' then 1 else 2 end as level_order
             from public.profile_skills ps join public.skills s2 on s2.id = ps.skill_id
             where ps.user_id = k.cid
             order by case ps.level when 'advanced' then 0 when 'intermediate' then 1 else 2 end, s2.name
             limit 6
           ) t
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.sort_order)
           from public.profile_roles pr join public.roles r on r.id = pr.role_id
           where pr.user_id = k.cid
         ), '[]'::jsonb),
         (select jsonb_build_object(
                   'login', g.login, 'public_repos', g.public_repos, 'followers', g.followers,
                   'contributions_total', g.contributions_total,
                   'top_language', g.languages -> 0 ->> 'name')
          from public.github_snapshots g where g.user_id = k.cid),
         (k.cgithub_id is not null),
         k.cdemo,
         case when k.complement_pair is not null
                then split_part(k.complement_pair, '|', 1) || ' · pairs well with your ' || split_part(k.complement_pair, '|', 2)
              when k.shared_hackathon is not null then 'Also interested in ' || k.shared_hackathon
              when k.ccollege_id is distinct from v_my_college and k.ccollege is not null then 'From ' || k.ccollege
              else 'Looking for a team' end
  from ranked k
  order by k.score desc
  limit least(greatest(p_limit, 1), 50);
end;
$$;

-- Connects left today (DISC-7): 25 per rolling 24 hours.
create function public.my_connects_left()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return greatest(0, 25 - (select count(*)::integer from public.swipes s
                           where s.actor_id = v_uid and s.action = 'connect' and s.created_at > now() - interval '24 hours'));
end;
$$;

-- Swipe right = connect (sends a request), swipe left = skip. Returns 'sent', 'skipped', 'already' or 'limit'.
create function public.swipe_person(p_target uuid, p_action public.swipe_action)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if p_target = v_uid or not exists (
    select 1 from public.profiles where id = p_target and onboarded_at is not null and status = 'active'
  ) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  if p_action = 'skip' then
    insert into public.swipes (actor_id, target_id, action) values (v_uid, p_target, 'skip')
    on conflict (actor_id, target_id) do update set action = 'skip', created_at = now()
    where public.swipes.action = 'skip';
    return 'skipped';
  end if;

  if public.my_connects_left() <= 0 then
    return 'limit';
  end if;

  -- A request nobody answered for 14 days no longer blocks a new one (REQ-1).
  update public.connection_requests
  set status = 'expired'
  where status = 'pending' and created_at <= now() - interval '14 days'
    and least(sender_id, recipient_id) = least(v_uid, p_target)
    and greatest(sender_id, recipient_id) = greatest(v_uid, p_target);

  if exists (
    select 1 from public.connection_requests
    where status in ('pending', 'accepted')
      and least(sender_id, recipient_id) = least(v_uid, p_target)
      and greatest(sender_id, recipient_id) = greatest(v_uid, p_target)
  ) then
    return 'already';
  end if;

  insert into public.swipes (actor_id, target_id, action) values (v_uid, p_target, 'connect')
  on conflict (actor_id, target_id) do update set action = 'connect', created_at = now();

  insert into public.connection_requests (sender_id, recipient_id) values (v_uid, p_target);
  return 'sent';
exception when unique_violation then
  return 'already';
end;
$$;

-- ---------------------------------------------------------------------------
-- Requests: lists and answers (REQ-2, REQ-4, REQ-5)
-- ---------------------------------------------------------------------------

create function public.list_requests(p_direction text)
returns table (
  id uuid,
  status public.request_status,
  created_at timestamptz,
  responded_at timestamptz,
  note text,
  other_id uuid,
  other_name text,
  other_college text,
  other_branch text,
  other_year smallint,
  other_roles jsonb,
  other_is_demo boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if p_direction not in ('received', 'sent') then
    raise exception 'invalid_direction' using errcode = 'P0001';
  end if;

  return query
  select r.id,
         case when r.status = 'pending' and r.created_at <= now() - interval '14 days'
              then 'expired'::public.request_status else r.status end,
         r.created_at, r.responded_at, r.note,
         o.id, o.display_name, coalesce(c.name, o.college_other), b.name, o.year_of_study,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', ro.id, 'name', ro.name) order by ro.sort_order)
           from public.profile_roles pr join public.roles ro on ro.id = pr.role_id
           where pr.user_id = o.id
         ), '[]'::jsonb),
         o.is_demo
  from public.connection_requests r
  join public.profiles o on o.id = case when p_direction = 'received' then r.sender_id else r.recipient_id end
  left join public.colleges c on c.id = o.college_id
  left join public.branches b on b.id = o.branch_id
  where case when p_direction = 'received' then r.recipient_id else r.sender_id end = v_uid
    and o.status = 'active'
  order by (r.status = 'pending' and r.created_at > now() - interval '14 days') desc, r.created_at desc
  limit 100;
end;
$$;

-- The recipient accepts or rejects a pending request. Rejections are never announced to the sender (REQ-5).
create function public.respond_request(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_updated integer;
begin
  update public.connection_requests
  set status = case when p_accept then 'accepted'::public.request_status else 'rejected'::public.request_status end,
      responded_at = now()
  where id = p_id and recipient_id = v_uid and status = 'pending' and created_at > now() - interval '14 days';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- The sender withdraws a request nobody has answered yet.
create function public.cancel_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_updated integer;
begin
  update public.connection_requests
  set status = 'cancelled', responded_at = now()
  where id = p_id and sender_id = v_uid and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Teams directory (TEAM-5, TEAM-6)
-- ---------------------------------------------------------------------------

create function public.list_teams(p_hackathon uuid default null)
returns table (
  id uuid,
  name text,
  description text,
  recruit_status public.recruit_status,
  hackathon_id uuid,
  hackathon_name text,
  hackathon_starts_on date,
  member_count integer,
  members jsonb,
  positions jsonb,
  is_demo boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_onboarded();

  return query
  select t.id, t.name, t.description, t.recruit_status, t.hackathon_id, h.name, h.starts_on,
         (select count(*)::integer from public.team_members m where m.team_id = t.id),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.display_name) order by m.is_owner desc, m.joined_at)
           from public.team_members m join public.profiles u on u.id = m.user_id
           where m.team_id = t.id and u.status = 'active'
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('role', r.name, 'spots', tp.spots) order by r.sort_order)
           from public.team_positions tp join public.roles r on r.id = tp.role_id
           where tp.team_id = t.id
         ), '[]'::jsonb),
         t.is_demo
  from public.teams t
  left join public.hackathons h on h.id = t.hackathon_id
  where t.recruit_status <> 'closed'
    and (p_hackathon is null or t.hackathon_id = p_hackathon)
  order by (t.recruit_status in ('open', 'partially_filled')) desc, t.created_at desc
  limit 100;
end;
$$;

create function public.get_team(p_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  idea text,
  recruit_status public.recruit_status,
  hackathon_id uuid,
  hackathon_name text,
  hackathon_starts_on date,
  hackathon_ends_on date,
  members jsonb,
  positions jsonb,
  is_demo boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_onboarded();

  return query
  select t.id, t.name, t.description, t.idea, t.recruit_status, t.hackathon_id, h.name, h.starts_on, h.ends_on,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', u.id, 'name', u.display_name, 'is_owner', m.is_owner,
                    'college', coalesce(c.name, u.college_other), 'year', u.year_of_study,
                    'roles', coalesce((
                      select jsonb_agg(ro.name order by ro.sort_order)
                      from public.profile_roles pr join public.roles ro on ro.id = pr.role_id
                      where pr.user_id = u.id), '[]'::jsonb))
                  order by m.is_owner desc, m.joined_at)
           from public.team_members m
           join public.profiles u on u.id = m.user_id
           left join public.colleges c on c.id = u.college_id
           where m.team_id = t.id and u.status = 'active'
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('role', r.name, 'spots', tp.spots) order by r.sort_order)
           from public.team_positions tp join public.roles r on r.id = tp.role_id
           where tp.team_id = t.id
         ), '[]'::jsonb),
         t.is_demo
  from public.teams t
  left join public.hackathons h on h.id = t.hackathon_id
  where t.id = p_id;
end;
$$;

revoke execute on function
  public.discover_people, public.my_connects_left, public.swipe_person,
  public.list_requests, public.respond_request, public.cancel_request,
  public.list_teams, public.get_team
from public, anon;
grant execute on function
  public.discover_people, public.my_connects_left, public.swipe_person,
  public.list_requests, public.respond_request, public.cancel_request,
  public.list_teams, public.get_team
to authenticated;
