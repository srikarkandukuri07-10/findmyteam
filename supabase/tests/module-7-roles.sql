-- Roles checks (D20). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  s uuid := '00000000-0000-4000-8000-0000000000e1';
  failed boolean;
  ok boolean;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (s, 'authenticated', 'authenticated', 'role-s@test.invalid', now());

  if (select role from public.profiles where id = s) <> 'student' then
    raise exception 'FAIL 1: a new account is not a student by default.';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);

  failed := false;
  begin
    update public.profiles set role = 'admin' where id = s;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 2: a student could make themselves admin.'; end if;

  if public.is_admin() then raise exception 'FAIL 3: is_admin() is true for a student.'; end if;

  reset role;
  update public.profiles set role = 'admin' where id = s;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  if not public.is_admin() then raise exception 'FAIL 4: is_admin() is false for an admin.'; end if;

  reset role;
  update public.profiles set status = 'suspended' where id = s;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  if public.is_admin() then raise exception 'FAIL 5: a suspended admin still counts as admin.'; end if;

  reset role;
  set local role anon;
  failed := false;
  begin
    ok := public.is_admin();
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 6: anonymous visitors can call is_admin().'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
