-- Fresh start before launch (founder's request, 2026-11-12): deletes EVERY account and all app data.
-- Keeps reference data (colleges, branches, skills, roles) and the waitlist (whose user links become null).
-- Cannot be undone. Run once against the shared project.
begin;
delete from public.teams;               -- team members, join requests and team chats cascade
delete from public.hackathons;          -- the removed Events feature; interest rows cascade
delete from auth.users;                 -- profiles and everything owned by a person cascade
commit;
