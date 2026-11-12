-- D31: the founder's rule. Confirming the 6-digit code sent to a college email IS the verification:
-- the Verified student badge is given at once. No domain review. Personal email providers are still refused
-- when the code is requested (is_personal_email_domain).
do $$
declare
  d text := pg_get_functiondef('public.confirm_college_verification(text)'::regprocedure);
  old_select text := 'select approved into v_approved from public.college_email_domains where domain = v_row.pending_domain;';
begin
  if position(old_select in d) = 0 then
    raise exception 'confirm_college_verification changed; update this migration';
  end if;
  d := replace(d, old_select, 'v_approved := true;');
  execute d;
end;
$$;

-- Students who already confirmed their college email get their badge now.
update public.profiles p set college_verified_at = coalesce(v.verified_at, now())
from public.college_verifications v
where v.user_id = p.id and v.verified_at is not null and p.college_verified_at is null;
