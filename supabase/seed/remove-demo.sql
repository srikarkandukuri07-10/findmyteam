-- Removes everything created by supabase/seed/demo-data.sql, and nothing else.
-- Run this before launch. Deleting the demo accounts also removes their profiles, skills, roles,
-- GitHub snapshots, swipes, requests and team memberships (those tables cascade), including any
-- requests real students sent to them.

delete from public.teams where is_demo;
delete from public.hackathons where is_demo;
delete from auth.users where email like '%@demo.fmt.invalid';

-- Check: all of these should be 0.
select (select count(*) from public.profiles where is_demo) as demo_profiles,
       (select count(*) from public.teams where is_demo) as demo_teams,
       (select count(*) from public.hackathons where is_demo) as demo_hackathons,
       (select count(*) from auth.users where email like '%@demo.fmt.invalid') as demo_accounts;
