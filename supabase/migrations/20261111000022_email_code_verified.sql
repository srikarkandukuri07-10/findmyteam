-- D27: every account proves its email with a one-time code once, whether it signed up by email or Google.
-- The mark lives in app_metadata (email_code_verified), which only the server can write and which travels
-- in the sign-in token, so proxy.ts can check it without a query.

-- Called right after a code is verified. It only sets the mark when the current session itself was
-- created by an email code (the token's "amr" says how the user signed in), so it can't be faked.
create function public.confirm_email_code()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_amr jsonb := coalesce(auth.jwt() -> 'amr', '[]'::jsonb);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_amr) m
    where m ->> 'method' in ('otp', 'magiclink', 'email/signup')
  ) then
    return false;
  end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('email_code_verified', true),
      updated_at = now()
  where id = v_uid;
  return true;
end;
$$;
revoke all on function public.confirm_email_code() from public, anon;
grant execute on function public.confirm_email_code() to authenticated;

-- Everyone who has an account today (the team and test accounts) counts as verified.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('email_code_verified', true);
