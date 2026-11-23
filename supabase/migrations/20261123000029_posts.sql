-- D33: teammate posts on Home. A post can carry text, a hackathon link (with a summary read from the event page),
-- one photo, and optionally one of the poster's own teams so readers can go straight to it and ask to join.
-- No limit on the text a person sees (a hidden 20,000-character ceiling only guards the database).

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 20000),
  link_url text check (link_url is null or (char_length(link_url) <= 2000 and link_url ~* '^https?://[^\s]+$')),
  link_preview jsonb check (link_preview is null or (jsonb_typeof(link_preview) = 'object' and pg_column_size(link_preview) <= 12000)),
  image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[0-9a-z-]{8,64}\.(jpg|png|webp)$'),
  team_id uuid references public.teams (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  constraint posts_has_content check (btrim(body) <> '' or link_url is not null or image_path is not null)
);
create index posts_feed_idx on public.posts (created_at desc) where status = 'active';
create index posts_author_idx on public.posts (author_id, created_at desc);
alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to authenticated;

create policy "Students read live posts unless blocked" on public.posts
  for select to authenticated
  using (status = 'active' and expires_at > now()
         and (author_id = (select auth.uid()) or not public.is_blocked_pair(author_id, (select auth.uid()))));

-- How many hackathon links one student can have read per day (each read fetches an outside page).
create table public.post_preview_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.post_preview_usage enable row level security;
revoke all on public.post_preview_usage from anon, authenticated;

create function public.take_link_preview_quota()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_n integer;
begin
  insert into public.post_preview_usage (user_id, day, n) values (v_uid, current_date, 1)
  on conflict (user_id, day) do update set n = public.post_preview_usage.n + 1
  returning n into v_n;
  return v_n <= 40;
end;
$$;
revoke execute on function public.take_link_preview_quota from public, anon;
grant execute on function public.take_link_preview_quota to authenticated;

-- ---- Photos: one public bucket, each student writes only inside their own folder -------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Anyone can view post photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'post-images');
create policy "Students upload post photos into their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students delete post photos in their own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---- Writing ----------------------------------------------------------------------------------------
create function public.create_post(
  p_body text, p_link_url text, p_link_preview jsonb, p_image_path text, p_team_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_body text := coalesce(p_body, '');
  v_link text := nullif(btrim(coalesce(p_link_url, '')), '');
  v_image text := nullif(btrim(coalesce(p_image_path, '')), '');
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('create_post:' || v_uid::text, 0));
  if (select count(*) from public.posts where author_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if char_length(v_body) > 20000 then raise exception 'too_long' using errcode = '22023'; end if;
  if btrim(v_body) = '' and v_link is null and v_image is null then
    raise exception 'empty_post' using errcode = '22023';
  end if;
  if v_link is not null and (char_length(v_link) > 2000 or v_link !~* '^https?://[^\s]+$') then
    raise exception 'invalid_link' using errcode = '22023';
  end if;
  if v_link is null then p_link_preview := null; end if;
  if p_link_preview is not null and (jsonb_typeof(p_link_preview) <> 'object' or pg_column_size(p_link_preview) > 12000) then
    raise exception 'invalid_preview' using errcode = '22023';
  end if;
  if v_image is not null and (v_image !~ '^[0-9a-f-]{36}/[0-9a-z-]{8,64}\.(jpg|png|webp)$' or split_part(v_image, '/', 1) <> v_uid::text) then
    raise exception 'invalid_image' using errcode = '22023';
  end if;
  if p_team_id is not null and not exists (
    select 1 from public.teams t join public.team_members m on m.team_id = t.id and m.user_id = v_uid
    where t.id = p_team_id and t.status = 'active'
  ) then
    raise exception 'invalid_team' using errcode = 'P0001';
  end if;

  insert into public.posts (author_id, body, link_url, link_preview, image_path, team_id)
  values (v_uid, v_body, v_link, p_link_preview, v_image, p_team_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- The author (or an admin) removes a post; the photo path comes back so the caller can delete the file.
create function public.delete_post(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
  v_path text;
begin
  delete from public.posts
  where id = p_id and (author_id = v_uid or public.is_admin())
  returning coalesce(image_path, '') into v_path;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  return v_path;
end;
$$;

create function public.report_post(p_post uuid, p_reason public.report_reason, p_details text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
begin
  perform public.require_onboarded();
  select author_id into v_author from public.posts where id = p_post and status = 'active';
  if v_author is null then raise exception 'post_not_found' using errcode = 'P0001'; end if;
  perform public.report_user(v_author, p_reason, left('Post ' || p_post::text || ': ' || coalesce(p_details, ''), 1000), null);
end;
$$;

-- ---- Reading ----------------------------------------------------------------------------------------
create function public.list_posts(p_limit integer default 20, p_before timestamptz default null)
returns table (
  id uuid, author_id uuid, author_name text, author_avatar_path text, author_college text, author_branch text,
  author_year smallint, body text, link_url text, link_preview jsonb, image_path text, created_at timestamptz,
  is_mine boolean, connection text, team jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  return query
  select po.id, po.author_id, a.display_name, a.avatar_path, coalesce(c.name, a.college_other), b.name,
         a.year_of_study, po.body, po.link_url, po.link_preview, po.image_path, po.created_at,
         (po.author_id = v_uid),
         case
           when po.author_id = v_uid then 'self'
           when exists (select 1 from public.connection_requests r
                        where ((r.sender_id = v_uid and r.recipient_id = po.author_id) or (r.sender_id = po.author_id and r.recipient_id = v_uid))
                          and r.status = 'accepted') then 'connected'
           when exists (select 1 from public.connection_requests r
                        where ((r.sender_id = v_uid and r.recipient_id = po.author_id) or (r.sender_id = po.author_id and r.recipient_id = v_uid))
                          and r.status = 'pending' and r.created_at > now() - interval '14 days') then 'pending'
           else 'none' end,
         case when t.id is null then null else jsonb_build_object(
           'id', t.id, 'hackathon_name', t.hackathon_name, 'mode', t.mode, 'team_size', t.team_size,
           'member_count', (select count(*) from public.team_members m where m.team_id = t.id),
           'looking_for', t.looking_for, 'recruiting', (t.status = 'active' and t.recruit_status in ('open', 'partially_filled')),
           'is_member', exists (select 1 from public.team_members m where m.team_id = t.id and m.user_id = v_uid)) end
  from public.posts po
  join public.profiles a on a.id = po.author_id and a.status = 'active'
  left join public.colleges c on c.id = a.college_id
  left join public.branches b on b.id = a.branch_id
  left join public.teams t on t.id = po.team_id
  where po.status = 'active' and po.expires_at > now()
    and (po.author_id = v_uid or not public.is_blocked_pair(po.author_id, v_uid))
    and (p_before is null or po.created_at < p_before)
  order by po.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

revoke execute on function public.create_post, public.delete_post, public.report_post, public.list_posts from public, anon;
grant execute on function public.create_post, public.delete_post, public.report_post, public.list_posts to authenticated;
