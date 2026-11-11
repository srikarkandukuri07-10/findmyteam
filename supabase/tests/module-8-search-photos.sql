-- Search, photos and connect-state checks (D21, SRCH-1, PROF-1). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000f1';
  b uuid := '00000000-0000-4000-8000-0000000000f2';
  adm uuid := '00000000-0000-4000-8000-0000000000f3';
  res jsonb;
  st record;
  failed boolean;
  n int;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (a, 'authenticated', 'authenticated', 'srch-a@test.invalid', now()),
         (b, 'authenticated', 'authenticated', 'srch-b@test.invalid', now()),
         (adm, 'authenticated', 'authenticated', 'srch-adm@test.invalid', now());
  update public.profiles
  set display_name = 'Zyxw Someone', degree = 'btech', college_id = 1, branch_id = 1, year_of_study = 2, graduation_year = 2029,
      birth_year = 2007, consent_version = 'v', consented_at = now(), onboarded_at = now()
  where id in (a, b, adm);
  update public.profiles set display_name = 'Zyxw Alpha' where id = a;
  update public.profiles set display_name = 'Zyxw Bravo' where id = b;
  update public.profiles set display_name = 'Zyxw Admin', role = 'admin' where id = adm;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- ---- Search ---------------------------------------------------------------
  res := public.search_everything('zyxw');
  -- D27: admins are real students too, so they are found; the searcher never finds themselves.
  if jsonb_array_length(res -> 'people') <> 2
     or not (res -> 'people') @> jsonb_build_array(jsonb_build_object('id', b::text))
     or not exists (select 1 from jsonb_array_elements(res -> 'people') e where e ->> 'id' = adm::text)
     or exists (select 1 from jsonb_array_elements(res -> 'people') e where e ->> 'id' = a::text) then
    raise exception 'FAIL 1: search should find B and the admin, not me: %', res;
  end if;
  if res::text ilike '%@%' then raise exception 'FAIL 2: search results contain an email.'; end if;
  if res -> 'people' -> 0 ? 'birth_year' then raise exception 'FAIL 3: search results contain a birth year.'; end if;
  if jsonb_array_length(public.search_everything('') -> 'people') <> 0 then raise exception 'FAIL 4: an empty search returned people.'; end if;
  if jsonb_array_length(public.search_everything('%') -> 'people') <> 0 then raise exception 'FAIL 5: "%%" matched everyone.'; end if;

  reset role;
  update public.search_usage set calls = 120, window_start = now() where user_id = a;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  if not coalesce((public.search_everything('zyxw') ->> 'limited')::boolean, false) then
    raise exception 'FAIL 6: the 121st search in a minute was not limited.';
  end if;

  -- ---- Photos ---------------------------------------------------------------
  failed := false;
  begin
    perform public.set_avatar(b::text || '/aaaaaaaaaaaa.webp');
  exception when invalid_parameter_value then failed := true;
  end;
  if not failed then raise exception 'FAIL 7: a student could point their photo at someone else''s folder.'; end if;

  perform public.set_avatar(a::text || '/aaaaaaaaaaaa.webp');
  if (select avatar_path from public.get_profile(a)) <> a::text || '/aaaaaaaaaaaa.webp' then
    raise exception 'FAIL 8: set_avatar did not save my own photo.';
  end if;

  failed := false;
  begin
    perform public.set_avatar(a::text || '/../x.webp');
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL 9: a malformed photo path was accepted.'; end if;

  failed := false;
  begin
    update public.profiles set avatar_path = null where id = a;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 10: a student could write profiles.avatar_path directly.'; end if;

  -- ---- Connect state -------------------------------------------------------
  select * into st from public.connection_state(b);
  if st.state <> 'none' then raise exception 'FAIL 11: state should start as none.'; end if;
  perform public.swipe_person(b, 'connect');
  select * into st from public.connection_state(b);
  if st.state <> 'sent' or st.request_id is null then raise exception 'FAIL 12: state should be sent after connecting.'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select * into st from public.connection_state(a);
  if st.state <> 'received' then raise exception 'FAIL 13: the other side should see received.'; end if;
  perform public.respond_request(st.request_id, true);
  select * into st from public.connection_state(a);
  if st.state <> 'connected' then raise exception 'FAIL 14: state should be connected after accepting.'; end if;

  -- ---- Visitors get nothing --------------------------------------------------
  reset role;
  set local role anon;
  failed := false;
  begin
    res := public.search_everything('zyxw');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 15: anonymous visitors can search.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
