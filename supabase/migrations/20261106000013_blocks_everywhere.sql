-- D23 / MSG-5: a block also hides the two students from each other in Scout, search and requests.

drop function public.discover_people(integer);
create function public.discover_people(p_limit integer default 20)
returns table (
  id uuid, display_name text, bio text, degree public.degree, college_name text, branch_name text,
  year_of_study smallint, graduation_year smallint, skills jsonb, roles jsonb, github jsonb,
  github_verified boolean, is_demo boolean, reason text, avatar_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_my_college smallint;
begin
  select p0.college_id into v_my_college from public.profiles p0 where p0.id = v_uid;

  return query
  with comp(a, b) as (
    values
      ('frontend', 'backend'), ('frontend', 'design'), ('frontend', 'ml-ai'), ('frontend', 'product'),
      ('backend', 'design'), ('backend', 'ml-ai'), ('backend', 'devops'), ('backend', 'mobile'),
      ('ml-ai', 'data'), ('ml-ai', 'design'), ('ml-ai', 'product'), ('ml-ai', 'embedded'),
      ('mobile', 'design'), ('embedded', 'backend'), ('security', 'devops'), ('security', 'backend'),
      ('product', 'design'), ('product', 'pitch'), ('fullstack', 'design'), ('fullstack', 'ml-ai'),
      ('data', 'product'), ('pitch', 'design'), ('devops', 'ml-ai')
  ),
  cand as (
    select p.id as cid, p.display_name as cname, p.bio as cbio, p.degree as cdegree,
           coalesce(c.name, p.college_other) as ccollege, p.college_id as ccollege_id, b.name as cbranch,
           p.year_of_study as cyear, p.graduation_year as cgrad, p.linkedin_url as clinkedin,
           p.github_id as cgithub_id, p.is_demo as cdemo, p.avatar_path as cavatar,
           (select count(*) from public.profile_skills x where x.user_id = p.id) as cskill_count,
           (select count(*) from public.profile_roles x where x.user_id = p.id) as crole_count,
           (select g.contributions_total from public.github_snapshots g where g.user_id = p.id) as ccontribs
    from public.profiles p
    left join public.colleges c on c.id = p.college_id
    left join public.branches b on b.id = p.branch_id
    where p.id <> v_uid
      and p.onboarded_at is not null
      and p.status = 'active'
      and p.role = 'student'
      and not public.is_blocked_pair(v_uid, p.id)
      and not exists (
        select 1 from public.swipes s
        where s.actor_id = v_uid and s.target_id = p.id
          and (s.action = 'connect' or s.created_at > now() - interval '7 days'))
      and not exists (
        select 1 from public.connection_requests r
        where ((r.sender_id = v_uid and r.recipient_id = p.id) or (r.sender_id = p.id and r.recipient_id = v_uid))
          and (r.status = 'accepted' or (r.status = 'pending' and r.created_at > now() - interval '14 days')))
  ),
  scored as (
    select cand.*,
           (select r2.name || '|' || r1.name
            from public.profile_roles pr2
            join public.roles r2 on r2.id = pr2.role_id
            join public.profile_roles pr1 on pr1.user_id = v_uid
            join public.roles r1 on r1.id = pr1.role_id
            join comp on (comp.a = r1.slug and comp.b = r2.slug) or (comp.a = r2.slug and comp.b = r1.slug)
            where pr2.user_id = cand.cid
            limit 1) as complement_pair,
           (select h.name
            from public.hackathon_interest i1
            join public.hackathon_interest i2 on i2.hackathon_id = i1.hackathon_id and i2.user_id = cand.cid
            join public.hackathons h on h.id = i1.hackathon_id
            where i1.user_id = v_uid and h.status = 'active' and h.ends_on >= current_date
            order by h.starts_on limit 1) as shared_hackathon,
           (select count(*)
            from public.hackathon_interest i1
            join public.hackathon_interest i2 on i2.hackathon_id = i1.hackathon_id and i2.user_id = cand.cid
            join public.hackathons h on h.id = i1.hackathon_id
            where i1.user_id = v_uid and h.status = 'active' and h.ends_on >= current_date) as shared_count
    from cand
  ),
  ranked as (
    -- Ranking stays internal (D14): never described to students.
    select s.*,
           (case when s.complement_pair is not null then 3.0 else 0 end)
           + least(s.shared_count, 2) * 1.5
           + (case when s.ccollege_id is distinct from v_my_college then 0.5 else 0 end)
           + (case when s.cgithub_id is not null then 1.0 else 0 end)
           + (case when coalesce(s.ccontribs, 0) >= 200 then 0.5 else 0 end)
           + (case when s.clinkedin is not null then 0.5 else 0 end)
           + (case when char_length(coalesce(s.cbio, '')) >= 40 then 0.5 else 0 end)
           + (case when s.cskill_count >= 3 then 0.5 else 0 end)
           + (case when s.crole_count >= 1 then 0.3 else 0 end)
           + (case when s.cavatar is not null then 0.3 else 0 end)
           + random() * 1.5 as score
    from scored s
  )
  select k.cid, k.cname, k.cbio, k.cdegree, k.ccollege, k.cbranch, k.cyear, k.cgrad,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'category', t.category, 'level', t.level)
                            order by t.level_order, t.name)
           from (
             select s2.id, s2.name, s2.category, ps.level,
                    case ps.level when 'advanced' then 0 when 'intermediate' then 1 else 2 end as level_order
             from public.profile_skills ps join public.skills s2 on s2.id = ps.skill_id
             where ps.user_id = k.cid
             order by case ps.level when 'advanced' then 0 when 'intermediate' then 1 else 2 end, s2.name
             limit 6
           ) t
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.sort_order)
           from public.profile_roles pr join public.roles r on r.id = pr.role_id
           where pr.user_id = k.cid
         ), '[]'::jsonb),
         (select jsonb_build_object(
                   'login', g.login, 'public_repos', g.public_repos, 'followers', g.followers,
                   'contributions_total', g.contributions_total,
                   'top_language', g.languages -> 0 ->> 'name')
          from public.github_snapshots g where g.user_id = k.cid),
         (k.cgithub_id is not null),
         k.cdemo,
         case when k.complement_pair is not null
                then split_part(k.complement_pair, '|', 1) || ' · pairs well with your ' || split_part(k.complement_pair, '|', 2)
              when k.shared_hackathon is not null then 'Also interested in ' || k.shared_hackathon
              when k.ccollege_id is distinct from v_my_college and k.ccollege is not null then 'From ' || k.ccollege
              else 'Looking for a team' end,
         k.cavatar
  from ranked k
  order by k.score desc
  limit least(greatest(p_limit, 1), 50);
