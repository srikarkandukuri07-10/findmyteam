-- Email-code verification checks (D27, AUTH-2). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare u uuid := '00000000-0000-4000-8000-0000000005a1'; ok boolean; meta jsonb;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at) values (u,'authenticated','authenticated','ec@test.invalid',now());
  update auth.users set raw_app_meta_data = '{}'::jsonb where id = u;
  set local role authenticated;
  -- Google and password sessions can't mark themselves verified; only a session from an email code can.
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'amr', json_build_array(json_build_object('method','oauth')))::text, true);
  ok := public.confirm_email_code();
  if ok then raise exception 'FAIL 1: a Google (oauth) session was marked verified.'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'amr', json_build_array(json_build_object('method','password')))::text, true);
  if public.confirm_email_code() then raise exception 'FAIL 2: a password session was marked verified.'; end if;
  reset role;
  select raw_app_meta_data into meta from auth.users where id = u;
  if meta ? 'email_code_verified' then raise exception 'FAIL 3: mark set without a code.'; end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'amr', json_build_array(json_build_object('method','otp')))::text, true);
  if not public.confirm_email_code() then raise exception 'FAIL 4: an email-code session was not marked.'; end if;
  reset role;
  select raw_app_meta_data into meta from auth.users where id = u;
  if (meta ->> 'email_code_verified')::boolean is not true then raise exception 'FAIL 5: mark missing.'; end if;
  set local role anon;
  begin
    perform public.confirm_email_code();
    raise exception 'FAIL 6: anon can call it.';
  exception when insufficient_privilege then null;
  end;
  reset role;
  raise exception 'ALL_TESTS_PASSED';
end $$;
