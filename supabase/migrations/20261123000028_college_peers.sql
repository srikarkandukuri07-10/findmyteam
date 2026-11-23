-- D32: "People from your college" on Home. Colleges are typed text (D26), so two students count as being from
-- the same college when their college names match after lowercasing and cleaning up spaces and punctuation.
create function public.college_key(p_name text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', ' ', 'g'));
$$;
revoke execute on function public.college_key from public, anon;
grant execute on function public.college_key to authenticated;

-- Students from my college that I could connect with: not me, not blocked, not already connected or asked.
-- Returns only what a Scout card already shows (name, photo, branch, year, college); never an email or phone.
create function public.list_college_peers(p_limit integer default 4)
returns table (id uuid, display_name text, avatar_path text, branch_name text, year_of_study smallint, college_name text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_key text;
begin
  select public.college_key(coalesce(c.name, p.college_other)) into v_key
  from public.profiles p left join public.colleges c on c.id = p.college_id
  where p.id = v_uid;
  if v_key is null or v_key = '' then return; end if;

  return query
  select p.id, p.display_name, p.avatar_path, b.name, p.year_of_study, coalesce(c.name, p.college_other)
  from public.profiles p
  left join public.colleges c on c.id = p.college_id
  left join public.branches b on b.id = p.branch_id
  where p.id <> v_uid
    and p.onboarded_at is not null
    and p.status = 'active'
    and p.role in ('student', 'admin')
    and public.college_key(coalesce(c.name, p.college_other)) = v_key
    and not public.is_blocked_pair(v_uid, p.id)
    and not exists (
      select 1 from public.connection_requests r
      where ((r.sender_id = v_uid and r.recipient_id = p.id) or (r.sender_id = p.id and r.recipient_id = v_uid))
        and (r.status = 'accepted' or (r.status = 'pending' and r.created_at > now() - interval '14 days')))
  order by (p.avatar_path is not null) desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 4), 1), 10);
end;
$$;
revoke execute on function public.list_college_peers from public, anon;
grant execute on function public.list_college_peers to authenticated;
