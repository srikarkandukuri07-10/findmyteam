-- Scout (D22): skipped students come back after 7 days (was 30), only students appear (never admins
-- or investors), and each card carries the student's photo.

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
