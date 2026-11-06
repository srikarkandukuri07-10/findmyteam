-- D21: show students' photos in requests and on teams too (avatar_path added to each result).

drop function public.list_requests(text);
create function public.list_requests(p_direction text)
returns table (
  id uuid,
  status public.request_status,
  created_at timestamptz,
  responded_at timestamptz,
  note text,
  other_id uuid,
  other_name text,
  other_college text,
  other_branch text,
  other_year smallint,
  other_roles jsonb,
  other_is_demo boolean,
  other_avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if p_direction not in ('received', 'sent') then
    raise exception 'invalid_direction' using errcode = 'P0001';
  end if;

  return query
  select r.id,
         case when r.status = 'pending' and r.created_at <= now() - interval '14 days'
              then 'expired'::public.request_status else r.status end,
         r.created_at, r.responded_at, r.note,
         o.id, o.display_name, coalesce(c.name, o.college_other), b.name, o.year_of_study,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', ro.id, 'name', ro.name) order by ro.sort_order)
           from public.profile_roles pr join public.roles ro on ro.id = pr.role_id
           where pr.user_id = o.id
         ), '[]'::jsonb),
         o.is_demo,
         o.avatar_path
  from public.connection_requests r
  join public.profiles o on o.id = case when p_direction = 'received' then r.sender_id else r.recipient_id end
  left join public.colleges c on c.id = o.college_id
  left join public.branches b on b.id = o.branch_id
  where case when p_direction = 'received' then r.recipient_id else r.sender_id end = v_uid
    and o.status = 'active'
  order by (r.status = 'pending' and r.created_at > now() - interval '14 days') desc, r.created_at desc
  limit 100;
end;
$$;
revoke all on function public.list_requests(text) from public, anon;
grant execute on function public.list_requests(text) to authenticated;

create or replace function public.list_teams(p_hackathon uuid default null)
returns table (
  id uuid, name text, description text, recruit_status public.recruit_status, hackathon_id uuid,
  hackathon_name text, hackathon_starts_on date, member_count integer, members jsonb, positions jsonb, is_demo boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_onboarded();

  return query
  select t.id, t.name, t.description, t.recruit_status, t.hackathon_id, h.name, h.starts_on,
         (select count(*)::integer from public.team_members m where m.team_id = t.id),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.display_name, 'avatar_path', u.avatar_path)
                            order by m.is_owner desc, m.joined_at)
           from public.team_members m join public.profiles u on u.id = m.user_id
           where m.team_id = t.id and u.status = 'active'
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('role', r.name, 'spots', tp.spots) order by r.sort_order)
           from public.team_positions tp join public.roles r on r.id = tp.role_id
           where tp.team_id = t.id
         ), '[]'::jsonb),
         t.is_demo
  from public.teams t
  left join public.hackathons h on h.id = t.hackathon_id
  where t.recruit_status <> 'closed'
    and (p_hackathon is null or t.hackathon_id = p_hackathon)
  order by (t.recruit_status in ('open', 'partially_filled')) desc, t.created_at desc
  limit 100;
end;
$$;

create or replace function public.get_team(p_id uuid)
returns table (
  id uuid, name text, description text, idea text, recruit_status public.recruit_status, hackathon_id uuid,
  hackathon_name text, hackathon_starts_on date, hackathon_ends_on date, members jsonb, positions jsonb, is_demo boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_onboarded();

  return query
  select t.id, t.name, t.description, t.idea, t.recruit_status, t.hackathon_id, h.name, h.starts_on, h.ends_on,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', u.id, 'name', u.display_name, 'is_owner', m.is_owner, 'avatar_path', u.avatar_path,
                    'college', coalesce(c.name, u.college_other), 'year', u.year_of_study,
                    'roles', coalesce((
                      select jsonb_agg(ro.name order by ro.sort_order)
                      from public.profile_roles pr join public.roles ro on ro.id = pr.role_id
                      where pr.user_id = u.id), '[]'::jsonb))
                  order by m.is_owner desc, m.joined_at)
           from public.team_members m
           join public.profiles u on u.id = m.user_id
           left join public.colleges c on c.id = u.college_id
           where m.team_id = t.id and u.status = 'active'
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('role', r.name, 'spots', tp.spots) order by r.sort_order)
           from public.team_positions tp join public.roles r on r.id = tp.role_id
           where tp.team_id = t.id
         ), '[]'::jsonb),
         t.is_demo
  from public.teams t
  left join public.hackathons h on h.id = t.hackathon_id
  where t.id = p_id;
end;
$$;
