-- Messages checks (D23, MSG-1, MSG-3, MSG-5, MSG-7). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000001a1';
  b uuid := '00000000-0000-4000-8000-0000000001b2';
  x uuid := '00000000-0000-4000-8000-0000000001c3'; -- an outsider
  conv uuid;
  conv2 uuid;
  req uuid;
  n int;
  r record;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select u, 'authenticated', 'authenticated', 'msg-' || right(u::text, 3) || '@test.invalid', now()
  from unnest(array[a, b, x]) u;
  update public.profiles
  set display_name = 'Msg Person ' || right(id::text, 3), degree = 'btech', college_id = 1, branch_id = 1,
      year_of_study = 2, graduation_year = 2029, birth_year = 2006, consent_version = 'v', consented_at = now(),
      onboarded_at = now()
  where id in (a, b, x);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- ---- MSG-1: only accepted connections can chat -----------------------------------
  failed := false;
  begin
    perform public.open_conversation(b);
  exception when raise_exception then failed := sqlerrm = 'not_connected';
  end;
  if not failed then raise exception 'FAIL 1: a conversation opened without a connection.'; end if;

  perform public.swipe_person(b, 'connect');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select id into req from public.list_requests('received') where other_id = a;
  perform public.respond_request(req, true);

  conv := public.open_conversation(a);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  conv2 := public.open_conversation(b);
  if conv is null or conv <> conv2 then raise exception 'FAIL 2: both sides should get the same conversation.'; end if;

  -- ---- Sending and reading --------------------------------------------------------------
  perform * from public.send_message(conv, '  Hi B, want to team up?  ');
  select body into r from public.messages where conversation_id = conv order by id desc limit 1;
  if r.body <> 'Hi B, want to team up?' then raise exception 'FAIL 3: the message body was not trimmed and saved.'; end if;

  failed := false;
  begin
    perform * from public.send_message(conv, '   ');
  exception when invalid_parameter_value then failed := true;
  end;
  if not failed then raise exception 'FAIL 4: an empty message was accepted.'; end if;

  failed := false;
  begin
    perform * from public.send_message(conv, repeat('x', 2001));
  exception when invalid_parameter_value then failed := true;
  end;
  if not failed then raise exception 'FAIL 5: a 2001-character message was accepted.'; end if;

  failed := false;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, a, 'direct');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 6: a message could be inserted directly.'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select * into r from public.list_conversations() where id = conv;
  if r.unread <> 1 or r.other_id <> a or r.last_body <> 'Hi B, want to team up?' then
    raise exception 'FAIL 7: B''s inbox is wrong: %', to_jsonb(r);
  end if;
  if public.my_unread_total() <> 1 then raise exception 'FAIL 8: B''s unread total should be 1.'; end if;
  perform public.mark_conversation_read(conv);
  if public.my_unread_total() <> 0 then raise exception 'FAIL 9: marking read did not clear unread.'; end if;

  perform * from public.send_message(conv, 'Yes! I do backend.');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.set_conversation_muted(conv, true);
  if public.my_unread_total() <> 0 then raise exception 'FAIL 10: a muted conversation still counts as unread.'; end if;
  perform public.set_conversation_muted(conv, false);
  if public.my_unread_total() <> 1 then raise exception 'FAIL 11: unmuting did not bring the unread count back.'; end if;

  -- ---- Outsiders see nothing ------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages where conversation_id = conv;
  if n <> 0 then raise exception 'FAIL 12: an outsider can read % messages.', n; end if;
  select count(*) into n from public.conversations where id = conv;
  if n <> 0 then raise exception 'FAIL 13: an outsider can see the conversation.'; end if;
  failed := false;
  begin
    perform * from public.send_message(conv, 'let me in');
  exception when raise_exception then failed := sqlerrm = 'conversation_not_found';
  end;
  if not failed then raise exception 'FAIL 14: an outsider could send into the conversation.'; end if;
  failed := false;
  begin
    perform public.mark_conversation_read(conv);
  exception when raise_exception then failed := true;
  end;
  if not failed then raise exception 'FAIL 15: an outsider could mark the conversation read.'; end if;

  -- ---- MSG-5: report and block ------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.report_user(b, 'spam', 'Testing a report', conv);
  failed := false;
  begin
    select count(*) into n from public.reports;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 16: students can read the reports table.'; end if;

  perform public.block_user(b);
  select state into r from public.connection_state(b);
  if r.state <> 'none' then raise exception 'FAIL 17: blocking did not end the connection (%).', r.state; end if;

  select count(*) into n from public.messages where conversation_id = conv;
  if n <> 0 then raise exception 'FAIL 18: the blocker can still read the messages.'; end if;
  failed := false;
  begin
    perform * from public.send_message(conv, 'still there?');
  exception when raise_exception then failed := sqlerrm = 'blocked';
  end;
  if not failed then raise exception 'FAIL 19: the blocker can still send.'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages where conversation_id = conv;
  if n <> 0 then raise exception 'FAIL 20: the blocked student can still read the messages.'; end if;
  failed := false;
  begin
    perform * from public.send_message(conv, 'hello?');
  exception when raise_exception then failed := sqlerrm = 'blocked';
  end;
  if not failed then raise exception 'FAIL 21: the blocked student can still send.'; end if;
  select count(*) into n from public.discover_people(50) where id = a;
  if n <> 0 then raise exception 'FAIL 22: the blocker still shows up in the blocked student''s Scout.'; end if;
  if jsonb_array_length(public.search_everything('Msg Person') -> 'people') <> 1 then
    raise exception 'FAIL 23: search should show only the outsider to the blocked student.';
  end if;
  failed := false;
  begin
    perform public.swipe_person(a, 'connect');
  exception when raise_exception then failed := sqlerrm = 'invalid_target';
  end;
  if not failed then raise exception 'FAIL 24: the blocked student could send a new request.'; end if;
  if public.my_unread_total() <> 0 then raise exception 'FAIL 25: a blocked conversation still counts as unread.'; end if;

  -- ---- Visitors ---------------------------------------------------------------------------------
  reset role;
  set local role anon;
  failed := false;
  begin
    select count(*) into n from public.messages;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 26: anonymous visitors can read messages.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
