-- Module 1: auth and onboarding (PRD AUTH-1, AUTH-2, AUTH-7; DECISIONS D2-D4, D6)

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.colleges (
  id smallint generated always as identity primary key,
  name text not null unique,
  city text not null default 'Hyderabad',
  email_domain text -- used later for the "college verified" badge
);

create table public.branches (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null unique,
  sort_order smallint not null default 0
);

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, created by trigger. Module 3 extends it.
-- ---------------------------------------------------------------------------

create type public.account_status as enum ('active', 'suspended', 'banned');
create type public.degree as enum ('btech', 'be');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 2 and 60),
  degree public.degree,
  college_id smallint references public.colleges (id),
  college_other text check (char_length(college_other) between 3 and 120),
  branch_id smallint references public.branches (id),
  year_of_study smallint check (year_of_study between 1 and 5),
  graduation_year smallint check (graduation_year between 2024 and 2040),
  birth_year smallint check (birth_year between 1990 and 2015),
  consent_version text,
  consented_at timestamptz,
  onboarded_at timestamptz,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- exactly one of college_id / college_other once onboarded
  constraint profiles_college_given check (
    onboarded_at is null or ((college_id is not null) <> (college_other is not null))
  ),
  constraint profiles_onboarding_complete check (
    onboarded_at is null or (
      display_name is not null and degree is not null and branch_id is not null
      and year_of_study is not null and graduation_year is not null
      and birth_year is not null and consent_version is not null and consented_at is not null
    )
  )
);

create index profiles_college_id_idx on public.profiles (college_id);
create index profiles_branch_id_idx on public.profiles (branch_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (DECISIONS D5)
-- ---------------------------------------------------------------------------

alter table public.colleges enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;

create policy "Signed-in users can read colleges"
on public.colleges for select to authenticated using (true);

create policy "Signed-in users can read branches"
on public.branches for select to authenticated using (true);

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

-- No insert/update/delete policies: users change their profile only through
-- functions below. Revoke table writes as a second line of defence.
revoke insert, update, delete, truncate on public.colleges, public.branches, public.profiles from anon, authenticated;
revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- Onboarding (AUTH-7): one call validates and sets every field.
-- ---------------------------------------------------------------------------

create function public.complete_onboarding(
  p_display_name text,
  p_degree public.degree,
  p_college_id smallint,
  p_college_other text,
  p_branch_id smallint,
  p_year_of_study smallint,
  p_graduation_year smallint,
  p_birth_year smallint,
  p_consent_version text
)
returns void
language plpgsql
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
    select 1 from auth.users where id = v_uid and email_confirmed_at is not null
  ) then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.profiles where id = v_uid and onboarded_at is not null
  ) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_consent_version), '') = '' then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  update public.profiles
  set display_name    = trim(p_display_name),
      degree          = p_degree,
      college_id      = p_college_id,
      college_other   = nullif(trim(p_college_other), ''),
      branch_id       = p_branch_id,
      year_of_study   = p_year_of_study,
      graduation_year = p_graduation_year,
      birth_year      = p_birth_year,
      consent_version = p_consent_version,
      consented_at    = now(),
      onboarded_at    = now()
  where id = v_uid;
end;
$$;

revoke execute on function public.complete_onboarding from public, anon;
grant execute on function public.complete_onboarding to authenticated;

revoke execute on function public.handle_new_user from public, anon, authenticated;
revoke execute on function public.set_updated_at from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

insert into public.branches (slug, name, sort_order) values
  ('cse', 'Computer Science and Engineering', 1),
  ('cse-aiml', 'CSE (Artificial Intelligence and Machine Learning)', 2),
  ('cse-ds', 'CSE (Data Science)', 3),
  ('cse-cyber', 'CSE (Cyber Security)', 4),
  ('ai-ds', 'Artificial Intelligence and Data Science', 5),
  ('it', 'Information Technology', 6),
  ('ece', 'Electronics and Communication Engineering', 7),
  ('eee', 'Electrical and Electronics Engineering', 8),
  ('mech', 'Mechanical Engineering', 9),
  ('civil', 'Civil Engineering', 10),
  ('chem', 'Chemical Engineering', 11),
  ('aero', 'Aeronautical Engineering', 12),
  ('biotech', 'Biotechnology', 13),
  ('other', 'Other', 99);

insert into public.colleges (name, city) values
  ('Anurag University', 'Hyderabad'),
  ('BVRIT Hyderabad College of Engineering for Women', 'Hyderabad'),
  ('Chaitanya Bharathi Institute of Technology (CBIT)', 'Hyderabad'),
  ('CMR College of Engineering and Technology', 'Hyderabad'),
  ('CVR College of Engineering', 'Hyderabad'),
  ('G. Narayanamma Institute of Technology and Science (GNITS)', 'Hyderabad'),
  ('Geethanjali College of Engineering and Technology', 'Hyderabad'),
  ('Gokaraju Rangaraju Institute of Engineering and Technology (GRIET)', 'Hyderabad'),
  ('IIIT Hyderabad', 'Hyderabad'),
  ('IIT Hyderabad', 'Sangareddy'),
  ('Institute of Aeronautical Engineering (IARE)', 'Hyderabad'),
  ('JNTUH University College of Engineering, Science and Technology', 'Hyderabad'),
  ('Keshav Memorial Institute of Technology (KMIT)', 'Hyderabad'),
  ('Mahatma Gandhi Institute of Technology (MGIT)', 'Hyderabad'),
  ('Mahindra University', 'Hyderabad'),
  ('Malla Reddy Engineering College', 'Hyderabad'),
  ('Matrusri Engineering College', 'Hyderabad'),
  ('Methodist College of Engineering and Technology', 'Hyderabad'),
  ('MLR Institute of Technology', 'Hyderabad'),
  ('Muffakham Jah College of Engineering and Technology (MJCET)', 'Hyderabad'),
  ('Osmania University College of Engineering', 'Hyderabad'),
  ('Sreenidhi Institute of Science and Technology (SNIST)', 'Hyderabad'),
  ('Vardhaman College of Engineering', 'Hyderabad'),
  ('Vasavi College of Engineering', 'Hyderabad'),
  ('VNR Vignana Jyothi Institute of Engineering and Technology', 'Hyderabad');
