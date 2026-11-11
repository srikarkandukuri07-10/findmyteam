-- D26: three-card onboarding, all-India colleges, a private phone number, past hackathons and a
-- bigger Scout boost for complete profiles.
--   Card 1  save_onboarding_details   name, phone, college, studies, consent      (details_saved_at)
--   Card 2  complete_onboarding_profile  skills, interests, roles, bio (required) (onboarded_at)
--   Card 3  set_linkedin_url, connect_github, add_past_hackathon  (all optional)

-- ---------------------------------------------------------------------------------------------
-- 1. Colleges and universities across India (AISHE). The table grows past smallint ids.
-- ---------------------------------------------------------------------------------------------
-- Two waitlist reports read colleges.id; they are recreated unchanged after the type change.
drop view public.waitlist_by_college;
drop view public.waitlist_top_referrers;
alter table public.profiles drop constraint profiles_college_id_fkey;
alter table public.waitlist drop constraint waitlist_college_id_fkey;
alter table public.colleges alter column id type integer;
alter sequence public.colleges_id_seq as integer maxvalue 2147483647;
alter table public.profiles alter column college_id type integer;
alter table public.waitlist alter column college_id type integer;
alter table public.profiles add constraint profiles_college_id_fkey foreign key (college_id) references public.colleges (id);
alter table public.waitlist add constraint waitlist_college_id_fkey foreign key (college_id) references public.colleges (id);
create view public.waitlist_by_college with (security_invoker = true) as
  select coalesce(c.name, w.college_other) as college, count(*) as signups
  from public.waitlist w left join public.colleges c on c.id = w.college_id
  group by coalesce(c.name, w.college_other)
  order by count(*) desc;
create view public.waitlist_top_referrers with (security_invoker = true) as
  select w.name, w.email, coalesce(c.name, w.college_other) as college, count(r.id) as referrals
  from public.waitlist w
  left join public.colleges c on c.id = w.college_id
  join public.waitlist r on r.referred_by = w.id
  group by w.id, w.name, w.email, c.name, w.college_other
  order by count(r.id) desc;
revoke all on public.waitlist_by_college, public.waitlist_top_referrers from anon, authenticated;

alter table public.colleges
  add column kind text not null default 'college' check (kind in ('college', 'university', 'standalone')),
  add column aishe_code text unique,
  add column state text,
  add column district text,
  add column university text,
  add column source text not null default 'seed' check (source in ('seed', 'aishe', 'student')),
  add column status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  add column added_by uuid references public.profiles (id) on delete set null,
  add column featured boolean not null default false,
  add column created_at timestamptz not null default now();
alter table public.colleges alter column city drop not null;
alter table public.colleges alter column city drop default;
alter table public.colleges drop constraint colleges_name_key;
-- The 25 Hyderabad colleges keep showing on the waitlist form.
update public.colleges set featured = true, state = 'Telangana', district = 'Hyderabad' where source = 'seed';
create unique index colleges_name_place on public.colleges (lower(name), coalesce(lower(district), ''), coalesce(lower(state), ''));
create index colleges_name_trgm on public.colleges using gin (lower(name) extensions.gin_trgm_ops);

drop policy "Signed-in users can read colleges" on public.colleges;
create policy "Signed-in users read approved colleges and their own additions" on public.colleges
  for select to authenticated
  using (status = 'approved' or added_by = (select auth.uid()) or (select public.is_admin()));

create or replace function public.waitlist_options()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'colleges', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name) from public.colleges c where c.featured), '[]'::jsonb),
    'branches', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.sort_order) from public.branches b), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.sort_order) from public.roles r), '[]'::jsonb)
  );
$$;

-- Suggestions while typing: names that start with the text first, then close matches.
create function public.search_colleges(p_query text)
returns table (id integer, name text, place text, kind text, pending boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select lower(btrim(coalesce(p_query, ''))) as t)
  select c.id, c.name,
         nullif(concat_ws(', ', nullif(c.district, ''), nullif(c.state, '')), ''),
         c.kind, c.status = 'pending'
  from public.colleges c, q
  where auth.uid() is not null
    and char_length(q.t) >= 2
    and (c.status = 'approved' or c.added_by = auth.uid())
    and (lower(c.name) like '%' || replace(replace(q.t, '%', ''), '_', '') || '%'
         or extensions.similarity(lower(c.name), q.t) > 0.3)
  order by (lower(c.name) like replace(replace(q.t, '%', ''), '_', '') || '%') desc,
           (lower(c.name) like '%' || replace(replace(q.t, '%', ''), '_', '') || '%') desc,
           extensions.similarity(lower(c.name), q.t) desc,
           c.featured desc, c.name
  limit 8;
