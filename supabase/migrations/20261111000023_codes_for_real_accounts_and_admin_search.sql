-- D27 fixes.
-- 1. The blanket "email verified" mark from migration 22 let existing real accounts skip the code. Real
--    accounts (not test or sample ones) lose the mark and their sessions are ended, so their next sign-in
--    asks for a code, once. Test and sample accounts keep the mark.
-- 2. Admins (the founder) are real students too: they now show up in search and Scout. Investors still don't.

update auth.users
set raw_app_meta_data = raw_app_meta_data - 'email_code_verified', updated_at = now()
where email not like '%@test.invalid'
  and email not like '%@fmt.test'
  and email not like '%@hackmate.test'
  and email not like '%@demo.fmt.invalid';

delete from auth.sessions
where user_id in (
  select id from auth.users
  where email not like '%@test.invalid' and email not like '%@fmt.test'
    and email not like '%@hackmate.test' and email not like '%@demo.fmt.invalid'
);

do $$
declare
  f regprocedure;
begin
  foreach f in array array['public.search_everything(text)'::regprocedure, 'public.discover_people(integer)'::regprocedure] loop
    execute replace(pg_get_functiondef(f), 'p.role = ''student''', 'p.role in (''student'', ''admin'')');
  end loop;
end;
$$;
