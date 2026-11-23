-- Teammate posts (D33). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000016a1';
  b uuid := '00000000-0000-4000-8000-0000000016b2';
  x uuid := '00000000-0000-4000-8000-0000000016c3';
  tm uuid;
  p1 uuid; p2 uuid;
  n int;
  r record;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select u, 'authenticated', 'authenticated', 'po-' || right(u::text, 3) || '@test.invalid', now() from unnest(array[a, b, x]) u;
  update public.profiles
  set display_name = 'Post Person ' || right(id::text, 3), degree = 'btech', college_id = 1, branch_id = 1,
      year_of_study = 2, graduation_year = 2029, birth_year = 2006, consent_version = 'v', consented_at = now(), onboarded_at = now()
  where id in (a, b, x);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- No limit a person would meet: a 15,000-character post goes through.
  p1 := public.create_post(repeat('teammate ', 1700), null, null, null, null);
  failed := false;
  begin perform public.create_post(repeat('x', 20001), null, null, null, null);
  exception when invalid_parameter_value then failed := sqlerrm = 'too_long'; end;
  if not failed then raise exception 'FAIL 1: the hidden ceiling did not hold.'; end if;

  -- Link and photo are optional; an empty post is not.
  failed := false;
  begin perform public.create_post('   ', null, null, null, null);
  exception when invalid_parameter_value then failed := sqlerrm = 'empty_post'; end;
  if not failed then raise exception 'FAIL 2: an empty post was accepted.'; end if;
  p2 := public.create_post('', 'https://example.com/hack', '{"name":"Example Hack"}'::jsonb, null, null);

  failed := false;
  begin perform public.create_post('x', 'javascript:alert(1)', null, null, null);
  exception when invalid_parameter_value then failed := sqlerrm = 'invalid_link'; end;
  if not failed then raise exception 'FAIL 3: a non-web link was accepted.'; end if;

  failed := false;
  begin perform public.create_post('x', null, null, b::text || '/abcdefgh1234.jpg', null);
  exception when invalid_parameter_value then failed := sqlerrm = 'invalid_image'; end;
  if not failed then raise exception 'FAIL 4: a photo path in someone else''s folder was accepted.'; end if;
  perform public.create_post('with photo', null, null, a::text || '/abcdefgh1234.jpg', null);

  -- A team can be attached only if I belong to it.
  tm := public.create_team('Post Test Hack', 'https://example.com/h', 'online', 4, 'About this hackathon here.', 'A designer');
  perform public.create_post('looking for a designer', null, null, null, tm);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  failed := false;
  begin perform public.create_post('stealing a team', null, null, null, tm);
  exception when raise_exception then failed := sqlerrm = 'invalid_team'; end;
  if not failed then raise exception 'FAIL 5: a post was attached to someone else''s team.'; end if;

  -- Five posts a day (A has made 4 so far; one more is fine, the sixth is not).
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.create_post('fifth', null, null, null, null);
  failed := false;
  begin perform public.create_post('sixth', null, null, null, null);
  exception when raise_exception then failed := sqlerrm = 'rate_limited'; end;
  if not failed then raise exception 'FAIL 6: no daily limit.'; end if;

  -- Direct writes are closed.
  failed := false;
  begin insert into public.posts (author_id, body) values (a, 'direct');
  exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL 7: a post could be inserted directly.'; end if;

  -- Reading: B sees A's posts with the team and the connection state.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.list_posts(50);
  if n <> 5 then raise exception 'FAIL 8: B should see 5 posts, got %.', n; end if;
  select * into r from public.list_posts(50) where list_posts.team is not null;
  if r.team ->> 'hackathon_name' <> 'Post Test Hack' or r.connection <> 'none' or r.is_mine then
    raise exception 'FAIL 9: the team post is wrong: %', to_jsonb(r);
  end if;
  select * into r from public.list_posts(50) where link_url is not null;
  if r.link_preview ->> 'name' <> 'Example Hack' then raise exception 'FAIL 10: the link preview was lost.'; end if;

  -- Only the author deletes.
  failed := false;
  begin perform public.delete_post(p1);
  exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL 11: another student deleted a post.'; end if;

  -- Reporting reaches the reports table through report_user.
  perform public.report_post(p2, 'spam', 'test');

  -- A block hides posts both ways.
  perform public.block_user(a);
  select count(*) into n from public.list_posts(50);
  if n <> 0 then raise exception 'FAIL 12: a blocked author''s posts still show.'; end if;

  -- Expired posts are hidden.
  reset role;
  update public.posts set expires_at = now() - interval '1 minute' where author_id = a;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  select count(*) into n from public.list_posts(50);
  if n <> 0 then raise exception 'FAIL 13: expired posts show.'; end if;

  -- The author deletes their own and gets the photo path back.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  if public.delete_post(p1) is null then raise exception 'FAIL 14: delete did not return.'; end if;

  -- Preview quota: 40 a day, the 41st is refused.
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  for i in 1..40 loop
    if not public.take_link_preview_quota() then raise exception 'FAIL 15: quota refused read %.', i; end if;
  end loop;
  if public.take_link_preview_quota() then raise exception 'FAIL 16: quota did not stop at 40.'; end if;

  -- Visitors.
  reset role;
  set local role anon;
  failed := false;
  begin perform public.list_posts(5);
  exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL 17: anonymous visitors can read posts.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