$$;

-- "Can't find your college?" A student adds it; it is theirs to use at once and waits for an admin.
create function public.add_college(p_name text, p_state text, p_district text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_id integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(v_name) < 5 or char_length(v_name) > 160 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_state, ''))) < 2 or char_length(p_state) > 60 then
    raise exception 'invalid_state' using errcode = '22023';
  end if;
  if (select count(*) from public.colleges where added_by = v_uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  select id into v_id from public.colleges
  where lower(name) = lower(v_name) and coalesce(lower(state), '') = lower(btrim(p_state)) and status <> 'rejected'
  limit 1;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.colleges (name, state, district, source, status, added_by)
  values (v_name, btrim(p_state), nullif(btrim(coalesce(p_district, '')), ''), 'student', 'pending', v_uid)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_list_pending_colleges()
returns table (id integer, name text, state text, district text, students integer, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
  select c.id, c.name, c.state, c.district,
         (select count(*)::integer from public.profiles p where p.college_id = c.id), c.created_at
  from public.colleges c where c.status = 'pending' order by c.created_at;
end;
$$;

create function public.admin_set_college_status(p_id integer, p_approved boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update public.colleges set status = case when p_approved then 'approved' else 'rejected' end
  where id = p_id and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. The phone number: private to its owner, never returned to anyone else.
-- ---------------------------------------------------------------------------------------------
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text not null unique check (phone ~ '^\+91[6-9][0-9]{9}$'),
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;
revoke all on public.profile_private from anon, authenticated;
grant select on public.profile_private to authenticated;
create policy "Students read only their own private details" on public.profile_private
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 3. Profile fields for the new cards.
-- ---------------------------------------------------------------------------------------------
alter table public.profiles
  add column details_saved_at timestamptz,
  add column interests text[] not null default '{}'
    check (cardinality(interests) <= 8 and interests <@ array[
      'ai-ml', 'web3', 'fintech', 'healthtech', 'edtech', 'climate', 'gaming', 'social-impact',
      'hardware-iot', 'cybersecurity', 'open-source', 'design', 'mobility', 'agritech', 'space', 'robotics'
    ]::text[]);
-- Everyone already onboarded has given their details.
update public.profiles set details_saved_at = onboarded_at where onboarded_at is not null;

-- Card 1. Can be saved again until onboarding is finished.
create function public.save_onboarding_details(
  p_display_name text,
  p_phone text,
  p_college_id integer,
  p_degree public.degree,
  p_branch_id smallint,
  p_year_of_study smallint,
  p_graduation_year smallint,
  p_birth_year smallint,
  p_consent_version text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s-]', '', 'g');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and onboarded_at is not null) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;
  if coalesce(btrim(p_consent_version), '') = '' then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if v_phone ~ '^[6-9][0-9]{9}$' then v_phone := '+91' || v_phone; end if;
  if v_phone ~ '^91[6-9][0-9]{9}$' then v_phone := '+' || v_phone; end if;
  if v_phone !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if exists (select 1 from public.profile_private where phone = v_phone and user_id <> v_uid) then
    raise exception 'phone_in_use' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.colleges c
    where c.id = p_college_id and (c.status = 'approved' or (c.status = 'pending' and c.added_by = v_uid))
  ) then
    raise exception 'invalid_college' using errcode = '22023';
  end if;

  insert into public.profile_private (user_id, phone) values (v_uid, v_phone)
  on conflict (user_id) do update set phone = excluded.phone, updated_at = now();

  update public.profiles
  set display_name     = btrim(p_display_name),
      college_id       = p_college_id,
      college_other    = null,
      degree           = p_degree,
      branch_id        = p_branch_id,
      year_of_study    = p_year_of_study,
      graduation_year  = p_graduation_year,
      birth_year       = p_birth_year,
      consent_version  = p_consent_version,
      consented_at     = now(),
      details_saved_at = now()
  where id = v_uid;
end;
$$;

-- Card 2. Bio and at least three skills are required; finishing it finishes onboarding.
create function public.complete_onboarding_profile(
  p_bio text,
  p_skills jsonb,
  p_role_ids smallint[],
  p_interests text[]
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and details_saved_at is not null and status = 'active') then
    raise exception 'details_required' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_bio, ''))) < 40 then
    raise exception 'bio_too_short' using errcode = '22023';
  end if;
  if jsonb_typeof(p_skills) is distinct from 'array' or jsonb_array_length(p_skills) < 3 then
    raise exception 'too_few_skills' using errcode = '22023';
  end if;
  if jsonb_array_length(p_skills) > 15 then
    raise exception 'too_many_skills' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_role_ids, 1), 0) > 3 then
    raise exception 'too_many_roles' using errcode = 'P0001';
  end if;

  update public.profiles
  set bio = btrim(p_bio),
      interests = coalesce((select array_agg(distinct i) from unnest(coalesce(p_interests, '{}'::text[])) i), '{}'),
      onboarded_at = coalesce(onboarded_at, now())
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

