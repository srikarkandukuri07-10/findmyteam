-- D24: early access to the live site before launch. An account is let in when its app_metadata has
-- early_access = true. Only the server can write app_metadata, and the mark travels in the sign-in
-- token, so the app checks it without another query. Admins grant or revoke it here.

-- The founder.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"early_access": true}'::jsonb
where id = '448cf483-7918-4403-8ed3-ad8e8321661e';

-- Who has early access, for the admin page: names and setup state only, never emails.
create or replace function public.admin_list_early_access()
returns table (id uuid, display_name text, onboarded boolean, role public.user_role, granted_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
  select u.id, p.display_name, p.onboarded_at is not null, p.role,
         coalesce((u.raw_app_meta_data ->> 'early_access_at')::timestamptz, u.created_at)
  from auth.users u
  join public.profiles p on p.id = u.id
  where (u.raw_app_meta_data ->> 'early_access')::boolean is true
    and u.email not like '%@test.invalid'
  order by 5;
end;
$$;

-- Give someone early access. An existing account just gets the mark; otherwise a new, confirmed
-- email-and-password account is created with the temporary password the admin chose.
-- Returns 'granted' or 'created'. Sign-up stays closed for everyone else.
create or replace function public.admin_grant_early_access(p_email text, p_password text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is not null then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object('early_access', true, 'early_access_at', now()),
        updated_at = now()
    where id = v_id;
    return 'granted';
  end if;

  if char_length(coalesce(p_password, '')) < 10 or char_length(p_password) > 72 then
    raise exception 'weak_password' using errcode = '22023';
  end if;

  v_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'early_access', true, 'early_access_at', now()),
    '{}'::jsonb, now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', null, now(), now());
  return 'created';
end;
$$;

-- Take early access away (not from admins). Takes effect on their next sign-in or within the hour.
create or replace function public.admin_revoke_early_access(p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'cannot_revoke_admin' using errcode = 'P0001';
  end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'early_access' - 'early_access_at',
      updated_at = now()
  where id = p_user;
end;
$$;

revoke all on function public.admin_list_early_access(), public.admin_grant_early_access(text, text),
  public.admin_revoke_early_access(uuid) from public, anon;
grant execute on function public.admin_list_early_access(), public.admin_grant_early_access(text, text),
  public.admin_revoke_early_access(uuid) to authenticated;
