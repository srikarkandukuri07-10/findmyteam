-- Roles (D20). Every account is a student unless the founder makes it something else.
-- Investors arrive with the pitch module; for now only 'admin' is in use (the founder).
-- Nobody can change a role from the API: profiles writes are already revoked from anon and authenticated.

create type public.user_role as enum ('student', 'investor', 'admin');

alter table public.profiles add column role public.user_role not null default 'student';

-- True when the signed-in user is an admin. For use inside policies and functions.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and status = 'active');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- The founder's account (by id, so no email is stored in the repository).
update public.profiles set role = 'admin' where id = '448cf483-7918-4403-8ed3-ad8e8321661e';
