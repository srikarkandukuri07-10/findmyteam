-- Module 2: hackathons catalogue (PRD HACK-1, HACK-2, HACK-3)

create extension if not exists pg_trgm with schema extensions;

create type public.hackathon_mode as enum ('online', 'in_person', 'hybrid');
create type public.hackathon_status as enum ('active', 'merged', 'removed');

create table public.hackathons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  organizer text check (char_length(organizer) between 2 and 120),
  mode public.hackathon_mode not null default 'in_person',
  city text check (char_length(city) between 2 and 80),
  starts_on date not null,
  ends_on date not null,
  url text check (url ~* '^https?://[^\s]+$' and char_length(url) <= 300),
  status public.hackathon_status not null default 'active',
  merged_into uuid references public.hackathons (id),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hackathons_dates_ordered check (ends_on >= starts_on),
  constraint hackathons_dates_sane check (starts_on between date '2015-01-01' and date '2035-12-31'),
  constraint hackathons_merge_target check ((status = 'merged') = (merged_into is not null))
);

create index hackathons_starts_on_idx on public.hackathons (starts_on) where status = 'active';
create index hackathons_name_trgm_idx on public.hackathons using gin (name extensions.gin_trgm_ops);
create index hackathons_created_by_idx on public.hackathons (created_by, created_at);
create index hackathons_merged_into_idx on public.hackathons (merged_into);

create trigger hackathons_set_updated_at
before update on public.hackathons
for each row execute function public.set_updated_at();

create table public.hackathon_interest (
  user_id uuid not null references auth.users (id) on delete cascade,
  hackathon_id uuid not null references public.hackathons (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hackathon_id)
);

create index hackathon_interest_hackathon_idx on public.hackathon_interest (hackathon_id);

alter table public.hackathons enable row level security;
alter table public.hackathon_interest enable row level security;

create policy "Signed-in users can read active hackathons"
on public.hackathons for select to authenticated
using (status = 'active');

-- Interest rows are private: you only ever see your own. Counts come from list_hackathons().
create policy "Users can read their own interest"
on public.hackathon_interest for select to authenticated
using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.hackathons, public.hackathon_interest from anon, authenticated;
revoke all on public.hackathons, public.hackathon_interest from anon;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Caller must be signed in and have finished onboarding.
create function public.require_onboarded()
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
  if not exists (
    select 1 from public.profiles
    where id = v_uid and onboarded_at is not null and status = 'active'
  ) then
    raise exception 'onboarding_required' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

revoke execute on function public.require_onboarded from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Browse and search (HACK-1). Returns interest counts, which users cannot read directly.
-- ---------------------------------------------------------------------------

create function public.list_hackathons(
  p_query text default null,
  p_include_past boolean default false,
  p_limit integer default 50
)
returns table (
  id uuid,
  name text,
  organizer text,
  mode public.hackathon_mode,
  city text,
  starts_on date,
  ends_on date,
  url text,
  interest_count bigint,
  is_interested boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_q text := nullif(trim(coalesce(p_query, '')), '');
begin
  return query
  select h.id, h.name, h.organizer, h.mode, h.city, h.starts_on, h.ends_on, h.url,
         (select count(*) from public.hackathon_interest i where i.hackathon_id = h.id) as interest_count,
         exists (select 1 from public.hackathon_interest i where i.hackathon_id = h.id and i.user_id = v_uid) as is_interested
  from public.hackathons h
  where h.status = 'active'
    and (p_include_past or h.ends_on >= current_date)
    and (v_q is null
         or h.name ilike '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
         or h.organizer ilike '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
         or extensions.similarity(h.name, v_q) > 0.3)
  order by
    case when h.ends_on >= current_date then 0 else 1 end,
    case when h.ends_on >= current_date then h.starts_on end asc,
    h.starts_on desc
  limit least(greatest(p_limit, 1), 100);
end;
$$;

create function public.get_hackathon(p_id uuid)
returns table (
  id uuid,
  name text,
  organizer text,
  mode public.hackathon_mode,
  city text,
  starts_on date,
  ends_on date,
  url text,
  interest_count bigint,
  is_interested boolean
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
  select h.id, h.name, h.organizer, h.mode, h.city, h.starts_on, h.ends_on, h.url,
         (select count(*) from public.hackathon_interest i where i.hackathon_id = h.id),
         exists (select 1 from public.hackathon_interest i where i.hackathon_id = h.id and i.user_id = v_uid)
  from public.hackathons h
  where h.id = p_id and h.status = 'active';
end;
$$;

-- Duplicate warning shown before someone adds a hackathon (HACK-2).
create function public.similar_hackathons(p_name text)
returns table (id uuid, name text, starts_on date, similarity real)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_onboarded();
  return query
  select h.id, h.name, h.starts_on, extensions.similarity(h.name, p_name)
  from public.hackathons h
  where h.status = 'active' and extensions.similarity(h.name, p_name) > 0.4
  order by 4 desc
  limit 5;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create (HACK-2). Limited to 5 new hackathons per user per day.
-- ---------------------------------------------------------------------------

create function public.create_hackathon(
  p_name text,
  p_organizer text,
  p_mode public.hackathon_mode,
  p_city text,
  p_starts_on date,
  p_ends_on date,
  p_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_id uuid;
begin
  if (select count(*) from public.hackathons
      where created_by = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.hackathons
    where status = 'active' and lower(name) = lower(trim(p_name)) and starts_on = p_starts_on
  ) then
    raise exception 'duplicate_hackathon' using errcode = 'P0001';
  end if;

  insert into public.hackathons (name, organizer, mode, city, starts_on, ends_on, url, created_by)
  values (trim(p_name), nullif(trim(p_organizer), ''), p_mode, nullif(trim(p_city), ''),
          p_starts_on, p_ends_on, nullif(trim(p_url), ''), v_uid)
  returning id into v_id;

  -- The creator is presumably interested.
  insert into public.hackathon_interest (user_id, hackathon_id) values (v_uid, v_id);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Interest (HACK-3)
-- ---------------------------------------------------------------------------

create function public.set_hackathon_interest(p_hackathon_id uuid, p_interested boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if not exists (select 1 from public.hackathons where id = p_hackathon_id and status = 'active') then
    raise exception 'hackathon_not_found' using errcode = 'P0001';
  end if;

  if p_interested then
    insert into public.hackathon_interest (user_id, hackathon_id)
    values (v_uid, p_hackathon_id)
    on conflict do nothing;
  else
    delete from public.hackathon_interest
    where user_id = v_uid and hackathon_id = p_hackathon_id;
  end if;
end;
$$;

-- The signed-in user's own interest count, for the home dashboard.
create function public.my_hackathon_interest_count()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return (select count(*)
          from public.hackathon_interest i
          join public.hackathons h on h.id = i.hackathon_id
          where i.user_id = v_uid and h.status = 'active' and h.ends_on >= current_date);
end;
$$;

revoke execute on function
  public.list_hackathons, public.get_hackathon, public.similar_hackathons,
  public.create_hackathon, public.set_hackathon_interest, public.my_hackathon_interest_count
from public, anon;
grant execute on function
  public.list_hackathons, public.get_hackathon, public.similar_hackathons,
  public.create_hackathon, public.set_hackathon_interest, public.my_hackathon_interest_count
to authenticated;

-- No seed rows: dates and links for real events must come from the founder or users,
-- not from guesses. Add launch-cycle hackathons through the app once verified.
