-- D29: Teams v2. A student creates a team for a hackathon (up to 3 active at once), others ask to join,
-- the lead accepts or declines, and every team gets a group chat in Messages that members join on acceptance.

-- ---- Team fields ----------------------------------------------------------------------------------
alter table public.teams
  add column hackathon_name text,
  add column mode text,
  add column team_size smallint,
  add column about text,
  add column looking_for text,
  add column status text not null default 'active',
  add column completed_at timestamptz;

update public.teams t set
  hackathon_name = left(coalesce((select h.name from public.hackathons h where h.id = t.hackathon_id), t.name), 100),
  mode = 'online',
  team_size = greatest(4, (select count(*) from public.team_members m where m.team_id = t.id))::smallint,
  about = coalesce(nullif(btrim(concat_ws(E'\n\n', t.description, t.idea)), ''), 'Building something for this hackathon.'),
  looking_for = coalesce(
    (select string_agg(r.name, ', ' order by r.sort_order)
     from public.team_positions tp join public.roles r on r.id = tp.role_id where tp.team_id = t.id),
    'Anyone keen to build.');

alter table public.teams
  alter column hackathon_name set not null,
  alter column mode set not null,
  alter column team_size set not null,
  alter column about set not null,
  alter column looking_for set not null,
  add constraint teams_hackathon_name_check check (char_length(hackathon_name) between 3 and 100),
  add constraint teams_mode_check check (mode in ('online', 'offline')),
  add constraint teams_size_check check (team_size between 2 and 10),
  add constraint teams_about_check check (char_length(btrim(about)) between 1 and 1000),
  add constraint teams_looking_for_check check (char_length(btrim(looking_for)) between 1 and 500),
  add constraint teams_status_check check (status in ('active', 'completed'));

create index teams_owner_active_idx on public.teams (owner_id) where status = 'active';

-- ---- Join requests --------------------------------------------------------------------------------
create table public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null
);
create unique index team_join_requests_one_pending on public.team_join_requests (team_id, user_id) where status = 'pending';
create index team_join_requests_user_idx on public.team_join_requests (user_id);
alter table public.team_join_requests enable row level security;
revoke all on public.team_join_requests from anon, authenticated;
grant select on public.team_join_requests to authenticated;

create function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members m where m.team_id = p_team and m.user_id = (select auth.uid()));
$$;
revoke execute on function public.is_team_member from public, anon;
grant execute on function public.is_team_member to authenticated;

create policy "Requesters and team members read join requests" on public.team_join_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_team_member(team_id));

-- ---- Team conversations ---------------------------------------------------------------------------
alter table public.conversations
  alter column user_a drop not null,
  alter column user_b drop not null,
  add column team_id uuid unique references public.teams (id) on delete cascade,
  add constraint conversations_kind check (
    (team_id is null and user_a is not null and user_b is not null)
    or (team_id is not null and user_a is null and user_b is null));

alter table public.messages
  add column kind text not null default 'text' check (kind in ('text', 'system'));

create function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation and m.user_id = (select auth.uid()));
$$;
revoke execute on function public.is_conversation_member from public, anon;
grant execute on function public.is_conversation_member to authenticated;

drop policy "Members read their conversations" on public.conversations;
create policy "Members read their conversations" on public.conversations
  for select to authenticated using (public.is_conversation_member(id));

drop policy "Members read member state of their conversations" on public.conversation_members;
create policy "Members read member state of their conversations" on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id));

-- Direct chats: both people, not blocked. Team chats: anyone currently in the team's chat.
create or replace function public.can_use_conversation(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    join public.conversation_members me on me.conversation_id = c.id and me.user_id = (select auth.uid())
    where c.id = p_conversation
      and (c.team_id is not null or not public.is_blocked_pair(c.user_a, c.user_b))
  );
$$;

create or replace function public.send_message(p_conversation uuid, p_body text)
returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := public.require_onboarded();
  v_body text := btrim(coalesce(p_body, ''));
  c record;
  v_recent integer;
begin
  select cv.* into c from public.conversations cv
  where cv.id = p_conversation
    and exists (select 1 from public.conversation_members m where m.conversation_id = cv.id and m.user_id = v_uid);
  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0001';
  end if;
  if c.team_id is null then
    if public.is_blocked_pair(c.user_a, c.user_b) then
      raise exception 'blocked' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.connection_requests r
      where r.status = 'accepted'
        and least(r.sender_id, r.recipient_id) = c.user_a and greatest(r.sender_id, r.recipient_id) = c.user_b
    ) then
      raise exception 'not_connected' using errcode = 'P0001';
    end if;
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  select count(*) into v_recent from public.messages m
  where m.sender_id = v_uid and m.created_at > now() - interval '1 minute';
  if v_recent >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return query
  with ins as (
    insert into public.messages (conversation_id, sender_id, body)
    values (p_conversation, v_uid, v_body)
    returning messages.id, messages.created_at
  ), upd as (
    update public.conversations set last_message_at = (select ins.created_at from ins) where conversations.id = p_conversation
  ), seen as (
    update public.conversation_members set last_read_at = (select ins.created_at from ins)
    where conversation_id = p_conversation and user_id = v_uid
  )
  select ins.id, ins.created_at from ins;