end;
$$;
revoke all on function public.discover_people(integer) from public, anon;
grant execute on function public.discover_people(integer) to authenticated;

create or replace function public.search_everything(p_query text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
  v_q text := btrim(coalesce(p_query, ''));
  v_like text;
  v_calls integer;
begin
  if char_length(v_q) < 1 or char_length(v_q) > 60 then
    return jsonb_build_object('people', '[]'::jsonb, 'teams', '[]'::jsonb);
  end if;

  insert into public.search_usage as su (user_id, window_start, calls)
  values (v_uid, now(), 1)
  on conflict (user_id) do update
    set calls = case when su.window_start < now() - interval '1 minute' then 1 else su.calls + 1 end,
        window_start = case when su.window_start < now() - interval '1 minute' then now() else su.window_start end
  returning calls into v_calls;
  if v_calls > 120 then
    return jsonb_build_object('people', '[]'::jsonb, 'teams', '[]'::jsonb, 'limited', true);
  end if;

  -- Typed % and _ are matched literally.
  v_like := replace(replace(replace(lower(v_q), '\', '\\'), '%', '\%'), '_', '\_');

  return jsonb_build_object(
    'people', coalesce((
      select jsonb_agg(to_jsonb(x) - 'rank' order by x.rank, x.name)
      from (
        select p.id, p.display_name as name, p.avatar_path, p.is_demo,
               coalesce(c.name, p.college_other) as college, b.name as branch, p.year_of_study as year,
               (select s.name from public.profile_skills ps join public.skills s on s.id = ps.skill_id
                 where ps.user_id = p.id and lower(s.name) like v_like || '%' order by s.name limit 1) as matched_skill,
               coalesce((select jsonb_agg(r.name order by r.sort_order)
                         from (select r2.name, r2.sort_order from public.profile_roles pr
                               join public.roles r2 on r2.id = pr.role_id where pr.user_id = p.id
                               order by r2.sort_order limit 2) r), '[]'::jsonb) as roles,
               case
                 when lower(p.display_name) like v_like || '%' then 0
                 when lower(p.display_name) like '% ' || v_like || '%' then 1
                 when lower(p.display_name) like '%' || v_like || '%' then 2
                 when exists (select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
                              where ps.user_id = p.id and lower(s.name) like v_like || '%') then 3
                 else 4
               end as rank
        from public.profiles p
        left join public.colleges c on c.id = p.college_id
        left join public.branches b on b.id = p.branch_id
        where p.onboarded_at is not null
          and p.status = 'active'
          and p.role = 'student'
          and p.id <> v_uid
          and not public.is_blocked_pair(v_uid, p.id)
          and (
            lower(p.display_name) like '%' || v_like || '%'
            or lower(coalesce(c.name, p.college_other, '')) like '%' || v_like || '%'
            or exists (select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
                       where ps.user_id = p.id and lower(s.name) like v_like || '%')
          )
        order by rank, p.display_name
        limit 6
      ) x
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.name)
      from (
        select tm.id, tm.name, tm.is_demo, h.name as hackathon,
               (select count(*) from public.team_members m where m.team_id = tm.id)::int as members
        from public.teams tm
        left join public.hackathons h on h.id = tm.hackathon_id
        where lower(tm.name) like '%' || v_like || '%'
        order by tm.name
        limit 3
      ) t
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.search_everything(text) from public, anon;
grant execute on function public.search_everything(text) to authenticated;

-- No requests, in either direction, between students who blocked each other.
create or replace function public.swipe_person(p_target uuid, p_action public.swipe_action)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_onboarded();
begin
  if p_target = v_uid or not exists (
    select 1 from public.profiles where id = p_target and onboarded_at is not null and status = 'active'
  ) or public.is_blocked_pair(v_uid, p_target) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  if p_action = 'skip' then
    insert into public.swipes (actor_id, target_id, action) values (v_uid, p_target, 'skip')
    on conflict (actor_id, target_id) do update set action = 'skip', created_at = now()
    where public.swipes.action = 'skip';
    return 'skipped';
  end if;

  if public.my_connects_left() <= 0 then
    return 'limit';
  end if;

  update public.connection_requests
  set status = 'expired'
  where status = 'pending' and created_at <= now() - interval '14 days'
    and least(sender_id, recipient_id) = least(v_uid, p_target)
    and greatest(sender_id, recipient_id) = greatest(v_uid, p_target);

  if exists (
    select 1 from public.connection_requests
    where status in ('pending', 'accepted')
      and least(sender_id, recipient_id) = least(v_uid, p_target)
      and greatest(sender_id, recipient_id) = greatest(v_uid, p_target)
  ) then
    return 'already';
  end if;

  insert into public.swipes (actor_id, target_id, action) values (v_uid, p_target, 'connect')
  on conflict (actor_id, target_id) do update set action = 'connect', created_at = now();

  insert into public.connection_requests (sender_id, recipient_id) values (v_uid, p_target);
  return 'sent';
exception when unique_violation then
  return 'already';
end;
$$;
