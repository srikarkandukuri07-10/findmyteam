-- Module 5 (D23): 1:1 messages between accepted connections (MSG-1, MSG-3, MSG-4, MSG-5, MSG-7).
-- Every write goes through a function; students read only their own conversations, and a block
-- cuts both people off from sending and reading.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_ordered check (user_a < user_b),
  constraint conversations_pair unique (user_a, user_b)
);
create index conversations_user_b_idx on public.conversations (user_b);

-- Each person's own state in a conversation: how far they have read, and whether it is muted.
create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default '-infinity',
  muted boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create type public.report_reason as enum ('spam', 'harassment', 'fake_profile', 'inappropriate', 'other');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True if either person has blocked the other.
create or replace function public.is_blocked_pair(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;
revoke all on function public.is_blocked_pair(uuid, uuid) from public, anon, authenticated;

-- True if the signed-in user is in this conversation and neither side has blocked the other.
create or replace function public.can_use_conversation(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation
      and (select auth.uid()) in (c.user_a, c.user_b)
      and not public.is_blocked_pair(c.user_a, c.user_b)
  );
$$;
revoke all on function public.can_use_conversation(uuid) from public, anon;
grant execute on function public.can_use_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Read access (writes are revoked; the functions below do them)
-- ---------------------------------------------------------------------------

create policy "Members read their conversations"
on public.conversations for select to authenticated
using ((select auth.uid()) in (user_a, user_b));

create policy "Members read member state of their conversations"
on public.conversation_members for select to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b)
));

create policy "Members read messages unless blocked"
on public.messages for select to authenticated
using (public.can_use_conversation(conversation_id));