end;
$$;

drop function public.list_conversations();
create function public.list_conversations()
returns table (
  id uuid, is_team boolean, team_id uuid, other_id uuid, other_name text, other_avatar_path text,
  other_is_demo boolean, member_count integer, last_body text, last_kind text, last_sender_name text,
  last_sender_is_me boolean, last_at timestamptz, unread integer, muted boolean, blocked boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select c.id, (c.team_id is not null), c.team_id,
         o.id, coalesce(t.hackathon_name, o.display_name), o.avatar_path, coalesce(t.is_demo, o.is_demo, false),
         (select count(*)::int from public.conversation_members cm where cm.conversation_id = c.id),
         lm.body, lm.kind, ls.display_name, (lm.sender_id = v_uid), coalesce(lm.created_at, c.created_at),
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id and m.sender_id <> v_uid and m.created_at > me.last_read_at),
         me.muted,
         (c.team_id is null and public.is_blocked_pair(c.user_a, c.user_b))
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join public.teams t on t.id = c.team_id
  left join public.profiles o on c.team_id is null and o.id = case when c.user_a = v_uid then c.user_b else c.user_a end
  left join lateral (
    select m.body, m.kind, m.sender_id, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc, m.id desc limit 1
  ) lm on c.team_id is not null or not public.is_blocked_pair(c.user_a, c.user_b)
  left join public.profiles ls on ls.id = lm.sender_id
  where me.user_id = v_uid
  order by coalesce(lm.created_at, c.created_at) desc
  limit 100;
end;
$$;
revoke execute on function public.list_conversations from public, anon;
grant execute on function public.list_conversations to authenticated;

create or replace function public.my_unread_total()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum((
    select count(*) from public.messages m
    where m.conversation_id = me.conversation_id and m.sender_id <> me.user_id and m.created_at > me.last_read_at
  )), 0)::int
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  where me.user_id = (select auth.uid()) and not me.muted
    and (c.team_id is not null or not public.is_blocked_pair(c.user_a, c.user_b));
$$;

