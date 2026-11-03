-- Module 2 checks (PRD HACK-1, HACK-2, HACK-3). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  c uuid := '00000000-0000-4000-8000-0000000000c3';
  h_id uuid;
  n int;
  r record;
  failed boolean;
begin
  -- Setup: A and B are onboarded, C signed up but never onboarded.
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (a, 'authenticated', 'authenticated', 'h-a@test.invalid', now()),
         (b, 'authenticated', 'authenticated', 'h-b@test.invalid', now()),
         (c, 'authenticated', 'authenticated', 'h-c@test.invalid', now());

  update public.profiles
  set display_name = 'Test User', degree = 'btech', college_id = 1, branch_id = 1, year_of_study = 2,
      graduation_year = 2029, birth_year = 2007, consent_version = 'v', consented_at = now(), onboarded_at = now()
  where id in (a, b);

  -- ---- Not onboarded -----------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);

  failed := false;
  begin
    perform * from public.list_hackathons();
  exception when insufficient_privilege then failed := sqlerrm = 'onboarding_required';
  end;
  if not failed then raise exception 'FAIL 1: a non-onboarded user could list hackathons.'; end if;

  failed := false;
  begin
    perform public.create_hackathon('Ghost Hack', null, 'online', null, current_date + 5, current_date + 6, null);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 2: a non-onboarded user could create a hackathon.'; end if;

  -- ---- User A creates ------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  h_id := public.create_hackathon('  Campus Hack 2027 ', 'CBIT', 'hybrid', 'Hyderabad', current_date + 30, current_date + 31, 'https://example.com/ch');
  select * into r from public.get_hackathon(h_id);
  if r.name <> 'Campus Hack 2027' then raise exception 'FAIL 3: name was not trimmed (%).', r.name; end if;
  if r.interest_count <> 1 or not r.is_interested then raise exception 'FAIL 4: creator is not counted as interested.'; end if;

  failed := false;
  begin
    perform public.create_hackathon('campus hack 2027', null, 'online', null, current_date + 30, current_date + 31, null);
  exception when raise_exception then failed := sqlerrm = 'duplicate_hackathon';
  end;
  if not failed then raise exception 'FAIL 5: an exact duplicate (name + start date) was accepted.'; end if;

  select count(*) into n from public.similar_hackathons('Campus Hackathon 2027');
  if n < 1 then raise exception 'FAIL 6: similar_hackathons did not flag a near-duplicate name.'; end if;

  failed := false;
  begin
    perform public.create_hackathon('Backwards Hack', null, 'online', null, current_date + 10, current_date + 9, null);
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 7: end date before start date was accepted.'; end if;

  failed := false;
  begin
    perform public.create_hackathon('Bad Link Hack', null, 'online', null, current_date + 10, current_date + 11, 'javascript:alert(1)');
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 8: a non-http(s) link was accepted.'; end if;

  -- An already finished hackathon, for the past-events filter (history uses these later).
  perform public.create_hackathon('Old Hack 2024', null, 'online', null, date '2024-03-01', date '2024-03-02', null);

  -- Daily limit: A has created 2 so far; 3 more are allowed, the 6th is not.
  perform public.create_hackathon('Limit Hack 1', null, 'online', null, current_date + 40, current_date + 41, null);
  perform public.create_hackathon('Limit Hack 2', null, 'online', null, current_date + 42, current_date + 43, null);
  perform public.create_hackathon('Limit Hack 3', null, 'online', null, current_date + 44, current_date + 45, null);
  failed := false;
  begin
    perform public.create_hackathon('Limit Hack 4', null, 'online', null, current_date + 46, current_date + 47, null);
  exception when raise_exception then failed := sqlerrm = 'rate_limited';
  end;
  if not failed then raise exception 'FAIL 9: a user could create more than 5 hackathons in a day.'; end if;

  -- ---- User B --------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select * into r from public.get_hackathon(h_id);
  if r.interest_count <> 1 or r.is_interested then raise exception 'FAIL 10: B sees wrong interest state before joining.'; end if;

  perform public.set_hackathon_interest(h_id, true);
  perform public.set_hackathon_interest(h_id, true); -- idempotent
  select * into r from public.get_hackathon(h_id);
  if r.interest_count <> 2 or not r.is_interested then raise exception 'FAIL 11: interest was not recorded exactly once.'; end if;

  select count(*) into n from public.hackathon_interest;
  if n <> 1 then raise exception 'FAIL 12: B can read % interest rows, expected only their own (1).', n; end if;

  select count(*) into n from public.list_hackathons();
  if n <> 4 then raise exception 'FAIL 13: default list should hide the past hackathon (got % rows, expected 4).', n; end if;
  select count(*) into n from public.list_hackathons(null, true);
  if n <> 5 then raise exception 'FAIL 14: include_past should return 5 rows, got %.', n; end if;

  select count(*) into n from public.list_hackathons('%');
  if n <> 0 then raise exception 'FAIL 15: a "%%" search matched % rows; wildcards must be escaped.', n; end if;
  select count(*) into n from public.list_hackathons('campus');
  if n <> 1 then raise exception 'FAIL 16: search for "campus" returned % rows, expected 1.', n; end if;

  failed := false;
  begin
    insert into public.hackathons (name, starts_on, ends_on) values ('Direct Insert', current_date, current_date);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 17: B could INSERT into hackathons directly.'; end if;

  failed := false;
  begin
    update public.hackathons set name = 'Hacked' where id = h_id;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 18: B could UPDATE a hackathon created by A.'; end if;

  failed := false;
  begin
    insert into public.hackathon_interest (user_id, hackathon_id) values (a, h_id);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 19: B could write interest rows directly.'; end if;

  perform public.set_hackathon_interest(h_id, false);
  select * into r from public.get_hackathon(h_id);
  if r.interest_count <> 1 or r.is_interested then raise exception 'FAIL 20: removing interest did not work.'; end if;

  failed := false;
  begin
    perform public.set_hackathon_interest(gen_random_uuid(), true);
  exception when raise_exception then failed := sqlerrm = 'hackathon_not_found';
  end;
  if not failed then raise exception 'FAIL 21: interest in a nonexistent hackathon was accepted.'; end if;

  -- ---- Anonymous visitor -----------------------------------------------------
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  failed := false;
  begin
    perform * from public.list_hackathons();
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 22: anonymous visitors can call list_hackathons.'; end if;

  failed := false;
  begin
    select count(*) into n from public.hackathons;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 23: anonymous visitors can read the hackathons table.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
