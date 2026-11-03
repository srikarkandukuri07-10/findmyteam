-- Module 3a checks (PRD PROF-1, PROF-2, PROF-8). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  c uuid := '00000000-0000-4000-8000-0000000000c3';
  skill_ids int[];
  skills_json jsonb;
  n int;
  r record;
  failed boolean;
begin
  -- A and B are onboarded, C signed up but never onboarded.
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (a, 'authenticated', 'authenticated', 'p-a@test.invalid', now()),
         (b, 'authenticated', 'authenticated', 'p-b@test.invalid', now()),
         (c, 'authenticated', 'authenticated', 'p-c@test.invalid', now());

  update public.profiles
  set display_name = 'Test User', degree = 'btech', college_id = 1, branch_id = 1, year_of_study = 2,
      graduation_year = 2029, birth_year = 2009, consent_version = 'v', consented_at = now(), onboarded_at = now()
  where id in (a, b);

  select array_agg(id order by id) into skill_ids from (select id from public.skills order by id limit 16) s;

  -- ---- User A saves a profile ---------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  perform public.save_profile(
    '  Asha Rao ', 'I build ML things.', 'https://www.linkedin.com/in/asha-rao/',
    2::smallint, 3::smallint, 2028::smallint,
    jsonb_build_array(
      jsonb_build_object('id', skill_ids[1], 'level', 'advanced'),
      jsonb_build_object('id', skill_ids[2], 'level', 'beginner'),
      jsonb_build_object('id', skill_ids[2], 'level', 'advanced')), -- duplicate id is collapsed
    array[1, 5]::smallint[]);

  select * into r from public.get_profile(a);
  if r.display_name <> 'Asha Rao' then raise exception 'FAIL 1: name was not trimmed (%).', r.display_name; end if;
  if r.is_me is not true then raise exception 'FAIL 2: is_me should be true on my own profile.'; end if;
  if jsonb_array_length(r.skills) <> 2 then raise exception 'FAIL 3: duplicate skill ids were not collapsed (% skills).', jsonb_array_length(r.skills); end if;
  if jsonb_array_length(r.roles) <> 2 then raise exception 'FAIL 4: expected 2 roles, got %.', jsonb_array_length(r.roles); end if;
  if r.branch_name is null or r.college_name is null then raise exception 'FAIL 5: branch/college names missing from get_profile.'; end if;

  -- Saving again replaces, not appends.
  perform public.save_profile('Asha Rao', null, null, 2::smallint, 3::smallint, 2028::smallint,
    jsonb_build_array(jsonb_build_object('id', skill_ids[3], 'level', 'intermediate')), array[]::smallint[]);
  select * into r from public.get_profile(a);
  if jsonb_array_length(r.skills) <> 1 or jsonb_array_length(r.roles) <> 0 then raise exception 'FAIL 6: saving did not replace the previous skills and roles.'; end if;
  if r.bio is not null or r.linkedin_url is not null then raise exception 'FAIL 7: blank optional fields were not cleared.'; end if;

  -- Restore the fuller profile for B's checks.
  perform public.save_profile('Asha Rao', 'I build ML things.', 'https://www.linkedin.com/in/asha-rao/',
    2::smallint, 3::smallint, 2028::smallint,
    jsonb_build_array(jsonb_build_object('id', skill_ids[1], 'level', 'advanced')), array[1]::smallint[]);

  -- ---- Input limits -----------------------------------------------------------
  failed := false;
  begin
    select jsonb_agg(jsonb_build_object('id', s, 'level', 'beginner')) into skills_json from unnest(skill_ids) s; -- 16 skills
    perform public.save_profile('Asha Rao', null, null, 2::smallint, 3::smallint, 2028::smallint, skills_json, array[]::smallint[]);
  exception when raise_exception then failed := sqlerrm = 'too_many_skills';
  end;
  if not failed then raise exception 'FAIL 8: 16 skills were accepted (limit is 15).'; end if;

  failed := false;
  begin
    perform public.save_profile('Asha Rao', null, null, 2::smallint, 3::smallint, 2028::smallint, '[]'::jsonb, array[1, 2, 3, 4]::smallint[]);
  exception when raise_exception then failed := sqlerrm = 'too_many_roles';
  end;
  if not failed then raise exception 'FAIL 9: 4 roles were accepted (limit is 3).'; end if;

  failed := false;
  begin
    perform public.save_profile('Asha Rao', repeat('x', 501), null, 2::smallint, 3::smallint, 2028::smallint, '[]'::jsonb, array[]::smallint[]);
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 10: a 501-character bio was accepted.'; end if;

  failed := false;
  begin
    perform public.save_profile('Asha Rao', null, 'javascript:alert(1)', 2::smallint, 3::smallint, 2028::smallint, '[]'::jsonb, array[]::smallint[]);
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 12: a javascript: link was accepted as a LinkedIn URL.'; end if;

  failed := false;
  begin
    perform public.save_profile('Asha Rao', null, 'https://evil.example/in/asha', 2::smallint, 3::smallint, 2028::smallint, '[]'::jsonb, array[]::smallint[]);
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 13: a non-LinkedIn address was accepted.'; end if;

  failed := false;
  begin
    perform public.save_profile('Asha Rao', null, 'https://linkedin.com.evil.example/in/asha', 2::smallint, 3::smallint, 2028::smallint, '[]'::jsonb, array[]::smallint[]);
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 14: a look-alike LinkedIn domain was accepted.'; end if;

  failed := false;
  begin
    perform public.save_profile('Asha Rao', null, null, 2::smallint, 3::smallint, 2028::smallint,
      jsonb_build_array(jsonb_build_object('id', 32000, 'level', 'beginner')), array[]::smallint[]);
  exception when foreign_key_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 15: a nonexistent skill id was accepted.'; end if;

  -- A failed save must not leave a half-saved profile behind.
  select * into r from public.get_profile(a);
  if r.bio <> 'I build ML things.' or jsonb_array_length(r.skills) <> 1 then raise exception 'FAIL 16: a failed save changed the stored profile.'; end if;

  -- ---- Direct writes are blocked ---------------------------------------------
  failed := false;
  begin
    update public.profiles set bio = 'direct' where id = a;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 17: a user could UPDATE profiles directly.'; end if;

  failed := false;
  begin
    insert into public.profile_skills (user_id, skill_id) values (a, skill_ids[5]);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 18: a user could INSERT into profile_skills directly.'; end if;

  failed := false;
  begin
    insert into public.skills (slug, name, category) values ('x', 'X', 'technical');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 19: a user could add to the skills list.'; end if;

  -- ---- User B looks at A -----------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select * into r from public.get_profile(a);
  if r.id is null or r.is_me then raise exception 'FAIL 20: B cannot view A, or is_me is wrong.'; end if;
  if r.bio <> 'I build ML things.' or jsonb_array_length(r.skills) <> 1 then raise exception 'FAIL 21: B sees an incomplete profile of A.'; end if;

  -- None of the private columns can appear in the result.
  if to_jsonb(r) ?| array['birth_year', 'consent_version', 'consented_at', 'status', 'email', 'onboarded_at'] then
    raise exception 'FAIL 22: get_profile exposes a private field.';
  end if;

  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL 23: B can read % profile rows directly, expected only their own (1).', n; end if;
  select count(*) into n from public.profile_skills;
  if n <> 0 then raise exception 'FAIL 24: B can read % of A''s skill rows directly.', n; end if;
  select count(*) into n from public.skills;
  if n < 50 then raise exception 'FAIL 25: B cannot read the skills list (% rows).', n; end if;

  select count(*) into n from public.get_profile(c); -- C never onboarded
  if n <> 0 then raise exception 'FAIL 26: a non-onboarded user''s profile is visible to others.'; end if;
  select count(*) into n from public.get_profile(gen_random_uuid());
  if n <> 0 then raise exception 'FAIL 27: a random id returned a profile.'; end if;

  -- A suspended student disappears from other students' view.
  reset role;
  update public.profiles set status = 'suspended' where id = a;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.get_profile(a);
  if n <> 0 then raise exception 'FAIL 28: a suspended student is still visible to others.'; end if;

  -- ---- User C (not onboarded) -----------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.save_profile('Cee', null, null, 1::smallint, 1::smallint, 2029::smallint, '[]'::jsonb, array[]::smallint[]);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 29: a non-onboarded user could save a profile.'; end if;

  failed := false;
  begin
    perform * from public.get_profile(b);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 30: a non-onboarded user could view profiles.'; end if;

  -- ---- Anonymous visitor ---------------------------------------------------------
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  failed := false;
  begin
    perform * from public.get_profile(b);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 31: anonymous visitors can call get_profile.'; end if;

  failed := false;
  begin
    select count(*) into n from public.profile_skills;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 32: anonymous visitors can read profile_skills.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