-- ---- Internal helpers (not callable by users) -----------------------------------------------------
create function public.post_team_notice(p_team uuid, p_actor uuid, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_conv uuid;
  v_at timestamptz := clock_timestamp();
begin
  select id into v_conv from public.conversations where team_id = p_team;
  if v_conv is null then return; end if;
  insert into public.messages (conversation_id, sender_id, body, kind, created_at)
  values (v_conv, p_actor, left(p_text, 2000), 'system', v_at);
  update public.conversations set last_message_at = v_at where id = v_conv;
end;
$$;
revoke execute on function public.post_team_notice from public, anon, authenticated;

create function public.refresh_team_recruiting(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.teams t set recruit_status = (case
      when t.status = 'completed' or t.recruit_status = 'closed' then 'closed'
      when (select count(*) from public.team_members m where m.team_id = t.id) >= t.team_size then 'full'
      when (select count(*) from public.team_members m where m.team_id = t.id) > 1 then 'partially_filled'
      else 'open' end)::public.recruit_status
  where t.id = p_team;
end;
$$;
revoke execute on function public.refresh_team_recruiting from public, anon, authenticated;

-- Every existing team gets its chat, with its current members in it.
insert into public.conversations (team_id) select id from public.teams on conflict do nothing;
insert into public.conversation_members (conversation_id, user_id)
select c.id, m.user_id from public.conversations c join public.team_members m on m.team_id = c.team_id
on conflict do nothing;

-- ---- Creating a team ------------------------------------------------------------------------------
create function public.create_team(
  p_hackathon_name text, p_mode text, p_team_size integer, p_about text, p_looking_for text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_name text := regexp_replace(btrim(coalesce(p_hackathon_name, '')), '\s+', ' ', 'g');
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
  if p_mode is null or p_mode not in ('online', 'offline') then raise exception 'invalid_mode' using errcode = '22023'; end if;
  if p_team_size is null or p_team_size not between 2 and 10 then raise exception 'invalid_team_size' using errcode = '22023'; end if;
  if char_length(v_about) not between 10 and 1000 then raise exception 'invalid_about' using errcode = '22023'; end if;
  if char_length(v_looking) not between 3 and 500 then raise exception 'invalid_looking_for' using errcode = '22023'; end if;

  insert into public.teams (name, hackathon_name, mode, team_size, about, looking_for, owner_id, recruit_status, status)
  values (left(v_name, 60), v_name, p_mode, p_team_size, v_about, v_looking, v_uid, 'open', 'active')
  returning id into v_team;
  insert into public.team_members (team_id, user_id, is_owner) values (v_team, v_uid, true);
  insert into public.conversations (team_id) values (v_team) returning id into v_conv;
  insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_uid);
  select display_name into v_me from public.profiles where id = v_uid;
  perform public.post_team_notice(v_team, v_uid, v_me || ' created the team');
  return v_team;
end;
$$;

-- ---- Asking to join -------------------------------------------------------------------------------
create function public.request_to_join(p_team uuid, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  t record;
  v_id uuid;
begin
  select * into t from public.teams where id = p_team;
  if not found or public.is_blocked_pair(v_uid, t.owner_id) then
    raise exception 'team_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.team_members where team_id = p_team and user_id = v_uid) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if t.is_demo then raise exception 'sample_team' using errcode = 'P0001'; end if;
  if t.status <> 'active' or t.recruit_status not in ('open', 'partially_filled') then
    raise exception 'not_recruiting' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.team_join_requests where team_id = p_team and user_id = v_uid and status = 'pending') then
    raise exception 'already_requested' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.team_join_requests where team_id = p_team and user_id = v_uid
             and status = 'declined' and decided_at > now() - interval '7 days') then
    raise exception 'recently_declined' using errcode = 'P0001';
  end if;
  if (select count(*) from public.team_join_requests where user_id = v_uid and status = 'pending') >= 10 then
    raise exception 'too_many_requests' using errcode = 'P0001';
  end if;
  if v_note is not null and char_length(v_note) > 300 then raise exception 'invalid_note' using errcode = '22023'; end if;

  insert into public.team_join_requests (team_id, user_id, note) values (p_team, v_uid, v_note) returning id into v_id;
  return v_id;
end;
$$;

create function public.withdraw_join_request(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  update public.team_join_requests set status = 'withdrawn', decided_at = now()
  where team_id = p_team and user_id = v_uid and status = 'pending';
  if not found then raise exception 'request_not_found' using errcode = 'P0001'; end if;
end;
$$;

-- The lead accepts (the person joins the team and its chat at once) or declines.
create function public.decide_join_request(p_request uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  r record;
  t record;
  v_name text;
  v_conv uuid;
begin
  select * into r from public.team_join_requests where id = p_request;
  if not found then raise exception 'request_not_found' using errcode = 'P0001'; end if;
  select * into t from public.teams where id = r.team_id for update;
  if t.owner_id is distinct from v_uid then raise exception 'not_allowed' using errcode = '42501'; end if;
  if r.status <> 'pending' then raise exception 'request_closed' using errcode = 'P0001'; end if;

  if coalesce(p_accept, false) then
    if t.status <> 'active' then raise exception 'team_completed' using errcode = 'P0001'; end if;
    if (select count(*) from public.team_members where team_id = t.id) >= t.team_size then
      raise exception 'team_full' using errcode = 'P0001';
    end if;
    if public.is_blocked_pair(v_uid, r.user_id)
       or not exists (select 1 from public.profiles where id = r.user_id and status = 'active') then
      raise exception 'request_closed' using errcode = 'P0001';
    end if;
    insert into public.team_members (team_id, user_id, is_owner) values (t.id, r.user_id, false) on conflict do nothing;
    select id into v_conv from public.conversations where team_id = t.id;
    insert into public.conversation_members (conversation_id, user_id) values (v_conv, r.user_id) on conflict do nothing;
    select display_name into v_name from public.profiles where id = r.user_id;
    perform public.post_team_notice(t.id, r.user_id, v_name || ' joined the team');
    perform public.refresh_team_recruiting(t.id);
  end if;

  update public.team_join_requests
  set status = case when coalesce(p_accept, false) then 'accepted' else 'declined' end, decided_at = now(), decided_by = v_uid
  where id = p_request;
end;
$$;

-- ---- Managing a team ------------------------------------------------------------------------------
create function public.remove_team_member(p_team uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_name text;
begin
  if not exists (select 1 from public.teams where id = p_team and owner_id = v_uid) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_user = v_uid then raise exception 'invalid_target' using errcode = 'P0001'; end if;
  delete from public.team_members where team_id = p_team and user_id = p_user;
  if not found then raise exception 'not_a_member' using errcode = 'P0001'; end if;
  delete from public.conversation_members cm using public.conversations c
  where c.id = cm.conversation_id and c.team_id = p_team and cm.user_id = p_user;
  select display_name into v_name from public.profiles where id = p_user;
  perform public.post_team_notice(p_team, p_user, v_name || ' was removed from the team');
  perform public.refresh_team_recruiting(p_team);
end;
$$;

create function public.leave_team(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_name text;
begin
  if exists (select 1 from public.teams where id = p_team and owner_id = v_uid) then
    raise exception 'lead_cannot_leave' using errcode = 'P0001';
  end if;
  delete from public.team_members where team_id = p_team and user_id = v_uid;
  if not found then raise exception 'not_a_member' using errcode = 'P0001'; end if;
  delete from public.conversation_members cm using public.conversations c
  where c.id = cm.conversation_id and c.team_id = p_team and cm.user_id = v_uid;
  select display_name into v_name from public.profiles where id = v_uid;
  perform public.post_team_notice(p_team, v_uid, v_name || ' left the team');
  perform public.refresh_team_recruiting(p_team);
end;
$$;

create function public.set_team_recruiting(p_team uuid, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  update public.teams set recruit_status = case when coalesce(p_open, false) then 'open' else 'closed' end::public.recruit_status
  where id = p_team and owner_id = v_uid and status = 'active';
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  perform public.refresh_team_recruiting(p_team);
end;
$$;

-- Marking a team completed frees one of the lead's 3 active slots; the chat stays.
create function public.complete_team(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_name text;
begin
  update public.teams set status = 'completed', completed_at = now(), recruit_status = 'closed'
  where id = p_team and owner_id = v_uid and status = 'active';
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.team_join_requests set status = 'declined', decided_at = now(), decided_by = v_uid
  where team_id = p_team and status = 'pending';
  select display_name into v_name from public.profiles where id = v_uid;
  perform public.post_team_notice(p_team, v_uid, v_name || ' marked the team as completed');
end;
$$;

-- ---- Reading teams --------------------------------------------------------------------------------
drop function public.list_teams(uuid);
create function public.list_teams()
returns table (
  id uuid, hackathon_name text, mode text, team_size integer, about text, looking_for text,
  recruit_status public.recruit_status, owner_id uuid, owner_name text, member_count integer, members jsonb,
  is_demo boolean, my_request text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select t.id, t.hackathon_name, t.mode, t.team_size::int, t.about, t.looking_for, t.recruit_status,
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
  id uuid, hackathon_name text, mode text, team_size integer, about text, recruit_status public.recruit_status,
  status text, is_owner boolean, member_count integer, members jsonb, pending_count integer,
  conversation_id uuid, unread integer, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select t.id, t.hackathon_name, t.mode, t.team_size::int, t.about, t.recruit_status, t.status, me.is_owner,
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

create function public.list_my_join_requests()
returns table (team_id uuid, hackathon_name text, owner_name text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select r.team_id, t.hackathon_name, o.display_name, r.status, r.created_at
  from public.team_join_requests r
  join public.teams t on t.id = r.team_id
  left join public.profiles o on o.id = t.owner_id
  where r.user_id = v_uid and (r.status = 'pending' or r.created_at > now() - interval '14 days')
    and r.status <> 'withdrawn'
  order by (r.status = 'pending') desc, r.created_at desc
  limit 20;
end;
$$;

drop function public.get_team(uuid);
create function public.get_team(p_id uuid)
returns table (
  id uuid, hackathon_name text, mode text, team_size integer, about text, looking_for text,
  recruit_status public.recruit_status, status text, owner_id uuid, is_demo boolean, created_at timestamptz,
  members jsonb, is_member boolean, is_owner boolean, my_request text, conversation_id uuid, requests jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_member boolean := exists (select 1 from public.team_members m where m.team_id = p_id and m.user_id = v_uid);
begin
  return query
  select t.id, t.hackathon_name, t.mode, t.team_size::int, t.about, t.looking_for, t.recruit_status, t.status,
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

revoke execute on function
  public.create_team, public.request_to_join, public.withdraw_join_request, public.decide_join_request,
  public.remove_team_member, public.leave_team, public.set_team_recruiting, public.complete_team,
  public.list_teams, public.list_my_teams, public.list_my_join_requests, public.get_team
from public, anon;
grant execute on function
  public.create_team, public.request_to_join, public.withdraw_join_request, public.decide_join_request,
  public.remove_team_member, public.leave_team, public.set_team_recruiting, public.complete_team,
  public.list_teams, public.list_my_teams, public.list_my_join_requests, public.get_team
to authenticated;
