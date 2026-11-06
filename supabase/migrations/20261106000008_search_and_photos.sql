-- Module 3 (D21): profile photos, universal search, and the connect state shown on a profile.

-- ---------------------------------------------------------------------------
-- Photos: one per student in the public "avatars" bucket, under a folder named after their id.
-- File names are random, so a photo's address can't be guessed. Students without a photo get an
-- illustrated avatar drawn in the app from their id.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column avatar_path text
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[a-z0-9-]{8,64}\.(webp|jpg|png)$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Students upload into their own avatar folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students replace files in their own avatar folder"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students delete files in their own avatar folder"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- PROF-1: point my profile at a photo I uploaded (or clear it with null).
create or replace function public.set_avatar(p_path text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if p_path is not null and split_part(p_path, '/', 1) <> v_uid::text then
    raise exception 'invalid_avatar_path' using errcode = '22023';
  end if;
  update public.profiles set avatar_path = p_path, updated_at = now() where id = v_uid;
end;
$$;
revoke all on function public.set_avatar(text) from public, anon;
grant execute on function public.set_avatar(text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_profile now also returns the photo and the sample flag.
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
  is_me boolean,
  avatar_path text,
  is_demo boolean
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
         (p.id = v_uid),
         p.avatar_path,
         p.is_demo
  from public.profiles p
  left join public.colleges c on c.id = p.college_id
  left join public.branches b on b.id = p.branch_id
  where p.id = p_id
    and p.onboarded_at is not null
    and (p.status = 'active' or p.id = v_uid);
end;
$$;
revoke execute on function public.get_profile(uuid) from public, anon;
grant execute on function public.get_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The Connect button on a profile: where the two of us stand.
-- state: none | sent | received | connected; request_id is set for sent and received.
-- ---------------------------------------------------------------------------

create or replace function public.connection_state(p_other uuid)
returns table (state text, request_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  r record;
begin
  select cr.id, cr.sender_id, cr.status into r
  from public.connection_requests cr
  where least(cr.sender_id, cr.recipient_id) = least(v_uid, p_other)
    and greatest(cr.sender_id, cr.recipient_id) = greatest(v_uid, p_other)
    and (cr.status = 'accepted' or (cr.status = 'pending' and cr.created_at > now() - interval '14 days'))
  order by cr.created_at desc
  limit 1;

  if not found then
    return query select 'none'::text, null::uuid;
  elsif r.status = 'accepted' then
    return query select 'connected'::text, r.id;
  elsif r.sender_id = v_uid then
    return query select 'sent'::text, r.id;
  else
    return query select 'received'::text, r.id;
  end if;
end;
$$;
revoke all on function public.connection_state(uuid) from public, anon;
grant execute on function public.connection_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- SRCH-1: universal search. People by name, skill or college; teams by name.
-- At most 120 searches a minute per student, so the directory can't be pulled out by script.
-- ---------------------------------------------------------------------------

create table public.search_usage (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  window_start timestamptz not null,
  calls integer not null
);
alter table public.search_usage enable row level security;
revoke all on public.search_usage from anon, authenticated;

create or replace function public.search_everything(p_query text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_q text := btrim(coalesce(p_query, ''));
  v_like text;
  v_calls integer;
begin
  if char_length(v_q) < 1 or char_length(v_q) > 60 then
    return jsonb_build_object('people', '[]'::jsonb, 'teams', '[]'::jsonb);
  end if;

  insert into public.search_usage as su (user_id, window_start, calls)
  values (v_uid, now(), 1)
  on conflict (user_id) do update
    set calls = case when su.window_start < now() - interval '1 minute' then 1 else su.calls + 1 end,
        window_start = case when su.window_start < now() - interval '1 minute' then now() else su.window_start end
  returning calls into v_calls;
  if v_calls > 120 then
    return jsonb_build_object('people', '[]'::jsonb, 'teams', '[]'::jsonb, 'limited', true);
  end if;

  -- Typed % and _ are matched literally.
  v_like := replace(replace(replace(lower(v_q), '\', '\\'), '%', '\%'), '_', '\_');

  return jsonb_build_object(
    'people', coalesce((
      select jsonb_agg(to_jsonb(x) - 'rank' order by x.rank, x.name)
      from (
        select p.id, p.display_name as name, p.avatar_path, p.is_demo,
               coalesce(c.name, p.college_other) as college, b.name as branch, p.year_of_study as year,
               (select s.name from public.profile_skills ps join public.skills s on s.id = ps.skill_id
                 where ps.user_id = p.id and lower(s.name) like v_like || '%' order by s.name limit 1) as matched_skill,
               coalesce((select jsonb_agg(r.name order by r.sort_order)
                         from (select r2.name, r2.sort_order from public.profile_roles pr
                               join public.roles r2 on r2.id = pr.role_id where pr.user_id = p.id
                               order by r2.sort_order limit 2) r), '[]'::jsonb) as roles,
               case
                 when lower(p.display_name) like v_like || '%' then 0
                 when lower(p.display_name) like '% ' || v_like || '%' then 1
                 when lower(p.display_name) like '%' || v_like || '%' then 2
                 when exists (select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
                              where ps.user_id = p.id and lower(s.name) like v_like || '%') then 3
                 else 4
               end as rank
        from public.profiles p
        left join public.colleges c on c.id = p.college_id
        left join public.branches b on b.id = p.branch_id
        where p.onboarded_at is not null
          and p.status = 'active'
          and p.role = 'student'
          and p.id <> v_uid
          and (
            lower(p.display_name) like '%' || v_like || '%'
            or lower(coalesce(c.name, p.college_other, '')) like '%' || v_like || '%'
            or exists (select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
                       where ps.user_id = p.id and lower(s.name) like v_like || '%')
          )
        order by rank, p.display_name
        limit 6
      ) x
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.name)
      from (
        select tm.id, tm.name, tm.is_demo, h.name as hackathon,
               (select count(*) from public.team_members m where m.team_id = tm.id)::int as members
        from public.teams tm
        left join public.hackathons h on h.id = tm.hackathon_id
        where lower(tm.name) like '%' || v_like || '%'
        order by tm.name
        limit 3
      ) t
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.search_everything(text) from public, anon;
grant execute on function public.search_everything(text) to authenticated;
