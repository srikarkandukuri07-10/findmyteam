-- D26 fix: "id" in the visibility check clashed with the function's output column of the same name.
create or replace function public.list_past_hackathons(p_user uuid)
returns table (id uuid, name text, year smallint, result public.hackathon_result, idea text, live_url text, demo_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_account();
begin
  if p_user <> v_uid and (
    public.is_blocked_pair(v_uid, p_user)
    or not exists (select 1 from public.profiles p where p.id = p_user and p.onboarded_at is not null and p.status = 'active')
  ) then
    return;
  end if;
  return query
  select h.id, h.name, h.year, h.result, h.idea, h.live_url, h.demo_url
  from public.past_hackathons h
  where h.user_id = p_user
  order by h.year desc, h.created_at desc;
end;
$$;
