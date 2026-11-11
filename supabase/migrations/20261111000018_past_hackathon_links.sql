-- D26 fix: the link checks used a regex repeat count above Postgres's limit of 255, so every link
-- failed. Same rule (https only, no spaces, at most 300 characters) written another way.
alter table public.past_hackathons drop constraint past_hackathons_live_url_check;
alter table public.past_hackathons drop constraint past_hackathons_demo_url_check;
alter table public.past_hackathons
  add constraint past_hackathons_live_url_check check (live_url ~* '^https://[^\s]+\.[^\s]+$' and char_length(live_url) <= 300),
  add constraint past_hackathons_demo_url_check check (demo_url ~* '^https://[^\s]+\.[^\s]+$' and char_length(demo_url) <= 300);
