-- Google sign-in early access and the college-email badge (D25, AUTH-1, PROF-1). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000003a1';
  b uuid := '00000000-0000-4000-8000-0000000003b2';
  adm uuid := '00000000-0000-4000-8000-0000000003c3';
  res text;
  r record;
  n int;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select u, 'authenticated', 'authenticated', 'cb-' || right(u::text, 3) || '@test.invalid', now()
  from unnest(array[a, b, adm]) u;
  update public.profiles
  set display_name = 'Badge Person ' || right(id::text, 3), degree = 'btech', college_id = 1, branch_id = 1,
      year_of_study = 2, graduation_year = 2029, birth_year = 2006, consent_version = 'v', consented_at = now(),
      onboarded_at = now()
  where id in (a, b, adm);
  update public.profiles set role = 'admin' where id = adm;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- ---- Starting: checks before any email is sent -----------------------------------------
  if public.start_college_verification('not an email') <> 'invalid_email' then raise exception 'FAIL 1: a bad address was accepted.'; end if;
  if public.start_college_verification('Someone@Gmail.com') <> 'personal_email' then raise exception 'FAIL 2: a Gmail address was accepted.'; end if;

  failed := false;
  begin
    res := public.start_college_verification('a@college-test.ac.in');
  exception when raise_exception then failed := sqlerrm = 'email_not_configured';
  end;
  -- Passes either way on a project with Resend set up (then it really sends); only checks nothing breaks silently.
  if not failed and res is distinct from 'sent' and res is distinct from 'send_failed' then
    raise exception 'FAIL 3: start returned %.', res;
  end if;

  -- ---- Students cannot touch the tables or the badge -----------------------------------------
  failed := false;
  begin
    select count(*) into n from public.college_verifications;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 4: students can read college_verifications.'; end if;
  failed := false;
  begin
    select count(*) into n from public.college_email_domains;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 5: students can read college_email_domains.'; end if;
  failed := false;
  begin
    update public.profiles set college_verified_at = now() where id = a;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 6: a student could give themselves the badge.'; end if;
  failed := false;
  begin
    perform public.send_college_code('a@college-test.ac.in', '123456');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 7: students can call send_college_code.'; end if;
  failed := false;
  begin
    perform public.admin_set_college_domain('college-test.ac.in', true);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 8: a student could approve a domain.'; end if;

  -- ---- A code in flight (set up directly, as if the email had gone out) ------------------------------
  reset role;
  insert into public.college_verifications (user_id, pending_email, pending_domain, code_hash, code_expires_at, sends)
  values (a, 'a@college-test.ac.in', 'college-test.ac.in', extensions.crypt('482913', extensions.gen_salt('bf', 4)),
          now() + interval '10 minutes', 1)
  on conflict (user_id) do update set pending_email = excluded.pending_email, pending_domain = excluded.pending_domain,
    code_hash = excluded.code_hash, code_expires_at = excluded.code_expires_at, attempts = 0;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  if public.confirm_college_verification('000000') <> 'wrong_code' then raise exception 'FAIL 9: a wrong code was not refused.'; end if;
  select * into r from public.my_college_verification();
  if r.attempts_left <> 4 or r.pending_email <> 'a@college-test.ac.in' or r.badge then
    raise exception 'FAIL 10: my_college_verification is wrong: %', to_jsonb(r);
  end if;

  -- B can't see A's address or use A's code.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  if public.confirm_college_verification('482913') <> 'no_request' then raise exception 'FAIL 11: B used A''s code.'; end if;
  select * into r from public.my_college_verification();
  if r.pending_email is not null or r.email is not null then raise exception 'FAIL 12: B can see A''s address.'; end if;

  -- Correct code, domain not approved yet: confirmed but no badge.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  if public.confirm_college_verification(' 482913 ') <> 'pending_domain' then raise exception 'FAIL 13: the right code did not confirm.'; end if;
  if exists (select 1 from public.college_verified_ids(array[a])) then raise exception 'FAIL 14: badge before the domain was approved.'; end if;
  if public.confirm_college_verification('482913') <> 'no_request' then raise exception 'FAIL 15: a code worked twice.'; end if;
  if public.start_college_verification('A@College-Test.ac.in') <> 'already_verified' then raise exception 'FAIL 16: re-verifying the same address.'; end if;

  -- The same address can't back a second account.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  if public.start_college_verification('a@college-test.ac.in') <> 'email_in_use' then raise exception 'FAIL 17: one address verified two accounts.'; end if;

  -- ---- Admin approves the domain: badge on; un-approves: badge off -----------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select * into r from public.admin_list_college_domains() where domain = 'college-test.ac.in';
  if r.students <> 1 or r.approved then raise exception 'FAIL 18: the admin list is wrong: %', to_jsonb(r); end if;
  if exists (select 1 from public.admin_list_college_domains() l where l.domain like '%@%') then raise exception 'FAIL 19: the admin list shows an address.'; end if;
  failed := false;
  begin
    perform public.admin_set_college_domain('gmail.com', true);
  exception when invalid_parameter_value then failed := true;
  end;
  if not failed then raise exception 'FAIL 20: gmail.com could be approved as a college.'; end if;
  perform public.admin_set_college_domain('college-test.ac.in', true);
  if not exists (select 1 from public.college_verified_ids(array[a, b])) then raise exception 'FAIL 21: approving the domain gave no badge.'; end if;
  if (select count(*) from public.college_verified_ids(array[a, b])) <> 1 then raise exception 'FAIL 22: B got a badge.'; end if;
  perform public.admin_set_college_domain('college-test.ac.in', false);
  if exists (select 1 from public.college_verified_ids(array[a])) then raise exception 'FAIL 23: un-approving kept the badge.'; end if;
  perform public.admin_set_college_domain('college-test.ac.in', true);

  -- ---- Locking and expiry -----------------------------------------------------------------------------
  reset role;
  insert into public.college_verifications (user_id, pending_email, pending_domain, code_hash, code_expires_at)
  values (b, 'b@college-test.ac.in', 'college-test.ac.in', extensions.crypt('111111', extensions.gen_salt('bf', 4)),
          now() + interval '10 minutes');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  for i in 1..4 loop
    if public.confirm_college_verification('222222') <> 'wrong_code' then raise exception 'FAIL 24: try % was not wrong_code.', i; end if;
  end loop;
  if public.confirm_college_verification('222222') <> 'locked' then raise exception 'FAIL 25: the fifth wrong try did not lock.'; end if;
  if public.confirm_college_verification('111111') <> 'locked' then raise exception 'FAIL 26: the right code worked after locking.'; end if;

  reset role;
  update public.college_verifications set attempts = 0, code_expires_at = now() - interval '1 second' where user_id = b;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  if public.confirm_college_verification('111111') <> 'expired' then raise exception 'FAIL 27: an expired code worked.'; end if;

  -- Three codes an hour.
  reset role;
  update public.college_verifications set sends = 3, sends_window_start = now() where user_id = b;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  if public.start_college_verification('b@college-test.ac.in') <> 'rate_limited' then raise exception 'FAIL 28: a fourth code in an hour.'; end if;

  -- Removing clears the badge.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.remove_college_verification();
  if exists (select 1 from public.college_verified_ids(array[a])) then raise exception 'FAIL 29: removing kept the badge.'; end if;

  -- ---- Early access for a Google account -------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  if public.admin_grant_early_access('  New.Friend@test.invalid ') <> 'created' then raise exception 'FAIL 30: grant did not create.'; end if;
  reset role;
  select count(*) into n from auth.users u join public.profiles p on p.id = u.id
  where u.email = 'new.friend@test.invalid' and (u.raw_app_meta_data ->> 'early_access')::boolean
    and u.email_confirmed_at is not null and coalesce(u.encrypted_password, '') = '';
  if n <> 1 then raise exception 'FAIL 31: the new account is missing its profile, confirmation or mark, or has a password.'; end if;

  -- ---- Visitors ------------------------------------------------------------------------------------------
  set local role anon;
  failed := false;
  begin
    perform public.college_verified_ids(array[a]);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 32: anonymous visitors can call college_verified_ids.'; end if;
  failed := false;
  begin
    res := public.start_college_verification('x@college-test.ac.in');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 33: anonymous visitors can start a verification.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
