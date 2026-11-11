-- D29 update: every new team names the hackathon's official link, shown on every team card and page.
alter table public.teams
  add column hackathon_url text
  check (hackathon_url is null or (char_length(hackathon_url) <= 300 and hackathon_url ~* '^https?://'));

drop function public.create_team(text, text, integer, text, text);
drop function public.list_teams();
drop function public.list_my_teams();
drop function public.get_team(uuid);

create function public.create_team(
  p_hackathon_name text, p_hackathon_url text, p_mode text, p_team_size integer, p_about text, p_looking_for text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_name text := regexp_replace(btrim(coalesce(p_hackathon_name, '')), '\s+', ' ', 'g');
  v_url text := btrim(coalesce(p_hackathon_url, ''));
  v_about text := btrim(coalesce(p_about, ''));
  v_looking text := btrim(coalesce(p_looking_for, ''));
  v_team uuid;
  v_conv uuid;
  v_me text;
begin
  perform pg_advisory_xact_lock(hashtextextended('create_team:' || v_uid::text, 0));
  if (select count(*) from public.teams where owner_id = v_uid and status = 'active') >= 3 then
    raise exception 'team_limit' using errcode = 'P0001';
  end if;
  if (select count(*) from public.teams where owner_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 3 and 100 then raise exception 'invalid_hackathon_name' using errcode = '22023'; end if;
  if char_length(v_url) > 300 or v_url !~* '^https?://[^\s/?#]+\.[^\s]+$' then
    raise exception 'invalid_hackathon_url' using errcode = '22023';
  end if;
  if p_mode is null or p_mode not in ('online', 'offline') then raise exception 'invalid_mode' using errcode = '22023'; end if;
  if p_team_size is null or p_team_size not between 2 and 10 then raise exception 'invalid_team_size' using errcode = '22023'; end if;
  if char_length(v_about) not between 10 and 1000 then raise exception 'invalid_about' using errcode = '22023'; end if;
  if char_length(v_looking) not between 3 and 500 then raise exception 'invalid_looking_for' using errcode = '22023'; end if;

  insert into public.teams (name, hackathon_name, hackathon_url, mode, team_size, about, looking_for, owner_id, recruit_status, status)
  values (left(v_name, 60), v_name, v_url, p_mode, p_team_size, v_about, v_looking, v_uid, 'open', 'active')
  returning id into v_team;
  insert into public.team_members (team_id, user_id, is_owner) values (v_team, v_uid, true);
  insert into public.conversations (team_id) values (v_team) returning id into v_conv;
  insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_uid);
  select display_name into v_me from public.profiles where id = v_uid;
  perform public.post_team_notice(v_team, v_uid, v_me || ' created the team');
  return v_team;
end;
$$;

create function public.list_teams()
returns table (
  id uuid, hackathon_name text, hackathon_url text, mode text, team_size integer, about text, looking_for text,
  recruit_status public.recruit_status, owner_id uuid, owner_name text, member_count integer, members jsonb,
  is_demo boolean, my_request text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select t.id, t.hackathon_name, t.hackathon_url, t.mode, t.team_size::int, t.about, t.looking_for, t.recruit_status,
         t.owner_id, o.display_name,
         (select count(*)::int from public.team_members m where m.team_id = t.id),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.display_name, 'avatar_path', u.avatar_path)
                            order by m.is_owner desc, m.joined_at)
           from public.team_members m join public.profiles u on u.id = m.user_id
           where m.team_id = t.id and u.status = 'active'
         ), '[]'::jsonb),
         t.is_demo,
         (select r.status from public.team_join_requests r
           where r.team_id = t.id and r.user_id = v_uid order by r.created_at desc limit 1),
         t.created_at
  from public.teams t
  left join public.profiles o on o.id = t.owner_id
  where t.status = 'active'
    and t.recruit_status in ('open', 'partially_filled')
    and not exists (select 1 from public.team_members m where m.team_id = t.id and m.user_id = v_uid)
    and (t.owner_id is null or not public.is_blocked_pair(v_uid, t.owner_id))
  order by t.is_demo, t.created_at desc
  limit 100;
