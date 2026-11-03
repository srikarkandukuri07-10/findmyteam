-- Module 1 RLS and onboarding checks. Run against a dev database (Supabase SQL editor or MCP).
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

  -- Missing college is rejected by the database itself.
  failed := false;
  begin
    perform public.complete_onboarding('Asha Rao', 'btech', null, null, 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, '2026-11-03');
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 8: onboarding accepted a profile with no college.'; end if;

  perform public.complete_onboarding('Asha Rao', 'btech', 1::smallint, null, 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, '2026-11-03');
  select count(*) into n from public.profiles where id = a and onboarded_at is not null and consented_at is not null;
  if n <> 1 then raise exception 'FAIL 9: valid onboarding did not complete.'; end if;

  failed := false;
  begin
    perform public.complete_onboarding('Other Name', 'be', 1::smallint, null, 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, '2026-11-03');
  exception when raise_exception then failed := sqlerrm = 'already_onboarded';
  end;
  if not failed then raise exception 'FAIL 10: onboarding could be repeated to overwrite details.'; end if;

  -- ---- As user B (email not verified) -----------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.complete_onboarding('Ben', 'btech', 1::smallint, null, 1::smallint, 2::smallint, 2029::smallint, 2007::smallint, '2026-11-03');
  exception when insufficient_privilege then failed := sqlerrm = 'email_not_verified';
  end;
  if not failed then raise exception 'FAIL 11: an unverified user could complete onboarding.'; end if;

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
    perform public.complete_onboarding('X', 'btech', 1::smallint, null, 1::smallint, 1::smallint, 2029::smallint, 2007::smallint, 'v');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 14: anonymous visitors can call complete_onboarding.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
