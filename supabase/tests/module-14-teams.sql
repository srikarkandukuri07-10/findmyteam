-- Teams v2 checks (D29: create, join requests, team group chat). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  lead uuid := '00000000-0000-4000-8000-0000000014a1';
  b uuid := '00000000-0000-4000-8000-0000000014b2';
  x uuid := '00000000-0000-4000-8000-0000000014c3'; -- an outsider
  team uuid;
  t2 uuid;
  conv uuid;
  req uuid;
  n int;
  r record;
  failed boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  select u, 'authenticated', 'authenticated', 'team-' || right(u::text, 3) || '@test.invalid', now()
  from unnest(array[lead, b, x]) u;
  update public.profiles
  set display_name = 'Team Person ' || right(id::text, 3), degree = 'btech', college_id = 1, branch_id = 1,
      year_of_study = 2, graduation_year = 2029, birth_year = 2006, consent_version = 'v', consented_at = now(),
      onboarded_at = now()
  where id in (lead, b, x);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true);

  -- ---- Creating ---------------------------------------------------------------------------------
  team := public.create_team('Smart India Hackathon', 'https://example.com/hack', 'offline', 2, 'An app that helps farmers price crops.', 'A designer');
  select id into conv from public.conversations where team_id = team;
  if conv is null then raise exception 'FAIL 1: the team chat was not created.'; end if;
  select * into r from public.list_conversations() where id = conv;
  if not r.is_team or r.other_name <> 'Smart India Hackathon' or r.last_kind <> 'system' then
    raise exception 'FAIL 2: the lead''s inbox does not show the team chat: %', to_jsonb(r);
  end if;

  failed := false;
  begin
    perform public.create_team('Hack', 'https://example.com/hack', 'hybrid', 4, 'Something to build here.', 'Anyone');
  exception when invalid_parameter_value then failed := sqlerrm = 'invalid_mode';
  end;
  if not failed then raise exception 'FAIL 3: a team with an unknown mode was created.'; end if;

  failed := false;
  begin
    perform public.create_team('Hack', 'javascript:alert(1)', 'online', 4, 'Something to build here.', 'Anyone');
  exception when invalid_parameter_value then failed := sqlerrm = 'invalid_hackathon_url';
  end;
  if not failed then raise exception 'FAIL 3b: a team with a non-web link was created.'; end if;
  if (select hackathon_url from public.get_team(team)) <> 'https://example.com/hack' then
    raise exception 'FAIL 3c: the hackathon link was not saved.';
  end if;

  perform public.create_team('Hack Two', 'https://example.com/hack', 'online', 4, 'Second team idea here.', 'Anyone');
  t2 := public.create_team('Hack Three', 'https://example.com/hack', 'online', 4, 'Third team idea here.', 'Anyone');
  failed := false;
  begin
    perform public.create_team('Hack Four', 'https://example.com/hack', 'online', 4, 'Fourth team idea here.', 'Anyone');
  exception when raise_exception then failed := sqlerrm = 'team_limit';
  end;
  if not failed then raise exception 'FAIL 4: a fourth active team was allowed.'; end if;

  perform public.complete_team(t2);
  perform public.create_team('Hack Four', 'https://example.com/hack', 'online', 4, 'Fourth team idea here.', 'Anyone');

  failed := false;
  begin
    insert into public.teams (name, hackathon_name, mode, team_size, about, looking_for, owner_id)
    values ('Direct', 'Direct', 'online', 4, 'direct insert', 'x', lead);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 5: a team could be inserted directly.'; end if;

  -- ---- Requests ---------------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.list_teams() where id = team) then
    raise exception 'FAIL 6: an open team is missing from browse.';
  end if;
  req := public.request_to_join(team, 'I design in Figma.');
  failed := false;
  begin
    perform public.request_to_join(team, null);
  exception when raise_exception then failed := sqlerrm = 'already_requested';
  end;
  if not failed then raise exception 'FAIL 7: a second pending request was allowed.'; end if;

  select count(*) into n from public.messages where conversation_id = conv;
  if n <> 0 then raise exception 'FAIL 8: someone outside the team can read its chat.'; end if;

  failed := false;
  begin
    perform public.decide_join_request(req, true);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 9: a requester accepted their own request.'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  select count(*) into n from public.team_join_requests where team_id = team;
  if n <> 0 then raise exception 'FAIL 10: an outsider can see join requests.'; end if;
  select * into r from public.get_team(team);
  if jsonb_array_length(r.requests) <> 0 or r.conversation_id is not null then
    raise exception 'FAIL 11: an outsider sees requests or the chat id.';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true);
  select * into r from public.get_team(team);
  if jsonb_array_length(r.requests) <> 1 or r.requests -> 0 ->> 'note' <> 'I design in Figma.' then
    raise exception 'FAIL 12: the lead does not see who asked to join.';
  end if;
  perform public.decide_join_request(req, true);

  -- ---- Accepted: in the team and its chat at once -------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select * into r from public.list_conversations() where id = conv;
  if r.id is null or r.last_body <> 'Team Person 4b2 joined the team' then
    raise exception 'FAIL 13: the new member is not in the team chat: %', to_jsonb(r);
  end if;
  perform * from public.send_message(conv, 'Hi team!');
  select * into r from public.get_team(team);
  if not r.is_member or r.recruit_status <> 'full' then
    raise exception 'FAIL 14: membership or the full status is wrong: %', to_jsonb(r);
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.request_to_join(team, null);
  exception when raise_exception then failed := sqlerrm = 'not_recruiting';
  end;
  if not failed then raise exception 'FAIL 15: a full team took a request.'; end if;
  failed := false;
  begin
    perform * from public.send_message(conv, 'let me in');
  exception when raise_exception then failed := sqlerrm = 'conversation_not_found';
  end;
  if not failed then raise exception 'FAIL 16: an outsider sent a message to the team chat.'; end if;

  -- ---- Leaving ----------------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform public.leave_team(team);
  select count(*) into n from public.messages where conversation_id = conv;
  if n <> 0 then raise exception 'FAIL 17: a member who left can still read the chat.'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true);
  select * into r from public.get_team(team);
  if r.recruit_status <> 'open' or jsonb_array_length(r.members) <> 1 then
    raise exception 'FAIL 18: leaving did not reopen the team: %', to_jsonb(r);
  end if;
  failed := false;
  begin
    perform public.leave_team(team);
  exception when raise_exception then failed := sqlerrm = 'lead_cannot_leave';
  end;
  if not failed then raise exception 'FAIL 19: the lead left their own team.'; end if;

  raise exception 'ALL_TESTS_PASSED';
end;
$$;
