-- Waitlist checks (D19, WAIT-1 to WAIT-3). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  res jsonb;
  first jsonb;
  second jsonb;
  stand jsonb;
  ip text := repeat('a', 64);
  n int;
  failed boolean;
begin
  -- Everything below runs as an anonymous visitor, as the landing page does.
  set local role anon;

  -- ---- Joining ---------------------------------------------------------------
  first := public.join_waitlist('First@Test.invalid', 'First Person', 1::smallint, null, 1::smallint, 2::smallint,
                                array[1]::smallint[], 'Hard to find a designer', null, 'ig', null, 'v1');
  if first ->> 'status' <> 'joined' then raise exception 'FAIL 1: a valid sign-up was refused: %', first; end if;
  if (first ->> 'code') !~ '^[a-z0-9]{8}$' then raise exception 'FAIL 2: no referral code returned.'; end if;
  if (first ->> 'position')::int < 1 then raise exception 'FAIL 3: no place in line returned.'; end if;

  res := public.join_waitlist('first@test.invalid', 'Someone Else', 1::smallint, null, null, 3::smallint,
                              '{}', null, null, null, null, 'v1');
  if res ->> 'status' <> 'already' then raise exception 'FAIL 4: the same email (any case) joined twice.'; end if;
  if res ? 'code' or res ? 'position' then raise exception 'FAIL 5: a repeat email reveals the first person''s link or place.'; end if;

  -- A friend joins with the first person's link; the first person moves up.
  second := public.join_waitlist('friend@test.invalid', 'Friend Person', null, 'Some Other College', null, 1::smallint,
                                 '{}', null, upper(first ->> 'code'), null, null, 'v1');
  if second ->> 'status' <> 'joined' then raise exception 'FAIL 6: a referred sign-up was refused.'; end if;
  stand := public.waitlist_standing(first ->> 'code');
  if (stand ->> 'referrals')::int <> 1 then raise exception 'FAIL 7: the referral was not counted.'; end if;
  if stand ? 'email' or stand ? 'name' then raise exception 'FAIL 8: standing returns personal data.'; end if;
  if public.waitlist_standing('zzzzzzzz') is not null then raise exception 'FAIL 9: an unknown code returned a standing.'; end if;

  -- ---- Validation ------------------------------------------------------------
  res := public.join_waitlist('not-an-email', 'Bad Email', 1::smallint, null, null, 2::smallint, '{}', null, null, null, null, 'v1');
  if res ->> 'status' <> 'invalid' then raise exception 'FAIL 10: a malformed email was accepted.'; end if;
  res := public.join_waitlist('nocollege@test.invalid', 'No College', null, null, null, 2::smallint, '{}', null, null, null, null, 'v1');
  if res ->> 'status' <> 'invalid' then raise exception 'FAIL 11: a sign-up without a college was accepted.'; end if;
  res := public.join_waitlist('badyear@test.invalid', 'Bad Year', 1::smallint, null, null, 9::smallint, '{}', null, null, null, null, 'v1');
  if res ->> 'status' <> 'invalid' then raise exception 'FAIL 12: year 9 was accepted.'; end if;
  res := public.join_waitlist('badrole@test.invalid', 'Bad Role', 1::smallint, null, null, 2::smallint, array[32000]::smallint[], null, null, null, null, 'v1');
  if res ->> 'status' <> 'invalid' then raise exception 'FAIL 13: an unknown role was accepted.'; end if;
  res := public.join_waitlist('noconsent@test.invalid', 'No Consent', 1::smallint, null, null, 2::smallint, '{}', null, null, null, null, '');
  if res ->> 'status' <> 'invalid' then raise exception 'FAIL 14: a sign-up without consent was accepted.'; end if;
  res := public.join_waitlist('x@test.invalid', 'X', 1::smallint, null, null, 2::smallint, '{}', null, null, null, null, 'v1');
  if res ->> 'status' <> 'invalid' then raise exception 'FAIL 15: a one-letter name was accepted.'; end if;

  -- ---- Rate limit: 5 an hour from one network ------------------------------
  for n in 1..5 loop
    res := public.join_waitlist('ip' || n || '@test.invalid', 'Same Network', 1::smallint, null, null, 2::smallint, '{}', null, null, null, ip, 'v1');
    if res ->> 'status' <> 'joined' then raise exception 'FAIL 16: sign-up % from one network was refused.', n; end if;
  end loop;
  res := public.join_waitlist('ip6@test.invalid', 'Same Network', 1::smallint, null, null, 2::smallint, '{}', null, null, null, ip, 'v1');
  if res ->> 'status' <> 'limit' then raise exception 'FAIL 17: a sixth sign-up in an hour from one network was allowed.'; end if;

  -- ---- Nothing readable directly --------------------------------------------
  failed := false;
  begin
    select count(*) into n from public.waitlist;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 18: anonymous visitors can read the waitlist table.'; end if;

  failed := false;
  begin
    insert into public.waitlist (email, name, college_id, year_of_study, referral_code, consent_version)
    values ('direct@test.invalid', 'Direct', 1, 2, 'abcdefgh', 'v1');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 19: anonymous visitors can insert into the waitlist table directly.'; end if;

  failed := false;
  begin
    perform * from public.waitlist_top_referrers;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 20: anonymous visitors can read the top-referrers view (it has emails).'; end if;

  failed := false;
  begin
    perform public.waitlist_position(gen_random_uuid());
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 21: anonymous visitors can call waitlist_position.'; end if;

  -- ---- Public numbers are aggregates only ------------------------------------
  res := public.waitlist_stats();
  if (res ->> 'total')::int < 7 then raise exception 'FAIL 22: stats total is wrong: %', res; end if;
  if res::text ilike '%@%' then raise exception 'FAIL 23: stats contain an email.'; end if;
  res := public.waitlist_options();
  if jsonb_array_length(res -> 'colleges') = 0 or jsonb_array_length(res -> 'roles') = 0 then
    raise exception 'FAIL 24: the form options are empty for visitors.';
  end if;

  -- ---- Signed-in users get no more than visitors ----------------------------
  reset role;
  set local role authenticated;
  failed := false;
  begin
    select count(*) into n from public.waitlist;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 25: signed-in users can read the waitlist table.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
