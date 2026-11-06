-- Early-access checks (D24). Run against a dev database.
-- Ends by raising 'ALL_TESTS_PASSED', which rolls back everything; any other error names the failed check.
do $$
declare
  adm uuid := '00000000-0000-4000-8000-0000000002a1';
  stu uuid := '00000000-0000-4000-8000-0000000002b2';
  res text;
  failed boolean;
  meta jsonb;
  n int;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at)
  values (adm, 'authenticated', 'authenticated', 'ea-admin@test.invalid', now()),
         (stu, 'authenticated', 'authenticated', 'ea-student@test.invalid', now());
  update public.profiles set role = 'admin' where id = adm;

  -- ---- Students cannot grant, list or revoke ------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', stu, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    res := public.admin_grant_early_access('ea-student@test.invalid', null);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 1: a student could grant early access.'; end if;
  failed := false;
  begin
    perform * from public.admin_list_early_access();
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 2: a student could list early access.'; end if;
  failed := false;
  begin
    update auth.users set raw_app_meta_data = '{"early_access": true}' where id = stu;
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 3: a student could write auth.users directly.'; end if;

  -- ---- Admins grant to an existing account and create a new one --------------------
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  res := public.admin_grant_early_access('  EA-Student@Test.invalid ', null);
  if res <> 'granted' then raise exception 'FAIL 4: granting an existing account returned %.', res; end if;
  reset role;
  select raw_app_meta_data into meta from auth.users where id = stu;
  if (meta ->> 'early_access')::boolean is not true then raise exception 'FAIL 5: the mark was not set.'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    res := public.admin_grant_early_access('ea-new@test.invalid', 'short');
  exception when invalid_parameter_value then failed := true;
  end;
  if not failed then raise exception 'FAIL 6: a new account with a short password was created.'; end if;
  res := public.admin_grant_early_access('ea-new@test.invalid', 'a-long-temporary-pass');
  if res <> 'created' then raise exception 'FAIL 7: creating a new account returned %.', res; end if;
  reset role;
  select count(*) into n from auth.users u join public.profiles p on p.id = u.id
  where u.email = 'ea-new@test.invalid' and (u.raw_app_meta_data ->> 'early_access')::boolean
    and u.email_confirmed_at is not null and u.encrypted_password like '$2%';
  if n <> 1 then raise exception 'FAIL 8: the new account is missing its profile, confirmation, hash or mark.'; end if;
  select count(*) into n from auth.identities i join auth.users u on u.id = i.user_id where u.email = 'ea-new@test.invalid';
  if n <> 1 then raise exception 'FAIL 9: the new account has no email identity.'; end if;

  -- ---- Revoke ---------------------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.admin_revoke_early_access(stu);
  reset role;
  select raw_app_meta_data into meta from auth.users where id = stu;
  if meta ? 'early_access' then raise exception 'FAIL 10: revoke did not remove the mark.'; end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    perform public.admin_revoke_early_access(adm);
  exception when raise_exception then failed := sqlerrm = 'cannot_revoke_admin';
  end;
  if not failed then raise exception 'FAIL 11: an admin''s access could be revoked.'; end if;

  -- ---- The list shows no emails -----------------------------------------------------------
  if exists (select 1 from public.admin_list_early_access() l where l.display_name like '%@%') then
    raise exception 'FAIL 12: the list exposes an email.';
  end if;

  -- ---- Visitors ---------------------------------------------------------------------------
  reset role;
  set local role anon;
  failed := false;
  begin
    res := public.admin_grant_early_access('x@test.invalid', 'a-long-temporary-pass');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'FAIL 13: anonymous visitors can call admin_grant_early_access.'; end if;

  reset role;
  raise exception 'ALL_TESTS_PASSED';
end;
$$;
