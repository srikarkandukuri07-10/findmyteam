-- D23: stamp messages and read markers with the real clock (clock_timestamp), not the transaction start
-- (now()), so two messages are never tied and "read up to" always separates them exactly.
alter table public.messages alter column created_at set default clock_timestamp();

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
  update public.conversation_members set last_read_at = clock_timestamp()
  where conversation_id = p_conversation and user_id = v_uid;
end;
$$;
