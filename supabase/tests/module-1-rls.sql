-- Module 1 RLS and onboarding checks (updated for the three-card onboarding, D26). Run against a dev database (Supabase SQL editor or MCP).
-- Everything runs in one DO block that ends by raising 'ALL_TESTS_PASSED', which rolls back
-- every change: seeing that error means success; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';
  b uuid := '00000000-0000-4000-8000-00000000000b';
  n int;
  failed boolean;
begin
  -- Setup: A has a verified email, B does not.
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (a, 'authenticated', 'authenticated', 'rls-a@test.invalid', now()),
         (b, 'authenticated', 'authenticated', 'rls-b@test.invalid', null);

  select count(*) into n from public.profiles where id in (a, b);
  if n <> 2 then raise exception 'FAIL 1: signup trigger did not create both profiles (%).', n; end if;

  -- ---- As user A --------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL 2: A can see % profiles, expected only their own.', n; end if;

  select count(*) into n from public.profiles where id = b;
  if n <> 0 then raise exception 'FAIL 3: A can read B''s profile.'; end if;

  failed := false;
  begin
    update public.profiles set display_name = 'Hacked' where id = b;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 4: A could run an UPDATE on another profile.'; end if;

  failed := false;
  begin
    update public.profiles set onboarded_at = now(), status = 'active' where id = a;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 5: A could UPDATE their own row directly, bypassing onboarding.'; end if;

  failed := false;
  begin
    insert into public.colleges (name) values ('Fake College');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 6: A could add a college.'; end if;

  select count(*) into n from public.colleges;
  if n < 20 then raise exception 'FAIL 7: A cannot read the college list (% rows).', n; end if;

  -- Card 1 (D26): a college name is required.
  failed := false;
  begin
    perform public.save_onboarding_details('Asha Rao', '9876500001', ' ', 'btech', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, '2026-11-03');
  exception when invalid_parameter_value then failed := sqlerrm = 'invalid_college';
  end;
  if not failed then raise exception 'FAIL 8: onboarding accepted a profile with no college.'; end if;

  perform public.save_onboarding_details('Asha Rao', '9876500001', 'Vasavi College of Engineering', 'btech', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, '2026-11-03');
  select count(*) into n from public.profiles where id = a and details_saved_at is not null and onboarded_at is null and consented_at is not null;
  if n <> 1 then raise exception 'FAIL 9: card 1 did not save (or finished onboarding early).'; end if;

  -- Card 2 finishes onboarding; after that card 1 can't overwrite the details.
  perform public.complete_onboarding_profile(repeat('I build web apps and love hackathons. ', 2), '[{"id":1,"level":"advanced"},{"id":2,"level":"beginner"},{"id":3,"level":"intermediate"}]'::jsonb, '{}'::smallint[], '{}'::text[]);
  failed := false;
  begin
    perform public.save_onboarding_details('Other Name', '9876500001', 'Vasavi College of Engineering', 'be', 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, '2026-11-03');
  exception when raise_exception then failed := sqlerrm = 'already_onboarded';
  end;
  if not failed then raise exception 'FAIL 10: onboarding could be repeated to overwrite details.'; end if;

  -- ---- As user B --------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.complete_onboarding_profile(repeat('x', 50), '[]'::jsonb, '{}'::smallint[], '{}'::text[]);
  exception when raise_exception then failed := sqlerrm = 'details_required';
  end;
  if not failed then raise exception 'FAIL 11: card 2 was accepted before card 1.'; end if;

  -- ---- As anonymous visitor ---------------------------------------------
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  failed := false;
  begin
    select count(*) into n from public.profiles;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 12: anonymous visitors can query profiles (% rows).', n; end if;

  select count(*) into n from public.colleges;
  if n <> 0 then raise exception 'FAIL 13: anonymous visitors can read colleges.'; end if;

  failed := false;
  begin
    perform public.save_onboarding_details('X', '9876500002', 'Vasavi College of Engineering', 'btech', 1::smallint, 1::smallint, 2029::smallint, 2007::smallint, 'v');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 14: anonymous visitors can call save_onboarding_details.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