-- The old one-step onboarding is replaced by the two functions above.
drop function public.complete_onboarding(text, public.degree, smallint, text, smallint, smallint, smallint, smallint, text);

-- The college-email badge can be earned on Card 1, before onboarding is finished.
create or replace function public.require_account()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and status = 'active') then
    raise exception 'account_inactive' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;
revoke execute on function public.require_account() from public, anon, authenticated;

-- Same bodies as D25, with require_account() in place of require_onboarded().
do $$
declare
  f regprocedure;
begin
  foreach f in array array[
    'public.start_college_verification(text)'::regprocedure,
    'public.confirm_college_verification(text)'::regprocedure,
    'public.remove_college_verification()'::regprocedure
  ] loop
    execute replace(pg_get_functiondef(f), 'public.require_onboarded()', 'public.require_account()');
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 4. Past hackathons (Card 3, and later the profile).
-- ---------------------------------------------------------------------------------------------
create type public.hackathon_result as enum ('participated', 'finalist', 'winner');

create table public.past_hackathons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  year smallint not null check (year between 2010 and 2100),
  result public.hackathon_result not null,
  idea text check (char_length(idea) <= 400),
  live_url text check (live_url ~* '^https://[^\s]{4,300}$'),
  demo_url text check (demo_url ~* '^https://[^\s]{4,300}$'),
  created_at timestamptz not null default now()
);
create index past_hackathons_user on public.past_hackathons (user_id, year desc);
alter table public.past_hackathons enable row level security;
revoke all on public.past_hackathons from anon, authenticated;
grant select on public.past_hackathons to authenticated;
create policy "Students read their own past hackathons" on public.past_hackathons
  for select to authenticated using (user_id = (select auth.uid()));

