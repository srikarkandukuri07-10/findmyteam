-- D25: Google is the only sign-in, and students can earn a "Verified student" badge by confirming a
-- college email address with a 6-digit code. Codes are made, emailed (through Resend) and checked
-- inside the database, so no student ever sees another student's code or can mark themselves verified.

-- ---------------------------------------------------------------------------------------------
-- 1. Early access by Google account. An admin adds a Gmail address; an account without a password
--    is created for it, and the first Google sign-in with that address links to it. Sign-ups stay
--    closed in Supabase until launch, so nobody else gets an account.
-- ---------------------------------------------------------------------------------------------

drop function public.admin_grant_early_access(text, text);

create function public.admin_grant_early_access(p_email text)
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

  v_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    '', now(),
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

revoke all on function public.admin_grant_early_access(text) from public, anon;
grant execute on function public.admin_grant_early_access(text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. College email verification
-- ---------------------------------------------------------------------------------------------

-- Set only by the functions below. The badge everyone sees is "this is not null".
alter table public.profiles add column college_verified_at timestamptz;

-- Email domains students have verified with. An admin approves each real college domain once;
-- students whose domain isn't approved yet keep a confirmed address and get the badge on approval.
create table public.college_email_domains (
  domain text primary key check (domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' and char_length(domain) <= 253),
  approved boolean not null default false,
  first_seen_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null
);

-- One row per student: the confirmed address (email/domain/verified_at) and any code in flight
-- (pending_*). The address is private to its owner and never returned to anyone else.
create table public.college_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text check (char_length(email) <= 254),
  domain text,
  verified_at timestamptz,
  pending_email text check (char_length(pending_email) <= 254),
  pending_domain text,
  code_hash text,
  code_expires_at timestamptz,
  attempts smallint not null default 0,
  sends_window_start timestamptz not null default now(),
  sends smallint not null default 0,
  updated_at timestamptz not null default now()
);

-- One college address backs one account.
create unique index college_verifications_email_once on public.college_verifications (email) where email is not null;

-- Emails sent per day across everyone, to stay inside Resend's free 100 a day.
create table public.college_email_sends (
  day date primary key,
  sent integer not null default 0
);

alter table public.college_email_domains enable row level security;
alter table public.college_verifications enable row level security;
alter table public.college_email_sends enable row level security;
-- No policies: students and visitors cannot read or write these tables; the functions below do.
revoke all on public.college_email_domains, public.college_verifications, public.college_email_sends from anon, authenticated;

-- Free personal mailboxes are never a college address.
create function public.is_personal_email_domain(p_domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_domain = any (array[
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'ymail.com', 'rocketmail.com',
    'outlook.com', 'outlook.in', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
    'proton.me', 'protonmail.com', 'pm.me', 'rediffmail.com', 'aol.com', 'zoho.com', 'zohomail.in',
    'yandex.com', 'gmx.com', 'mail.com', 'tutanota.com', 'duck.com'
  ]);
$$;
revoke all on function public.is_personal_email_domain(text) from public, anon, authenticated;

-- Sends the code. Returns true when Resend accepted the email.
create function public.send_college_code(p_email text, p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_resp extensions.http_response;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then
    raise exception 'email_not_configured' using errcode = 'P0001';
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '10');
  v_resp := extensions.http((
    'POST',
    'https://api.resend.com/emails',
    array[extensions.http_header('Authorization', 'Bearer ' || v_key)],
    'application/json',
    jsonb_build_object(
      'from', 'FindMyTeam <verify@findmyteam.tech>',
      'to', jsonb_build_array(p_email),
      'subject', 'Your FindMyTeam code: ' || p_code,
      'text', 'Your FindMyTeam verification code is ' || p_code || E'.\n\n'
        || E'Enter it on FindMyTeam to get your Verified student badge. It expires in 10 minutes.\n\n'
        || 'If you didn''t ask for this, you can ignore this email.',
      'html', '<p>Your FindMyTeam verification code is</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">'
        || p_code || '</p><p>Enter it on FindMyTeam to get your Verified student badge. It expires in 10 minutes.</p>'
        || '<p style="color:#777">If you didn''t ask for this, you can ignore this email.</p>'
    )::text
  )::extensions.http_request);
  return v_resp.status between 200 and 299;
end;
$$;
revoke all on function public.send_college_code(text, text) from public, anon, authenticated;

-- Step 1: the student enters a college email; a code is emailed to it.
-- Returns 'sent' or one of: invalid_email, personal_email, already_verified, email_in_use,
-- rate_limited (3 codes an hour), daily_limit, send_failed, email_not_configured.
create function public.start_college_verification(p_email text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_domain text;
  v_row public.college_verifications;
  v_code text;
  v_sent integer;
begin
  if v_email !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$' or char_length(v_email) > 254 then
    return 'invalid_email';
  end if;
  v_domain := split_part(v_email, '@', 2);
  if public.is_personal_email_domain(v_domain) then
    return 'personal_email';
  end if;

  select * into v_row from public.college_verifications where user_id = v_uid for update;
  if v_row.email = v_email then
    return 'already_verified';
  end if;
  if exists (select 1 from public.college_verifications where email = v_email and user_id <> v_uid) then
    return 'email_in_use';
  end if;

  if v_row.user_id is not null and v_row.sends_window_start > now() - interval '1 hour' and v_row.sends >= 3 then
    return 'rate_limited';
  end if;
  select sent into v_sent from public.college_email_sends where day = current_date;
  if coalesce(v_sent, 0) >= 90 then
    return 'daily_limit';
  end if;

  v_code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  if not public.send_college_code(v_email, v_code) then
    return 'send_failed';
  end if;

  insert into public.college_email_sends (day, sent) values (current_date, 1)
  on conflict (day) do update set sent = public.college_email_sends.sent + 1;
  insert into public.college_email_domains (domain) values (v_domain) on conflict do nothing;

  insert into public.college_verifications as cv (
    user_id, pending_email, pending_domain, code_hash, code_expires_at, attempts, sends_window_start, sends, updated_at
  ) values (
    v_uid, v_email, v_domain, extensions.crypt(v_code, extensions.gen_salt('bf', 8)), now() + interval '10 minutes',
    0, now(), 1, now()
  )
  on conflict (user_id) do update set
    pending_email = excluded.pending_email,
    pending_domain = excluded.pending_domain,
    code_hash = excluded.code_hash,
    code_expires_at = excluded.code_expires_at,
    attempts = 0,
    sends_window_start = case when cv.sends_window_start > now() - interval '1 hour' then cv.sends_window_start else now() end,
    sends = case when cv.sends_window_start > now() - interval '1 hour' then cv.sends + 1 else 1 end,
    updated_at = now();
  return 'sent';
end;
$$;

-- Step 2: the student types the code. Returns 'verified' (badge on), 'pending_domain' (confirmed,
-- waiting for an admin to approve the college's domain) or one of: no_request, expired, locked,
-- wrong_code, email_in_use. Five wrong tries lock the code; a new one can be requested.
create function public.confirm_college_verification(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_row public.college_verifications;
  v_approved boolean;
begin
  select * into v_row from public.college_verifications where user_id = v_uid for update;
  if v_row.user_id is null or v_row.pending_email is null or v_row.code_hash is null then
    return 'no_request';
  end if;
  if v_row.attempts >= 5 then
    return 'locked';
  end if;
  if v_row.code_expires_at < now() then
    return 'expired';
  end if;
  if coalesce(btrim(p_code), '') !~ '^[0-9]{6}$' or extensions.crypt(btrim(p_code), v_row.code_hash) <> v_row.code_hash then
    update public.college_verifications set attempts = attempts + 1, updated_at = now() where user_id = v_uid;
    return case when v_row.attempts + 1 >= 5 then 'locked' else 'wrong_code' end;
  end if;
  if exists (select 1 from public.college_verifications where email = v_row.pending_email and user_id <> v_uid) then
    return 'email_in_use';
  end if;

  update public.college_verifications
  set email = pending_email, domain = pending_domain, verified_at = now(),
      pending_email = null, pending_domain = null, code_hash = null, code_expires_at = null, attempts = 0,
      updated_at = now()
  where user_id = v_uid;

  select approved into v_approved from public.college_email_domains where domain = v_row.pending_domain;
  update public.profiles
  set college_verified_at = case when coalesce(v_approved, false) then now() end
  where id = v_uid;
  return case when coalesce(v_approved, false) then 'verified' else 'pending_domain' end;
end;
$$;

-- The student's own verification state, for the verify page. Their own address only.
create function public.my_college_verification()
returns table (
  email text,
  verified_at timestamptz,
  domain_approved boolean,
  badge boolean,
  pending_email text,
  code_expires_at timestamptz,
  attempts_left integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select cv.email, cv.verified_at, coalesce(d.approved, false), p.college_verified_at is not null,
         cv.pending_email, cv.code_expires_at, greatest(0, 5 - cv.attempts)
  from public.profiles p
  left join public.college_verifications cv on cv.user_id = p.id
  left join public.college_email_domains d on d.domain = cv.domain
  where p.id = auth.uid();
$$;

-- Removes the student's college address and badge.
create function public.remove_college_verification()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  delete from public.college_verifications where user_id = v_uid;
  update public.profiles set college_verified_at = null where id = v_uid;
end;
$$;

-- Which of these students have the badge (for profiles, Scout and search). Public information.
create function public.college_verified_ids(p_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p
  where auth.uid() is not null and p.id = any (p_ids[1:200]) and p.college_verified_at is not null;
$$;

-- Admin: the domains students verified with, with counts only (never addresses).
create function public.admin_list_college_domains()
returns table (domain text, approved boolean, students integer, first_seen_at timestamptz, decided_at timestamptz)
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
  select d.domain, d.approved,
         (select count(*)::integer from public.college_verifications cv where cv.domain = d.domain),
         d.first_seen_at, d.decided_at
  from public.college_email_domains d
  order by d.approved, d.first_seen_at desc;
end;
$$;

-- Admin: approve (badge for everyone confirmed with it) or un-approve (badges removed) a domain.
create function public.admin_set_college_domain(p_domain text, p_approved boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_domain text := lower(btrim(coalesce(p_domain, '')));
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_domain !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' or public.is_personal_email_domain(v_domain) then
    raise exception 'invalid_domain' using errcode = '22023';
  end if;

  insert into public.college_email_domains as d (domain, approved, decided_at, decided_by)
  values (v_domain, p_approved, now(), v_uid)
  on conflict (domain) do update set approved = excluded.approved, decided_at = now(), decided_by = v_uid;

  update public.profiles p
  set college_verified_at = case when p_approved then cv.verified_at end
  from public.college_verifications cv
  where cv.user_id = p.id and cv.domain = v_domain;
end;
$$;

revoke all on function
  public.start_college_verification(text), public.confirm_college_verification(text),
  public.my_college_verification(), public.remove_college_verification(), public.college_verified_ids(uuid[]),
  public.admin_list_college_domains(), public.admin_set_college_domain(text, boolean)
from public, anon;
grant execute on function
  public.start_college_verification(text), public.confirm_college_verification(text),
  public.my_college_verification(), public.remove_college_verification(), public.college_verified_ids(uuid[]),
  public.admin_list_college_domains(), public.admin_set_college_domain(text, boolean)
to authenticated;
