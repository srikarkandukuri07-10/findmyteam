-- D26 change: on Card 1 the student types their college or university name (no list to pick from).
-- It is stored in profiles.college_other; college_id stays empty for new students. The one-off AISHE
-- import function is no longer needed.
drop function if exists public.import_aishe_colleges(text, jsonb);
drop function public.save_onboarding_details(text, text, integer, public.degree, smallint, smallint, smallint, smallint, text);

create function public.save_onboarding_details(
  p_display_name text,
  p_phone text,
  p_college text,
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
  v_college text := regexp_replace(btrim(coalesce(p_college, '')), '\s+', ' ', 'g');
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
  if char_length(v_college) < 3 or char_length(v_college) > 120 then
    raise exception 'invalid_college' using errcode = '22023';
  end if;

  insert into public.profile_private (user_id, phone) values (v_uid, v_phone)
  on conflict (user_id) do update set phone = excluded.phone, updated_at = now();

  update public.profiles
  set display_name     = btrim(p_display_name),
      college_id       = null,
      college_other    = v_college,
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
revoke all on function public.save_onboarding_details(text, text, text, public.degree, smallint, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.save_onboarding_details(text, text, text, public.degree, smallint, smallint, smallint, smallint, text) to authenticated;

-- The card shows the typed name back.
create or replace function public.my_onboarding()
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
  select u.email::text, p.display_name, pp.phone, p.college_id, coalesce(c.name, p.college_other),
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
