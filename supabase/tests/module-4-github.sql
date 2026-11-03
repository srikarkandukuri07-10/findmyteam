-- GitHub connection checks. Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
-- Check 11 makes the database call api.github.com with a fake token and expects GitHub's rejection,
-- which proves outbound access works without needing a real student login.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  c uuid := '00000000-0000-4000-8000-0000000000c3';
  fixture jsonb;
  n int;
  r record;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (a, 'authenticated', 'authenticated', 'g-a@test.invalid', now()),
         (b, 'authenticated', 'authenticated', 'g-b@test.invalid', now()),
         (c, 'authenticated', 'authenticated', 'g-c@test.invalid', now());

  update public.profiles
  set display_name = 'Test User', degree = 'btech', college_id = 1, branch_id = 1, year_of_study = 2,
      graduation_year = 2029, birth_year = 2009, consent_version = 'v', consented_at = now(), onboarded_at = now()
  where id in (a, b);

  -- A has authorized GitHub (account 4242); B has not.
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), '4242', a, jsonb_build_object('sub', '4242', 'user_name', 'octo-test'), 'github', now(), now(), now());

  fixture := jsonb_build_object(
    'login', 'octo-test', 'databaseId', 4242, 'createdAt', '2019-05-01T10:00:00Z',
    'followers', jsonb_build_object('totalCount', 12),
    'repositories', jsonb_build_object('totalCount', 27),
    'topRepos', jsonb_build_object('nodes', jsonb_build_array(
      jsonb_build_object('name', 'alpha', 'description', 'A tool', 'url', 'https://github.com/octo-test/alpha',
                         'stargazerCount', 50, 'forkCount', 4, 'primaryLanguage', jsonb_build_object('name', 'Python')),
      jsonb_build_object('name', 'evil', 'description', 'x', 'url', 'https://evil.example/x',
                         'stargazerCount', 1, 'forkCount', 0, 'primaryLanguage', null))),
    'langRepos', jsonb_build_object('nodes', jsonb_build_array(
      jsonb_build_object('primaryLanguage', jsonb_build_object('name', 'Python')),
      jsonb_build_object('primaryLanguage', jsonb_build_object('name', 'Python')),
      jsonb_build_object('primaryLanguage', jsonb_build_object('name', 'Go')),
      jsonb_build_object('primaryLanguage', null))),
    'contributionsCollection', jsonb_build_object('contributionCalendar', jsonb_build_object(
      'totalContributions', 15,
      'weeks', jsonb_build_array(
        jsonb_build_object('contributionDays', jsonb_build_array(
          jsonb_build_object('date', '2026-10-25', 'contributionCount', 0, 'contributionLevel', 'NONE'),
          jsonb_build_object('date', '2026-10-26', 'contributionCount', 5, 'contributionLevel', 'FOURTH_QUARTILE'))),
        jsonb_build_object('contributionDays', jsonb_build_array(
          jsonb_build_object('date', '2026-10-27', 'contributionCount', 10, 'contributionLevel', 'FIRST_QUARTILE')))))));

  -- ---- Storing a snapshot (as the database owner, like connect_github does) -------
  perform public.store_github_snapshot(a, fixture);

  select * into r from public.github_snapshots where user_id = a;
  if r.public_repos <> 27 or r.followers <> 12 or r.contributions_total <> 15 then raise exception 'FAIL 1: snapshot numbers are wrong (% / % / %).', r.public_repos, r.followers, r.contributions_total; end if;
  if r.calendar ->> 'start' <> '2026-10-25' or jsonb_array_length(r.calendar -> 'counts') <> 3 or jsonb_array_length(r.calendar -> 'levels') <> 3 then raise exception 'FAIL 2: contribution calendar was not flattened correctly: %', r.calendar; end if;
  if jsonb_array_length(r.top_repos) <> 1 then raise exception 'FAIL 3: repos with a non-GitHub link were kept (% repos).', jsonb_array_length(r.top_repos); end if;
  if r.languages -> 0 ->> 'name' <> 'Python' or (r.languages -> 0 ->> 'repos')::int <> 2 or jsonb_array_length(r.languages) <> 2 then raise exception 'FAIL 4: languages were not counted correctly: %', r.languages; end if;
  if r.account_created_on <> date '2019-05-01' then raise exception 'FAIL 5: account creation date wrong.'; end if;

  select count(*) into n from public.profiles where id = a and github_id = 4242 and github_username = 'octo-test' and github_connected_at is not null;
  if n <> 1 then raise exception 'FAIL 6: the profile was not marked as GitHub-connected.'; end if;

  -- Storing again updates in place.
  perform public.store_github_snapshot(a, fixture);
  select count(*) into n from public.github_snapshots where user_id = a;
  if n <> 1 then raise exception 'FAIL 7: a second snapshot created % rows.', n; end if;

  -- ---- User B views A -----------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select * into r from public.get_profile(a);
  if r.github_verified is not true or r.github is null then raise exception 'FAIL 8: B cannot see A''s verified GitHub summary.'; end if;
  if (r.github ->> 'public_repos')::int <> 27 or (r.github ->> 'contributions_total')::int <> 15 then raise exception 'FAIL 9: B sees wrong GitHub numbers.'; end if;
  if to_jsonb(r) ?| array['birth_year', 'github_id', 'consent_version', 'status', 'email'] then raise exception 'FAIL 10: get_profile exposes a private field.'; end if;

  select count(*) into n from public.github_snapshots;
  if n <> 0 then raise exception 'FAIL 11a: B can read % GitHub snapshot rows directly.', n; end if;

  failed := false;
  begin
    insert into public.github_snapshots (user_id, login, public_repos, followers, contributions_total, calendar, top_repos, languages)
    values (b, 'fake', 9999, 9999, 999999, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 11b: a user could write a fake GitHub snapshot directly.'; end if;

  failed := false;
  begin
    perform public.store_github_snapshot(b, fixture);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 11c: a user could call store_github_snapshot to attach fake data.'; end if;

  failed := false;
  begin
    update public.profiles set github_id = 1, github_username = 'someone-else' where id = b;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 11d: a user could set a GitHub identity on their profile directly.'; end if;

  -- ---- connect_github guards ------------------------------------------------------
  failed := false;
  begin
    perform public.connect_github('short');
  exception when raise_exception then failed := sqlerrm = 'invalid_token';
  end;
  if not failed then raise exception 'FAIL 12: a too-short token was not rejected.'; end if;

  failed := false;
  begin
    perform public.connect_github(repeat('x', 40)); -- B never linked GitHub
  exception when raise_exception then failed := sqlerrm = 'github_not_linked';
  end;
  if not failed then raise exception 'FAIL 13: a user without a linked GitHub identity could call connect_github.'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  failed := false;
  begin
    perform public.connect_github(repeat('x', 40)); -- snapshot was written seconds ago
  exception when raise_exception then failed := sqlerrm = 'rate_limited';
  end;
  if not failed then raise exception 'FAIL 14: connect_github is not rate limited.'; end if;

  -- Age the snapshot so the call reaches GitHub, which must reject the fake token.
  reset role;
  update public.github_snapshots set synced_at = now() - interval '5 minutes' where user_id = a;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  failed := false;
  begin
    perform public.connect_github('ghp_' || repeat('x', 36));
  exception when raise_exception then failed := sqlerrm = 'github_unavailable';
  end;
  if not failed then raise exception 'FAIL 15: the database could not reach GitHub, or accepted a fake token.'; end if;

  select * into r from public.get_profile(a);
  if (r.github ->> 'public_repos')::int <> 27 then raise exception 'FAIL 16: a failed refresh damaged the stored snapshot.'; end if;

  -- ---- save_profile leaves GitHub alone; LinkedIn on its own ---------------------------
  perform public.save_profile('Asha Rao', 'Hi there', null, 2::smallint, 3::smallint, 2028::smallint, '[]'::jsonb, array[]::smallint[]);
  select * into r from public.get_profile(a);
  if r.github_username <> 'octo-test' or r.github_verified is not true then raise exception 'FAIL 17: save_profile changed the GitHub connection.'; end if;

  perform public.set_linkedin_url('https://www.linkedin.com/in/asha-rao');
  select * into r from public.get_profile(a);
  if r.linkedin_url <> 'https://www.linkedin.com/in/asha-rao' then raise exception 'FAIL 18: set_linkedin_url did not save.'; end if;

  failed := false;
  begin
    perform public.set_linkedin_url('javascript:alert(1)');
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 19: a javascript: link was accepted as LinkedIn.'; end if;

  perform public.set_linkedin_url('  ');
  select * into r from public.get_profile(a);
  if r.linkedin_url is not null then raise exception 'FAIL 20: a blank LinkedIn link did not clear the value.'; end if;

  -- ---- Disconnect ------------------------------------------------------------------
  perform public.disconnect_github();
  select count(*) into n from public.github_snapshots where user_id = a;
  select * into r from public.get_profile(a);
  if n <> 0 or r.github is not null or r.github_verified or r.github_username is not null then raise exception 'FAIL 21: disconnect left GitHub data behind.'; end if;

  -- ---- Not onboarded / anonymous -----------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.connect_github(repeat('x', 40));
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 22: a non-onboarded user could call connect_github.'; end if;

  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  failed := false;
  begin
    perform public.connect_github(repeat('x', 40));
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 23: anonymous visitors can call connect_github.'; end if;

  failed := false;
  begin
    select count(*) into n from public.github_snapshots;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 24: anonymous visitors can read github_snapshots.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
