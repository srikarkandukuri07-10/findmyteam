-- Discovery, swiping, requests and teams checks (PRD DISC-1..7, REQ-1..5, TEAM-5/6). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  c uuid := '00000000-0000-4000-8000-0000000000c3'; -- never onboarded
  d uuid := '00000000-0000-4000-8000-0000000000d4';
  e uuid := '00000000-0000-4000-8000-0000000000e5'; -- suspended
  req_id uuid;
  tm_id uuid;
  cap_id uuid;
  res text;
  n int;
  r record;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select u, 'authenticated', 'authenticated', 'dx-' || right(u::text, 4) || '@test.invalid', now()
  from unnest(array[a, b, c, d, e]) u;

  update public.profiles
  set display_name = 'Person ' || right(id::text, 2), degree = 'btech', college_id = 1, branch_id = 1, year_of_study = 2,
      graduation_year = 2029, birth_year = 2008, consent_version = 'v', consented_at = now(), onboarded_at = now()
  where id in (a, b, d, e);
  update public.profiles set status = 'suspended' where id = e;
  -- Park every other real or demo student, so the checks below see only the test students.
  update public.profiles set status = 'suspended' where id not in (a, b, c, d, e);

  -- ---- Discovery as A -------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  select count(*) into n from public.discover_people(50) where id in (b, d);
  if n <> 2 then raise exception 'FAIL 1: A should see B and D, saw %.', n; end if;
  select count(*) into n from public.discover_people(50) where id in (a, c, e);
  if n <> 0 then raise exception 'FAIL 2: discovery showed myself, an un-onboarded or a suspended student (% rows).', n; end if;

  select * into r from public.discover_people(50) limit 1;
  if to_jsonb(r) ?| array['birth_year', 'email', 'github_id', 'status', 'consent_version', 'onboarded_at'] then
    raise exception 'FAIL 3: discover_people exposes a private field.';
  end if;

  -- ---- Swiping --------------------------------------------------------------------------
  res := public.swipe_person(b, 'connect');
  if res <> 'sent' then raise exception 'FAIL 4: connect returned % instead of sent.', res; end if;
  select count(*) into n from public.connection_requests where sender_id = a and recipient_id = b and status = 'pending';
  if n <> 1 then raise exception 'FAIL 5: no pending request was created.'; end if;

  res := public.swipe_person(b, 'connect');
  if res <> 'already' then raise exception 'FAIL 6: a repeat connect returned % instead of already.', res; end if;
  select count(*) into n from public.connection_requests where sender_id = a and recipient_id = b;
  if n <> 1 then raise exception 'FAIL 7: a repeat connect created % requests.', n; end if;

  select count(*) into n from public.discover_people(50) where id = b;
  if n <> 0 then raise exception 'FAIL 8: someone with a pending request still shows up in A''s deck.'; end if;

  res := public.swipe_person(d, 'skip');
  if res <> 'skipped' then raise exception 'FAIL 9: skip returned %.', res; end if;
  select count(*) into n from public.connection_requests where recipient_id = d or sender_id = d;
  if n <> 0 then raise exception 'FAIL 10: a skip created a request.'; end if;
  select count(*) into n from public.discover_people(50) where id = d;
  if n <> 0 then raise exception 'FAIL 11: a skipped student reappeared at once.'; end if;

  reset role;
  update public.swipes set created_at = now() - interval '31 days' where actor_id = a and target_id = d;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.discover_people(50) where id = d;
  if n <> 1 then raise exception 'FAIL 12: a student skipped over 30 days ago did not come back.'; end if;

  failed := false;
  begin
    perform public.swipe_person(a, 'connect');
  exception when raise_exception then failed := sqlerrm = 'invalid_target';
  end;
  if not failed then raise exception 'FAIL 13: swiping on myself was accepted.'; end if;

  failed := false;
  begin
    perform public.swipe_person(c, 'connect');
  exception when raise_exception then failed := sqlerrm = 'invalid_target';
  end;
  if not failed then raise exception 'FAIL 14: swiping on an un-onboarded student was accepted.'; end if;

  failed := false;
  begin
    perform public.swipe_person(e, 'connect');
  exception when raise_exception then failed := sqlerrm = 'invalid_target';
  end;
  if not failed then raise exception 'FAIL 15: swiping on a suspended student was accepted.'; end if;

  -- ---- Requests as B ---------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.discover_people(50) where id = a;
  if n <> 0 then raise exception 'FAIL 16: the sender of a pending request shows up in the recipient''s deck.'; end if;

  select * into r from public.list_requests('received');
  if r.id is null or r.other_id <> a or r.status <> 'pending' then raise exception 'FAIL 17: B does not see A''s pending request.'; end if;
  select count(*) into n from public.list_requests('sent');
  if n <> 0 then raise exception 'FAIL 18: B''s sent list is not empty.'; end if;
  req_id := r.id;

  failed := false;
  begin
    perform * from public.list_requests('everything');
  exception when raise_exception then failed := sqlerrm = 'invalid_direction';
  end;
  if not failed then raise exception 'FAIL 19: an invalid direction was accepted.'; end if;

  failed := false;
  begin
    perform public.cancel_request(req_id);
  exception when raise_exception then failed := sqlerrm = 'request_not_found';
  end;
  if not failed then raise exception 'FAIL 20: the recipient could cancel the sender''s request.'; end if;

  -- D (not involved) cannot see or answer it
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.connection_requests;
  if n <> 0 then raise exception 'FAIL 21: an uninvolved student can read % requests directly.', n; end if;
  failed := false;
  begin
    perform public.respond_request(req_id, true);
  exception when raise_exception then failed := sqlerrm = 'request_not_found';
  end;
  if not failed then raise exception 'FAIL 22: an uninvolved student could answer a request.'; end if;

  -- the sender cannot accept their own request
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.respond_request(req_id, true);
  exception when raise_exception then failed := sqlerrm = 'request_not_found';
  end;
  if not failed then raise exception 'FAIL 23: the sender could accept their own request.'; end if;

  -- B accepts
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform public.respond_request(req_id, true);
  select * into r from public.list_requests('received');
  if r.status <> 'accepted' or r.responded_at is null then raise exception 'FAIL 24: accepting did not record the answer.'; end if;
  failed := false;
  begin
    perform public.respond_request(req_id, false);
  exception when raise_exception then failed := sqlerrm = 'request_not_found';
  end;
  if not failed then raise exception 'FAIL 25: an accepted request could be answered again.'; end if;

  -- A -> D: reject
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  res := public.swipe_person(d, 'connect');
  if res <> 'sent' then raise exception 'FAIL 26: connect after an old skip returned %.', res; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select id into req_id from public.list_requests('received') limit 1;
  perform public.respond_request(req_id, false);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select * into r from public.list_requests('sent') where other_id = d;
  if r.status <> 'rejected' then raise exception 'FAIL 27: a rejection is not visible as rejected to the sender (%).', r.status; end if;

  -- ---- Cancel and expiry --------------------------------------------------------------------
  reset role;
  update public.connection_requests set status = 'cancelled' where sender_id = a and recipient_id = b; -- free the pair
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  res := public.swipe_person(b, 'connect');
  if res <> 'sent' then raise exception 'FAIL 28: a new request after a cancelled one returned %.', res; end if;
  select id into req_id from public.list_requests('sent') where other_id = b and status = 'pending';
  perform public.cancel_request(req_id);
  select status into r from public.list_requests('sent') where id = req_id;
  if r.status <> 'cancelled' then raise exception 'FAIL 29: cancel did not cancel (%).', r.status; end if;

  res := public.swipe_person(b, 'connect');
  if res <> 'sent' then raise exception 'FAIL 30: sending again after cancelling returned %.', res; end if;
  select id into req_id from public.list_requests('sent') where other_id = b and status = 'pending';

  reset role;
  update public.connection_requests set created_at = now() - interval '15 days' where id = req_id;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select * into r from public.list_requests('sent') where id = req_id;
  if r.status <> 'expired' then raise exception 'FAIL 31: a 15-day-old pending request is not shown as expired (%).', r.status; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.respond_request(req_id, true);
  exception when raise_exception then failed := sqlerrm = 'request_not_found';
  end;
  if not failed then raise exception 'FAIL 32: an expired request could still be accepted.'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  res := public.swipe_person(b, 'connect');
  if res <> 'sent' then raise exception 'FAIL 33: an expired request blocked a new one (%).', res; end if;

  -- ---- Direct writes ---------------------------------------------------------------------------
  failed := false;
  begin
    insert into public.connection_requests (sender_id, recipient_id) values (a, d);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 34: a user could insert a request directly.'; end if;

  failed := false;
  begin
    update public.connection_requests set status = 'accepted' where sender_id = a;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 35: a user could update a request directly.'; end if;

  failed := false;
  begin
    insert into public.swipes (actor_id, target_id, action) values (a, d, 'skip');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 36: a user could insert a swipe directly.'; end if;

  -- ---- Daily cap (25 connects per 24 hours) --------------------------------------------------------
  reset role;
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select gen_random_uuid(), 'authenticated', 'authenticated', 'cap-' || g || '@test.invalid', now() from generate_series(1, 25) g;
  update public.profiles set display_name = 'Cap Person', degree = 'btech', college_id = 1, branch_id = 1, year_of_study = 2,
         graduation_year = 2029, birth_year = 2008, consent_version = 'v', consented_at = now(), onboarded_at = now()
  where id in (select id from auth.users where email like 'cap-%@test.invalid');
  -- A has already connected with B once today (the request above); add 24 more swipes to reach 25.
  -- Looked up here, as the database owner: a normal user cannot read other students' rows.
  select id into cap_id from public.profiles where display_name = 'Cap Person' order by id desc limit 1;
  insert into public.swipes (actor_id, target_id, action, created_at)
  select a, p.id, 'connect', now() from (select id from public.profiles where display_name = 'Cap Person' limit 24) p;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  if public.my_connects_left() <> 0 then raise exception 'FAIL 37: connects left should be 0, got %.', public.my_connects_left(); end if;
  select count(*) into n from public.connection_requests where sender_id = a;
  res := public.swipe_person(cap_id, 'connect');
  if res <> 'limit' then raise exception 'FAIL 38: a connect past the cap returned % instead of limit.', res; end if;
  if (select count(*) from public.connection_requests where sender_id = a) <> n then raise exception 'FAIL 39: the limit still created a request.'; end if;
  res := public.swipe_person(d, 'skip');
  if res <> 'skipped' then raise exception 'FAIL 40: skipping should still work at the limit, got %.', res; end if;

  -- ---- Teams ------------------------------------------------------------------------------------------
  reset role;
  insert into public.teams (name, description, idea, owner_id, recruit_status, is_demo)
  values ('Test Team', 'Desc', 'Idea', b, 'partially_filled', true) returning id into tm_id;
  insert into public.team_members (team_id, user_id, is_owner) values (tm_id, b, true), (tm_id, d, false);
  insert into public.team_positions (team_id, role_id, spots) values (tm_id, 1, 2);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select * into r from public.list_teams() where id = tm_id;
  if r.member_count <> 2 or jsonb_array_length(r.members) <> 2 or jsonb_array_length(r.positions) <> 1 then raise exception 'FAIL 41: list_teams returned wrong members or positions.'; end if;
  select * into r from public.get_team(tm_id);
  if r.name <> 'Test Team' or jsonb_array_length(r.members) <> 2 then raise exception 'FAIL 42: get_team is wrong.'; end if;
  if to_jsonb(r) ?| array['owner_id', 'birth_year', 'email'] or r.members::text like '%birth%' then raise exception 'FAIL 43: get_team exposes a private field.'; end if;

  failed := false;
  begin
    perform count(*) from public.team_members;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 44: a user can read team_members directly.'; end if;

  failed := false;
  begin
    insert into public.teams (name) values ('Sneaky team');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 45: a user could create a team directly.'; end if;

  -- ---- Not onboarded / anonymous ----------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform * from public.discover_people(5);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 46: a non-onboarded student can use discovery.'; end if;
  failed := false;
  begin
    perform public.swipe_person(b, 'connect');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 47: a non-onboarded student can swipe.'; end if;

  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  failed := false;
  begin
    perform * from public.discover_people(5);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 48: anonymous visitors can call discover_people.'; end if;
  failed := false;
  begin
    perform * from public.list_teams();
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 49: anonymous visitors can call list_teams.'; end if;
  failed := false;
  begin
    select count(*) into n from public.teams;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 50: anonymous visitors can read the teams table.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