end;
$$;

create function public.list_my_teams()
returns table (
  id uuid, hackathon_name text, hackathon_url text, mode text, team_size integer, about text, recruit_status public.recruit_status,
  status text, is_owner boolean, member_count integer, members jsonb, pending_count integer,
  conversation_id uuid, unread integer, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select t.id, t.hackathon_name, t.hackathon_url, t.mode, t.team_size::int, t.about, t.recruit_status, t.status, me.is_owner,
         (select count(*)::int from public.team_members m where m.team_id = t.id),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.display_name, 'avatar_path', u.avatar_path)
                            order by m.is_owner desc, m.joined_at)
           from public.team_members m join public.profiles u on u.id = m.user_id
           where m.team_id = t.id and u.status = 'active'
         ), '[]'::jsonb),
         (select count(*)::int from public.team_join_requests r where r.team_id = t.id and r.status = 'pending'),
         c.id,
         (select count(*)::int from public.messages msg
           where msg.conversation_id = c.id and msg.sender_id <> v_uid and msg.created_at > cm.last_read_at),
         t.created_at
  from public.team_members me
  join public.teams t on t.id = me.team_id
  left join public.conversations c on c.team_id = t.id
  left join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = v_uid
  where me.user_id = v_uid
  order by (t.status = 'active') desc, t.created_at desc;
end;
$$;

create function public.get_team(p_id uuid)
returns table (
  id uuid, hackathon_name text, hackathon_url text, mode text, team_size integer, about text, looking_for text,
  recruit_status public.recruit_status, status text, owner_id uuid, is_demo boolean, created_at timestamptz,
  members jsonb, is_member boolean, is_owner boolean, my_request text, conversation_id uuid, requests jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_member boolean := exists (select 1 from public.team_members m where m.team_id = p_id and m.user_id = v_uid);
begin
  return query
  select t.id, t.hackathon_name, t.hackathon_url, t.mode, t.team_size::int, t.about, t.looking_for, t.recruit_status, t.status,
         t.owner_id, t.is_demo, t.created_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', u.id, 'name', u.display_name, 'is_owner', m.is_owner, 'avatar_path', u.avatar_path,
                    'college', coalesce(c.name, u.college_other), 'year', u.year_of_study, 'joined_at', m.joined_at,
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
         v_member,
         (t.owner_id = v_uid),
         (select r.status from public.team_join_requests r
           where r.team_id = t.id and r.user_id = v_uid order by r.created_at desc limit 1),
         case when v_member then (select cv.id from public.conversations cv where cv.team_id = t.id) end,
         case when v_member then coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', r.id, 'user_id', u.id, 'name', u.display_name, 'avatar_path', u.avatar_path,
                    'college', coalesce(c.name, u.college_other), 'year', u.year_of_study, 'note', r.note,
                    'created_at', r.created_at,
                    'roles', coalesce((
                      select jsonb_agg(ro.name order by ro.sort_order)
                      from public.profile_roles pr join public.roles ro on ro.id = pr.role_id
                      where pr.user_id = u.id), '[]'::jsonb))
                  order by r.created_at)
           from public.team_join_requests r
           join public.profiles u on u.id = r.user_id and u.status = 'active'
           left join public.colleges c on c.id = u.college_id
           where r.team_id = t.id and r.status = 'pending'
         ), '[]'::jsonb) else '[]'::jsonb end
  from public.teams t
  where t.id = p_id and (t.owner_id is null or v_member or not public.is_blocked_pair(v_uid, t.owner_id));
end;
$$;

revoke execute on function public.create_team, public.list_teams, public.list_my_teams, public.get_team from public, anon;
grant execute on function public.create_team, public.list_teams, public.list_my_teams, public.get_team to authenticated;
