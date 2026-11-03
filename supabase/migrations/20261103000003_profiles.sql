-- Module 3a: profile fields, skills and roles (PRD PROF-1, PROF-2, PROF-8)
-- Additive only: existing profile rows are not rewritten.

create type public.skill_category as enum ('technical', 'non_technical');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced');

create table public.skills (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null unique,
  category public.skill_category not null,
  sort_order smallint not null default 0
);

create table public.roles (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null unique,
  sort_order smallint not null default 0
);

alter table public.profiles
  add column bio text check (char_length(bio) <= 500),
  add column github_username text
    check (github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$'),
  add column linkedin_url text
    check (linkedin_url ~* '^https://([a-z]{2,3}\.)?linkedin\.com/in/[^\s/?#]{3,100}/?$');

create table public.profile_skills (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id smallint not null references public.skills (id),
  level public.skill_level not null default 'intermediate',
  primary key (user_id, skill_id)
);

create table public.profile_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id smallint not null references public.roles (id),
  primary key (user_id, role_id)
);

create index profile_skills_skill_idx on public.profile_skills (skill_id);
create index profile_roles_role_idx on public.profile_roles (role_id);

alter table public.skills enable row level security;
alter table public.roles enable row level security;
alter table public.profile_skills enable row level security;
alter table public.profile_roles enable row level security;

create policy "Signed-in users can read skills"
on public.skills for select to authenticated using (true);

create policy "Signed-in users can read roles"
on public.roles for select to authenticated using (true);

-- Own rows only. Other students' skills and roles come from get_profile().
create policy "Users can read their own skills"
on public.profile_skills for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can read their own roles"
on public.profile_roles for select to authenticated
using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on
  public.skills, public.roles, public.profile_skills, public.profile_roles
from anon, authenticated;
revoke all on public.skills, public.roles, public.profile_skills, public.profile_roles from anon;

-- ---------------------------------------------------------------------------
-- Save my profile: every change in one transaction.
-- ---------------------------------------------------------------------------

create function public.save_profile(
  p_display_name text,
  p_bio text,
  p_github_username text,
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
      github_username = nullif(trim(p_github_username), ''),
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
-- Read a student's profile: safe fields only (never birth year, consent or status).
-- ---------------------------------------------------------------------------

create function public.get_profile(p_id uuid)
returns table (
  id uuid,
  display_name text,
  bio text,
  github_username text,
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
  select p.id, p.display_name, p.bio, p.github_username, p.linkedin_url, p.degree,
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

revoke execute on function public.save_profile, public.get_profile from public, anon;
grant execute on function public.save_profile, public.get_profile to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: fixed vocabularies (not facts about real people or events).
-- ---------------------------------------------------------------------------

insert into public.roles (slug, name, sort_order) values
  ('frontend', 'Frontend developer', 1),
  ('backend', 'Backend developer', 2),
  ('fullstack', 'Full-stack developer', 3),
  ('mobile', 'Mobile developer', 4),
  ('ml-ai', 'ML / AI engineer', 5),
  ('data', 'Data scientist / analyst', 6),
  ('devops', 'DevOps / cloud engineer', 7),
  ('security', 'Cybersecurity', 8),
  ('embedded', 'Embedded / IoT / hardware', 9),
  ('design', 'UI/UX designer', 10),
  ('product', 'Product / business', 11),
  ('pitch', 'Pitch and presentation lead', 12);

insert into public.skills (slug, name, category, sort_order) values
  ('python', 'Python', 'technical', 1),
  ('javascript', 'JavaScript', 'technical', 2),
  ('typescript', 'TypeScript', 'technical', 3),
  ('java', 'Java', 'technical', 4),
  ('c', 'C', 'technical', 5),
  ('cpp', 'C++', 'technical', 6),
  ('go', 'Go', 'technical', 7),
  ('rust', 'Rust', 'technical', 8),
  ('kotlin', 'Kotlin', 'technical', 9),
  ('swift', 'Swift', 'technical', 10),
  ('dart', 'Dart', 'technical', 11),
  ('sql', 'SQL', 'technical', 12),
  ('html-css', 'HTML and CSS', 'technical', 13),
  ('react', 'React', 'technical', 14),
  ('nextjs', 'Next.js', 'technical', 15),
  ('nodejs', 'Node.js', 'technical', 16),
  ('flutter', 'Flutter', 'technical', 17),
  ('android', 'Android', 'technical', 18),
  ('django', 'Django', 'technical', 19),
  ('flask', 'Flask', 'technical', 20),
  ('fastapi', 'FastAPI', 'technical', 21),
  ('spring-boot', 'Spring Boot', 'technical', 22),
  ('ml', 'Machine learning', 'technical', 23),
  ('deep-learning', 'Deep learning', 'technical', 24),
  ('computer-vision', 'Computer vision', 'technical', 25),
  ('nlp', 'Natural language processing', 'technical', 26),
  ('llm-apps', 'LLM applications', 'technical', 27),
  ('data-analysis', 'Data analysis', 'technical', 28),
  ('tensorflow', 'TensorFlow', 'technical', 29),
  ('pytorch', 'PyTorch', 'technical', 30),
  ('scikit-learn', 'scikit-learn', 'technical', 31),
  ('opencv', 'OpenCV', 'technical', 32),
  ('blockchain', 'Blockchain', 'technical', 33),
  ('solidity', 'Solidity', 'technical', 34),
  ('docker', 'Docker', 'technical', 35),
  ('kubernetes', 'Kubernetes', 'technical', 36),
  ('aws', 'AWS', 'technical', 37),
  ('git', 'Git', 'technical', 38),
  ('linux', 'Linux', 'technical', 39),
  ('cybersecurity', 'Cybersecurity', 'technical', 40),
  ('arduino', 'Arduino', 'technical', 41),
  ('raspberry-pi', 'Raspberry Pi', 'technical', 42),
  ('iot', 'IoT', 'technical', 43),
  ('embedded-c', 'Embedded C', 'technical', 44),
  ('verilog', 'Verilog / VHDL', 'technical', 45),
  ('pcb', 'PCB design', 'technical', 46),
  ('cad', 'CAD', 'technical', 47),
  ('matlab', 'MATLAB', 'technical', 48),
  ('ui-ux', 'UI/UX design', 'non_technical', 49),
  ('figma', 'Figma', 'non_technical', 50),
  ('product-mgmt', 'Product management', 'non_technical', 51),
  ('business-strategy', 'Business strategy', 'non_technical', 52),
  ('pitching', 'Pitching and presenting', 'non_technical', 53),
  ('technical-writing', 'Technical writing', 'non_technical', 54),
  ('video-editing', 'Video editing', 'non_technical', 55),
  ('marketing', 'Marketing', 'non_technical', 56),
  ('market-research', 'Market research', 'non_technical', 57),
  ('leadership', 'Team leadership', 'non_technical', 58),
  ('project-mgmt', 'Project management', 'non_technical', 59);