create policy "Students read their own blocks"
on public.blocks for select to authenticated
using (blocker_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.conversations, public.conversation_members, public.messages,
  public.blocks, public.reports from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.conversations, public.conversation_members, public.messages, public.blocks from anon;

-- ---------------------------------------------------------------------------
-- MSG-1: open (or create) the conversation with a connection
-- ---------------------------------------------------------------------------

create or replace function public.open_conversation(p_other uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_a uuid := least(v_uid, p_other);
  v_b uuid := greatest(v_uid, p_other);
  v_id uuid;
begin
  if p_other = v_uid then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  if public.is_blocked_pair(v_uid, p_other) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.connection_requests r
    where r.status = 'accepted'
      and least(r.sender_id, r.recipient_id) = v_a and greatest(r.sender_id, r.recipient_id) = v_b
  ) then
    raise exception 'not_connected' using errcode = 'P0001';
  end if;

  select id into v_id from public.conversations where user_a = v_a and user_b = v_b;
  if v_id is null then
    insert into public.conversations (user_a, user_b) values (v_a, v_b)
    on conflict (user_a, user_b) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.conversations where user_a = v_a and user_b = v_b;
    end if;
    insert into public.conversation_members (conversation_id, user_id)
    values (v_id, v_a), (v_id, v_b)
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- MSG-3, MSG-4: send a message (text and links), mark as read, mute
-- ---------------------------------------------------------------------------

create or replace function public.send_message(p_conversation uuid, p_body text)
returns table (id bigint, created_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := public.require_onboarded();
  v_body text := btrim(coalesce(p_body, ''));
  c record;
  v_recent integer;
begin
  select * into c from public.conversations cv where cv.id = p_conversation and v_uid in (cv.user_a, cv.user_b);
  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0001';
  end if;
  if public.is_blocked_pair(c.user_a, c.user_b) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  -- Messaging needs a live connection.
  if not exists (
    select 1 from public.connection_requests r
    where r.status = 'accepted'
      and least(r.sender_id, r.recipient_id) = c.user_a and greatest(r.sender_id, r.recipient_id) = c.user_b
  ) then
    raise exception 'not_connected' using errcode = 'P0001';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  -- At most 30 messages a minute per sender, to slow spam (SAFE-3).
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

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if not public.can_use_conversation(p_conversation) then
    raise exception 'conversation_not_found' using errcode = 'P0001';
  end if;
  update public.conversation_members set last_read_at = now()
  where conversation_id = p_conversation and user_id = v_uid and last_read_at < now();
end;
$$;

create or replace function public.set_conversation_muted(p_conversation uuid, p_muted boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  update public.conversation_members set muted = coalesce(p_muted, false)
  where conversation_id = p_conversation and user_id = v_uid;
  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- MSG-5: block (ends the connection) and report
-- ---------------------------------------------------------------------------

create or replace function public.block_user(p_other uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if p_other = v_uid or not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_other) on conflict do nothing;
  -- Blocking ends the connection and any pending request between the two.
  update public.connection_requests set status = 'cancelled', responded_at = coalesce(responded_at, now())
  where status in ('pending', 'accepted')
    and least(sender_id, recipient_id) = least(v_uid, p_other)
    and greatest(sender_id, recipient_id) = greatest(v_uid, p_other);
end;
$$;

create or replace function public.report_user(p_other uuid, p_reason public.report_reason, p_details text, p_conversation uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if p_other = v_uid or not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  if p_conversation is not null and not exists (
    select 1 from public.conversations c where c.id = p_conversation and v_uid in (c.user_a, c.user_b) and p_other in (c.user_a, c.user_b)
  ) then
    raise exception 'conversation_not_found' using errcode = 'P0001';
  end if;
  -- At most 10 reports a day per student.
  if (select count(*) from public.reports where reporter_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, reported_id, conversation_id, reason, details)
  values (v_uid, p_other, p_conversation, p_reason, nullif(btrim(coalesce(p_details, '')), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- Inbox
-- ---------------------------------------------------------------------------

-- My conversations, newest first: the other person, the last message and how many I haven't read.
create or replace function public.list_conversations()
returns table (
  id uuid,
  other_id uuid,
  other_name text,
  other_avatar_path text,
  other_is_demo boolean,
  last_body text,
  last_sender_is_me boolean,
  last_at timestamptz,
  unread integer,
  muted boolean,
  blocked boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select c.id, o.id, o.display_name, o.avatar_path, o.is_demo,
         lm.body, (lm.sender_id = v_uid), coalesce(lm.created_at, c.created_at),
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id and m.sender_id <> v_uid and m.created_at > me.last_read_at),
         me.muted,
         public.is_blocked_pair(c.user_a, c.user_b)
  from public.conversations c
  join public.conversation_members me on me.conversation_id = c.id and me.user_id = v_uid
  join public.profiles o on o.id = case when c.user_a = v_uid then c.user_b else c.user_a end
  left join lateral (
    select m.body, m.sender_id, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc, m.id desc limit 1
  ) lm on not public.is_blocked_pair(c.user_a, c.user_b)
  where v_uid in (c.user_a, c.user_b)
  order by coalesce(lm.created_at, c.created_at) desc
  limit 100;
end;
$$;

-- Unread messages across my conversations, muted ones and blocked ones left out (the sidebar badge).
create or replace function public.my_unread_total()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((
    select count(*) from public.messages m
    where m.conversation_id = me.conversation_id and m.sender_id <> me.user_id and m.created_at > me.last_read_at
  )), 0)::int
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  where me.user_id = (select auth.uid()) and not me.muted and not public.is_blocked_pair(c.user_a, c.user_b);
$$;

revoke all on function public.open_conversation(uuid), public.send_message(uuid, text),
  public.mark_conversation_read(uuid), public.set_conversation_muted(uuid, boolean), public.block_user(uuid),
  public.report_user(uuid, public.report_reason, text, uuid), public.list_conversations(), public.my_unread_total()
  from public, anon;
grant execute on function public.open_conversation(uuid), public.send_message(uuid, text),
  public.mark_conversation_read(uuid), public.set_conversation_muted(uuid, boolean), public.block_user(uuid),
  public.report_user(uuid, public.report_reason, text, uuid), public.list_conversations(), public.my_unread_total()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Real time: new messages and read state arrive live (RLS still decides who sees what),
-- and typing is a private broadcast channel "typing:<conversation id>" for the two members only.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages, public.conversation_members;

create policy "Conversation members can listen for typing"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and realtime.topic() like 'typing:%'
  and public.can_use_conversation(nullif(split_part(realtime.topic(), ':', 2), '')::uuid)
);

create policy "Conversation members can send typing"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and realtime.topic() like 'typing:%'
  and public.can_use_conversation(nullif(split_part(realtime.topic(), ':', 2), '')::uuid)
);
