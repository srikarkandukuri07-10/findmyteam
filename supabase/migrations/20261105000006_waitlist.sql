-- Pre-launch waitlist (D19). Anyone may join; nobody can read the list from the browser.
-- All access goes through the SECURITY DEFINER functions below.

create type public.waitlist_status as enum ('waiting', 'invited', 'joined');

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  college_id smallint references public.colleges (id),
  college_other text check (college_other is null or char_length(btrim(college_other)) between 2 and 120),
  branch_id smallint references public.branches (id),
  year_of_study smallint not null check (year_of_study between 1 and 5),
  role_ids smallint[] not null default '{}' check (cardinality(role_ids) <= 6),
  pain_point text check (pain_point is null or char_length(pain_point) <= 300),
  referral_code text not null unique check (referral_code ~ '^[a-z0-9]{8}$'),
  referred_by uuid references public.waitlist (id) on delete set null,
  source text check (source is null or source ~ '^[a-z0-9_-]{1,40}$'),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[a-f0-9]{64}$'),
  consent_version text not null,
  status public.waitlist_status not null default 'waiting',
  invited_at timestamptz,
  joined_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint waitlist_has_college check (college_id is not null or college_other is not null)
);

create unique index waitlist_email_key on public.waitlist (lower(email));
create index waitlist_referred_by_idx on public.waitlist (referred_by);
create index waitlist_ip_recent_idx on public.waitlist (ip_hash, created_at);
create index waitlist_created_idx on public.waitlist (created_at);

alter table public.waitlist enable row level security;
-- No policies: the table is invisible to anon and authenticated. Only the functions below touch it.
revoke all on public.waitlist from anon, authenticated;

-- Place in line. Each friend who joins with your link moves you up 10 places (shown on the success screen).
create or replace function public.waitlist_position(p_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(1,
    (select count(*)::int from public.waitlist w2 where w2.created_at <= w.created_at)
    - 10 * (select count(*)::int from public.waitlist r where r.referred_by = w.id))
  from public.waitlist w
  where w.id = p_id;
$$;
revoke all on function public.waitlist_position(uuid) from public, anon, authenticated;

-- What the form needs to offer: colleges, branches and roles. Safe, public reference data.
create or replace function public.waitlist_options()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'colleges', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name) from public.colleges c), '[]'::jsonb),
    'branches', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.sort_order) from public.branches b), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.sort_order) from public.roles r), '[]'::jsonb)
  );
$$;

-- Aggregate numbers only: the total and the colleges with the most students waiting. Never names or emails.
create or replace function public.waitlist_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.waitlist),
    'colleges', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'count', t.n) order by t.n desc, t.name)
      from (
        select c.name, count(*)::int as n
        from public.waitlist w join public.colleges c on c.id = w.college_id
        group by c.name
        order by n desc, c.name
        limit 6
      ) t), '[]'::jsonb)
  );
$$;

-- WAIT-1: join. Returns {status, code, position, referrals}; status is joined | already | limit | invalid.
-- A repeat email gets "already" and nothing else, so the form cannot be used to read someone's place or link.
create or replace function public.join_waitlist(
  p_email text,
  p_name text,
  p_college_id smallint,
  p_college_other text,
  p_branch_id smallint,
  p_year smallint,
  p_role_ids smallint[],
  p_pain_point text,
  p_ref text,
  p_source text,
  p_ip_hash text,
  p_consent_version text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_roles smallint[] := coalesce(p_role_ids, '{}');
  v_referrer uuid;
  v_code text;
  v_id uuid;
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  i int;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254
     or char_length(btrim(coalesce(p_name, ''))) not between 2 and 80
     or p_year is null or p_year not between 1 and 5
     or (p_college_id is null and char_length(btrim(coalesce(p_college_other, ''))) < 2)
     or (p_college_id is not null and not exists (select 1 from public.colleges where id = p_college_id))
     or (p_branch_id is not null and not exists (select 1 from public.branches where id = p_branch_id))
     or cardinality(v_roles) > 6
     or exists (select 1 from unnest(v_roles) r where not exists (select 1 from public.roles where id = r))
     or char_length(coalesce(p_pain_point, '')) > 300
     or coalesce(p_consent_version, '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;

  if exists (select 1 from public.waitlist where lower(email) = v_email) then
    return jsonb_build_object('status', 'already');
  end if;

  -- At most 5 sign-ups an hour from one network.
  if p_ip_hash is not null and (
    select count(*) from public.waitlist where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 5 then
    return jsonb_build_object('status', 'limit');
  end if;

  if p_ref is not null then
    select id into v_referrer from public.waitlist where referral_code = lower(p_ref);
  end if;

  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % char_length(v_alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  begin
    insert into public.waitlist (
      email, name, college_id, college_other, branch_id, year_of_study, role_ids, pain_point,
      referral_code, referred_by, source, ip_hash, consent_version
    ) values (
      v_email, btrim(p_name), p_college_id,
      case when p_college_id is null then btrim(p_college_other) end,
      p_branch_id, p_year, v_roles, nullif(btrim(coalesce(p_pain_point, '')), ''),
      v_code, v_referrer,
      case when p_source ~ '^[a-z0-9_-]{1,40}$' then p_source end,
      case when p_ip_hash ~ '^[a-f0-9]{64}$' then p_ip_hash end,
      p_consent_version
    )
    returning id into v_id;
  exception when unique_violation then
    -- Two submissions of the same email at once.
    return jsonb_build_object('status', 'already');
  end;

  return jsonb_build_object(
    'status', 'joined',
    'code', v_code,
    'position', public.waitlist_position(v_id),
    'referrals', 0
  );
end;
$$;

-- The success screen, reopened from the person's own link. The code is the only key; it returns no personal data.
create or replace function public.waitlist_standing(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', w.referral_code,
    'position', public.waitlist_position(w.id),
    'referrals', (select count(*) from public.waitlist r where r.referred_by = w.id)
  )
  from public.waitlist w
  where w.referral_code = lower(p_code);
$$;

revoke all on function public.waitlist_options() from public;
revoke all on function public.waitlist_stats() from public;
revoke all on function public.join_waitlist(text, text, smallint, text, smallint, smallint, smallint[], text, text, text, text, text) from public;
revoke all on function public.waitlist_standing(text) from public;
grant execute on function public.waitlist_options() to anon, authenticated;
grant execute on function public.waitlist_stats() to anon, authenticated;
grant execute on function public.join_waitlist(text, text, smallint, text, smallint, smallint, smallint[], text, text, text, text, text) to anon, authenticated;
grant execute on function public.waitlist_standing(text) to anon, authenticated;

-- For the founders in the Supabase dashboard (SQL editor / table view); not exposed to the API.
create view public.waitlist_daily with (security_invoker = true) as
  select date_trunc('day', created_at at time zone 'Asia/Kolkata')::date as day, count(*) as signups
  from public.waitlist group by 1 order by 1 desc;
create view public.waitlist_by_college with (security_invoker = true) as
  select coalesce(c.name, w.college_other) as college, count(*) as signups
  from public.waitlist w left join public.colleges c on c.id = w.college_id
  group by 1 order by 2 desc;
create view public.waitlist_top_referrers with (security_invoker = true) as
  select w.name, w.email, coalesce(c.name, w.college_other) as college, count(r.id) as referrals
  from public.waitlist w
  left join public.colleges c on c.id = w.college_id
  join public.waitlist r on r.referred_by = w.id
  group by w.id, w.name, w.email, c.name, w.college_other
  order by referrals desc;
revoke all on public.waitlist_daily, public.waitlist_by_college, public.waitlist_top_referrers from anon, authenticated;