create function public.add_past_hackathon(
  p_name text, p_year smallint, p_result public.hackathon_result, p_idea text, p_live_url text, p_demo_url text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_account();
  v_id uuid;
begin
  if (select count(*) from public.past_hackathons where user_id = v_uid) >= 12 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;
  if p_year > extract(year from now())::int then
    raise exception 'future_year' using errcode = '22023';
  end if;
  insert into public.past_hackathons (user_id, name, year, result, idea, live_url, demo_url)
  values (v_uid, btrim(p_name), p_year, p_result,
          nullif(btrim(coalesce(p_idea, '')), ''), nullif(btrim(coalesce(p_live_url, '')), ''), nullif(btrim(coalesce(p_demo_url, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.delete_past_hackathon(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_account();
begin
  delete from public.past_hackathons where id = p_id and user_id = v_uid;
end;
$$;

-- Anyone signed in and onboarded can see a student's past hackathons, unless one blocked the other.
create function public.list_past_hackathons(p_user uuid)
returns table (id uuid, name text, year smallint, result public.hackathon_result, idea text, live_url text, demo_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_account();
begin
  if p_user <> v_uid and (
    public.is_blocked_pair(v_uid, p_user)
    or not exists (select 1 from public.profiles where id = p_user and onboarded_at is not null and status = 'active')
  ) then
    return;
  end if;
  return query
  select h.id, h.name, h.year, h.result, h.idea, h.live_url, h.demo_url
  from public.past_hackathons h
  where h.user_id = p_user
  order by h.year desc, h.created_at desc;
end;
$$;

-- The owner's onboarding state for the cards.
create function public.my_onboarding()
returns table (
  email text, display_name text, phone text, college_id integer, college_name text, college_place text,
  degree public.degree, branch_id smallint, year_of_study smallint, graduation_year smallint, birth_year smallint,
  details_saved boolean, onboarded boolean, interests text[], linkedin_url text, github_connected boolean,
  college_verified boolean, past_hackathons integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text, p.display_name, pp.phone, p.college_id, c.name,
         nullif(concat_ws(', ', nullif(c.district, ''), nullif(c.state, '')), ''),
         p.degree, p.branch_id, p.year_of_study, p.graduation_year, p.birth_year,
         p.details_saved_at is not null, p.onboarded_at is not null, p.interests, p.linkedin_url,
         p.github_id is not null, p.college_verified_at is not null,
         (select count(*)::integer from public.past_hackathons h where h.user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profile_private pp on pp.user_id = p.id
  left join public.colleges c on c.id = p.college_id
  where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------------------------------
-- 5. Scout: complete profiles rise. Verified badge, GitHub, LinkedIn and past hackathons (wins most)
--    add to the score; the random term keeps everyone appearing.
-- ---------------------------------------------------------------------------------------------
create or replace function public.discover_people(p_limit integer default 20)
returns table(id uuid, display_name text, bio text, degree public.degree, college_name text, branch_name text, year_of_study smallint, graduation_year smallint, skills jsonb, roles jsonb, github jsonb, github_verified boolean, is_demo boolean, reason text, avatar_path text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := public.require_onboarded();
  v_my_college integer;
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
           p.github_id as cgithub_id, p.is_demo as cdemo, p.avatar_path as cavatar,
           p.college_verified_at as cverified, cardinality(p.interests) as cinterests,
           (select count(*) from public.profile_skills x where x.user_id = p.id) as cskill_count,
           (select count(*) from public.profile_roles x where x.user_id = p.id) as crole_count,
           (select g.contributions_total from public.github_snapshots g where g.user_id = p.id) as ccontribs,
           (select count(*) from public.past_hackathons h where h.user_id = p.id) as cpast,
           (select max(case h.result when 'winner' then 2 when 'finalist' then 1 else 0 end)
            from public.past_hackathons h where h.user_id = p.id) as cbest
    from public.profiles p
    left join public.colleges c on c.id = p.college_id
    left join public.branches b on b.id = p.branch_id
    where p.id <> v_uid
      and p.onboarded_at is not null
      and p.status = 'active'
      and p.role = 'student'
      and not public.is_blocked_pair(v_uid, p.id)
      and not exists (
        select 1 from public.swipes s
        where s.actor_id = v_uid and s.target_id = p.id
          and (s.action = 'connect' or s.created_at > now() - interval '7 days'))
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
           + (case when s.cgithub_id is not null then 1.0 else 0 end)
           + (case when coalesce(s.ccontribs, 0) >= 200 then 0.5 else 0 end)
           + (case when s.clinkedin is not null then 0.6 else 0 end)
           + (case when s.cverified is not null then 0.8 else 0 end)
           + least(s.cpast, 2) * 0.35
           + (case coalesce(s.cbest, -1) when 2 then 0.7 when 1 then 0.4 else 0 end)
           + (case when char_length(coalesce(s.cbio, '')) >= 40 then 0.5 else 0 end)
           + (case when s.cskill_count >= 3 then 0.5 else 0 end)
           + (case when s.crole_count >= 1 then 0.3 else 0 end)
           + (case when s.cinterests >= 1 then 0.2 else 0 end)
           + (case when s.cavatar is not null then 0.3 else 0 end)
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
              when k.cbest = 2 then 'Has won a hackathon'
              when k.ccollege_id is distinct from v_my_college and k.ccollege is not null then 'From ' || k.ccollege
              else 'Looking for a team' end,
         k.cavatar
  from ranked k
  order by k.score desc
  limit least(greatest(p_limit, 1), 50);
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------------
revoke all on function
  public.search_colleges(text), public.add_college(text, text, text),
  public.admin_list_pending_colleges(), public.admin_set_college_status(integer, boolean),
  public.save_onboarding_details(text, text, integer, public.degree, smallint, smallint, smallint, smallint, text),
  public.complete_onboarding_profile(text, jsonb, smallint[], text[]),
  public.start_college_verification(text), public.confirm_college_verification(text), public.remove_college_verification(),
  public.add_past_hackathon(text, smallint, public.hackathon_result, text, text, text),
  public.delete_past_hackathon(uuid), public.list_past_hackathons(uuid), public.my_onboarding()
from public, anon;
grant execute on function
  public.search_colleges(text), public.add_college(text, text, text),
  public.admin_list_pending_colleges(), public.admin_set_college_status(integer, boolean),
  public.save_onboarding_details(text, text, integer, public.degree, smallint, smallint, smallint, smallint, text),
  public.complete_onboarding_profile(text, jsonb, smallint[], text[]),
  public.start_college_verification(text), public.confirm_college_verification(text), public.remove_college_verification(),
  public.add_past_hackathon(text, smallint, public.hackathon_result, text, text, text),
  public.delete_past_hackathon(uuid), public.list_past_hackathons(uuid), public.my_onboarding()
to authenticated;
