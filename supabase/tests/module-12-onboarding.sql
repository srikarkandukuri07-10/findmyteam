-- Three-card onboarding checks (D26, AUTH-7, PROF-1, DISC-4). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000004a1';
  b uuid := '00000000-0000-4000-8000-0000000004b2';
  adm uuid := '00000000-0000-4000-8000-0000000004c3';
  h uuid;
  n int;
  r record;
  failed boolean;
  skills3 jsonb := '[{"id":1,"level":"advanced"},{"id":2,"level":"intermediate"},{"id":3,"level":"beginner"}]';
  bio text := 'I build backends in Go and love shipping MVPs at hackathons.';
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select u, 'authenticated', 'authenticated', 'ob-' || right(u::text, 3) || '@test.invalid', now()
  from unnest(array[a, b, adm]) u;
  update public.profiles set role = 'admin' where id = adm;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- ---- College search ----------------------------------------------------------------
  select count(*) into n from public.search_colleges('chaitanya');
  if n < 1 then raise exception 'FAIL 1: searching a known college found nothing.'; end if;
  select count(*) into n from public.search_colleges('c');
  if n <> 0 then raise exception 'FAIL 2: a one-letter search returned results.'; end if;

  -- ---- Phone ----------------------------------------------------------------------------
  failed := false;
  begin
    perform public.save_onboarding_details('Asha Rao', '12345', 'Vasavi College of Engineering', 'btech', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, 'v');
  exception when invalid_parameter_value then failed := sqlerrm = 'invalid_phone';
  end;
  if not failed then raise exception 'FAIL 3: a bad phone number was accepted.'; end if;

  perform public.save_onboarding_details('Asha Rao', '98765 43210', 'Vasavi College of Engineering', 'btech', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, 'v');
  select count(*) into n from public.profile_private where user_id = a and phone = '+919876543210';
  if n <> 1 then raise exception 'FAIL 4: the phone was not saved in +91 form.'; end if;

  failed := false;
  begin
    insert into public.profile_private (user_id, phone) values (a, '+919999999999');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 5: a student could write profile_private directly.'; end if;

  -- B can't use A's number and can't read it
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.save_onboarding_details('Ben', '+91 98765 43210', 'Vasavi College of Engineering', 'btech', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, 'v');
  exception when raise_exception then failed := sqlerrm = 'phone_in_use';
  end;
  if not failed then raise exception 'FAIL 6: one phone number backed two accounts.'; end if;
  select count(*) into n from public.profile_private;
  if n <> 0 then raise exception 'FAIL 7: B can read someone else''s phone.'; end if;
  select * into r from public.my_onboarding();
  if r.phone is not null then raise exception 'FAIL 8: my_onboarding leaked a phone.'; end if;

  -- ---- The college is typed (D26) -------------------------------------------------------------
  failed := false;
  begin
    perform public.save_onboarding_details('Ben', '9123456780', 'ab', 'btech', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, 'v');
  exception when invalid_parameter_value then failed := sqlerrm = 'invalid_college';
  end;
  if not failed then raise exception 'FAIL 9: a two-letter college name was accepted.'; end if;
  perform public.save_onboarding_details('Ben', '9123456780', '  Zyxw   Institute of Technology ', 'btech', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, 'v');
  select * into r from public.my_onboarding();
  if r.college_name <> 'Zyxw Institute of Technology' then raise exception 'FAIL 10: the typed college was not saved tidily (%).', r.college_name; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- ---- Card 2 requirements -------------------------------------------------------------------
  failed := false;
  begin
    perform public.complete_onboarding_profile('too short', skills3, '{}'::smallint[], '{}'::text[]);
  exception when invalid_parameter_value then failed := sqlerrm = 'bio_too_short';
  end;
  if not failed then raise exception 'FAIL 15: a short bio was accepted.'; end if;
  failed := false;
  begin
    perform public.complete_onboarding_profile(bio, '[{"id":1,"level":"advanced"}]'::jsonb, '{}'::smallint[], '{}'::text[]);
  exception when invalid_parameter_value then failed := sqlerrm = 'too_few_skills';
  end;
  if not failed then raise exception 'FAIL 16: fewer than three skills were accepted.'; end if;
  failed := false;
  begin
    perform public.complete_onboarding_profile(bio, skills3, '{}'::smallint[], array['not-a-topic']);
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 17: an unknown interest was accepted.'; end if;

  -- the college-email badge works before onboarding is finished
  select * into r from public.my_college_verification();
  if r.badge then raise exception 'FAIL 18: badge before verifying.'; end if;

  perform public.complete_onboarding_profile(bio, skills3, '{}'::smallint[], array['ai-ml', 'fintech']);
  select * into r from public.my_onboarding();
  if not r.onboarded or r.interests <> array['ai-ml', 'fintech'] then raise exception 'FAIL 19: card 2 did not finish onboarding: %', to_jsonb(r); end if;

  -- ---- Past hackathons ------------------------------------------------------------------------
  h := public.add_past_hackathon('Smart Build Challenge', 2025::smallint, 'winner', 'Crop disease detection', 'https://example.org/app', null);
  failed := false;
  begin
    perform public.add_past_hackathon('Bad link hack', 2025::smallint, 'participated', null, 'http://insecure.example', null);
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 20: a non-https link was accepted.'; end if;
  failed := false;
  begin
    perform public.add_past_hackathon('Future hack', 2099::smallint, 'participated', null, null, null);
  exception when invalid_parameter_value then failed := true;
  end;
  if not failed then raise exception 'FAIL 21: a hackathon in the future was accepted.'; end if;

  -- B (not onboarded) can't see A's; once A is onboarded others can, and can't delete them
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.list_past_hackathons(a);
  if n <> 1 then raise exception 'FAIL 22: an onboarded student''s hackathons are not visible (%).', n; end if;
  perform public.delete_past_hackathon(h);
  select count(*) into n from public.list_past_hackathons(a);
  if n <> 1 then raise exception 'FAIL 23: B deleted A''s hackathon.'; end if;
  select count(*) into n from public.past_hackathons;
  if n <> 0 then raise exception 'FAIL 24: B can read the past_hackathons table directly.'; end if;

  -- ---- Visitors ----------------------------------------------------------------------------------
  reset role;
  set local role anon;
  failed := false;
  begin
    perform * from public.search_colleges('chaitanya');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 25: anonymous visitors can search colleges.'; end if;
  failed := false;
  begin
    select count(*) into n from public.profile_private;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 26: anonymous visitors can query profile_private.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
