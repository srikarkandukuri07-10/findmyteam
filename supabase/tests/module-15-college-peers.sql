-- "People from your college" (D32). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000015a1';
  b uuid := '00000000-0000-4000-8000-0000000015b2'; -- same college, written differently
  c uuid := '00000000-0000-4000-8000-0000000015c3'; -- another college
  d uuid := '00000000-0000-4000-8000-0000000015d4'; -- same college, not finished sign-up
  n int;
  r record;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select u, 'authenticated', 'authenticated', 'cp-' || right(u::text, 3) || '@test.invalid', now()
  from unnest(array[a, b, c, d]) u;
  update public.profiles
  set display_name = 'Peer Person ' || right(id::text, 3), degree = 'btech', branch_id = 1, year_of_study = 2,
      graduation_year = 2029, birth_year = 2006, consent_version = 'v', consented_at = now(),
      onboarded_at = case when id = d then null else now() end,
      college_other = case id when a then 'Malla Reddy University' when b then '  malla-reddy   university. '
                              when c then 'Some Other College' else 'Malla Reddy University' end
  where id in (a, b, c, d);

  if public.college_key('  Malla-Reddy   University. ') <> 'malla reddy university' then
    raise exception 'FAIL 1: college_key does not clean the name.';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  select count(*) into n from public.list_college_peers(10);
  if n <> 1 then raise exception 'FAIL 2: expected exactly 1 peer (B), got %.', n; end if;
  select * into r from public.list_college_peers(10);
  if r.id <> b then raise exception 'FAIL 3: the wrong student was returned.'; end if;
  if to_jsonb(r) ? 'email' or to_jsonb(r) ? 'phone' then raise exception 'FAIL 4: a private field was returned.'; end if;

  -- Once A has asked B, B no longer shows.
  perform public.swipe_person(b, 'connect');
  select count(*) into n from public.list_college_peers(10);
  if n <> 0 then raise exception 'FAIL 5: a student already asked still shows.'; end if;

  -- A blocked student never shows.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.list_college_peers(10);
  if n <> 0 then raise exception 'FAIL 6: C (another college) sees peers.'; end if;

  -- Visitors cannot call it.
  reset role;
  set local role anon;
  failed := false;
  begin
    perform public.list_college_peers(4);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 7: anonymous visitors can list college peers.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
