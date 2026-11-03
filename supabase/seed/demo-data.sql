-- DEMO DATA: 50 fictional students, 4 sample hackathons and 12 sample teams, so discovery, requests
-- and teams can be tried out. Everything is flagged (is_demo / @demo.fmt.invalid emails) and can be
-- removed in one go with supabase/seed/remove-demo.sql. None of these people exist; they cannot log in.
-- Safe to run twice: it does nothing if demo data is already there.

do $$
declare
  first_names text[] := array[
    'Aarav','Vivaan','Aditya','Ishaan','Arjun','Reyansh','Krishna','Rohan','Karthik','Sai',
    'Ananya','Diya','Aanya','Saanvi','Ira','Meera','Nisha','Kavya','Priya','Riya',
    'Sneha','Pooja','Neha','Tanvi','Lakshmi','Harsha','Vikram','Rahul','Nikhil','Siddharth',
    'Manish','Varun','Ayesha','Fatima','Zoya','Imran','Farhan','Sameer','Tejas','Yash',
    'Devansh','Pranav','Ritika','Shruti','Bhavya','Charan','Mohit','Naveen','Teja','Divya'];
  last_names text[] := array[
    'Sharma','Reddy','Rao','Naidu','Patel','Iyer','Nair','Gupta','Singh','Kumar',
    'Khan','Das','Joshi','Mehta','Verma','Chowdary','Pillai','Menon','Bhat','Shetty',
    'Yadav','Ali','Shaikh','Prasad','Varma'];

  arch jsonb := $json$[
   {"n":8,"roles":["ml-ai","data"],"branches":["cse-aiml","cse","ai-ds","cse-ds","it"],
    "skills":["python","ml","deep-learning","pytorch","tensorflow","opencv","computer-vision","nlp","llm-apps","scikit-learn","data-analysis","git"],
    "langs":["Python","Jupyter Notebook"],
    "repos":[["vision-lab","Real-time object detection demos built for hackathons","Python"],["feedback-nlp","Small NLP tool that sorts student feedback by topic","Python"],["notebooks","Course experiments and mini projects","Jupyter Notebook"]],
    "bios":["Building computer vision and NLP projects. Looking for a team that ships a working demo, not just slides.","Second-year ML enthusiast. Love training small models and turning them into usable apps.","Into deep learning and LLM apps. Hackathon regular who enjoys the last-night debugging."]},
   {"n":6,"roles":["frontend","design"],"branches":["cse","it","cse-aiml"],
    "skills":["javascript","typescript","react","nextjs","html-css","figma","git","ui-ux"],
    "langs":["TypeScript","JavaScript","CSS"],
    "repos":[["portfolio-site","Personal site with smooth page transitions","TypeScript"],["ui-kit","A small component library with accessible defaults","TypeScript"],["weather-app","Clean weather dashboard built with React","JavaScript"]],
    "bios":["Frontend developer who sweats the details: animations, accessibility and fast load times.","React and TypeScript person. I turn Figma designs into pixel-perfect interfaces quickly.","Love building clean UIs. Looking for a strong backend partner for the next hackathon."]},
   {"n":6,"roles":["backend","devops"],"branches":["cse","it"],
    "skills":["python","java","nodejs","sql","django","flask","fastapi","spring-boot","docker","aws","git","linux"],
    "langs":["Python","Java"],
    "repos":[["api-starter","Opinionated REST API starter with auth and tests","Python"],["queue-worker","Background job runner with retries","Java"],["db-playground","SQL practice problems with solutions","Python"]],
    "bios":["Backend developer focused on APIs, databases and making things not fall over at demo time.","Python and Java services, SQL, and a growing love for cloud deployments.","I like designing clean REST APIs and automating everything else."]},
   {"n":5,"roles":["fullstack"],"branches":["cse","it"],
    "skills":["javascript","typescript","react","nextjs","nodejs","sql","docker","git","html-css"],
    "langs":["TypeScript","JavaScript"],
    "repos":[["campus-board","Notice board app for a college club","TypeScript"],["expense-split","Split expenses with friends, built in a weekend","TypeScript"],["quiz-live","Live quiz game with realtime scores","JavaScript"]],
    "bios":["Full-stack builder comfortable from database to button. Fast prototyper.","Next.js and Node.js all day. I like owning a feature end to end.","Ship first, polish later. Looking for a designer and an ML teammate."]},
   {"n":3,"roles":["mobile"],"branches":["cse","it"],
    "skills":["kotlin","android","flutter","dart","java","swift","git","figma"],
    "langs":["Kotlin","Dart"],
    "repos":[["bus-tracker","Android app that shows live campus bus timings","Kotlin"],["habit-flow","Flutter habit tracker with gentle reminders","Dart"],["notes-offline","Offline-first notes app","Kotlin"]],
    "bios":["Android and Flutter developer. Built a few campus apps people actually use.","Mobile-first thinker who cares about smooth animations and offline support.","Kotlin and Flutter. Always up for a health-tech or campus-life idea."]},
   {"n":4,"roles":["data","ml-ai"],"branches":["cse-ds","ai-ds","cse"],
    "skills":["python","sql","data-analysis","ml","scikit-learn","matlab","git"],
    "langs":["Python","Jupyter Notebook","R"],
    "repos":[["covid-dashboard","Interactive dashboard from public health data","Python"],["sales-forecast","Forecasting experiments with simple models","Jupyter Notebook"],["sql-stories","Data stories told with SQL","Python"]],
    "bios":["Data analyst who turns messy datasets into clear stories and dashboards.","SQL, Python and plenty of coffee. Interested in analytics-heavy hackathon problems.","Statistics-minded student who enjoys modelling and explaining results to non-technical judges."]},
   {"n":3,"roles":["devops","backend"],"branches":["cse","it","cse-cyber"],
    "skills":["docker","kubernetes","aws","linux","git","go","python","cybersecurity"],
    "langs":["Go","Shell","Python"],
    "repos":[["deploy-recipes","Docker and CI recipes for small projects","Shell"],["uptime-bot","Tiny uptime monitor with chat alerts","Go"],["infra-notes","Notes from learning Kubernetes","Python"]],
    "bios":["DevOps and cloud enthusiast. Docker, CI pipelines and keeping deployments boring.","Linux person who loves automation. I make sure your demo stays online.","Infrastructure nerd. Happy to own deployment, monitoring and security basics."]},
   {"n":3,"roles":["security"],"branches":["cse-cyber","cse","it"],
    "skills":["cybersecurity","linux","python","c","cpp","git","docker"],
    "langs":["Python","C"],
    "repos":[["ctf-writeups","Write-ups from beginner CTF challenges","Python"],["port-scan-lab","Teaching tool for understanding network scans","Python"],["secure-login","Reference login flow with safe defaults","Python"]],
    "bios":["Cybersecurity student. CTF player who likes breaking things safely and fixing them.","Security-minded developer: threat modelling, auth flows and secure defaults.","Interested in privacy-first products and responsible disclosure."]},
   {"n":4,"roles":["embedded"],"branches":["ece","eee","mech","aero"],
    "skills":["arduino","raspberry-pi","iot","embedded-c","verilog","pcb","c","cpp","matlab","cad"],
    "langs":["C","C++","Python"],
    "repos":[["smart-plant","Soil sensor that tells you when to water","C++"],["pi-weather","Raspberry Pi weather station with a web view","Python"],["fpga-basics","Verilog exercises for beginners","Verilog"]],
    "bios":["Embedded and IoT tinkerer. Arduino, Raspberry Pi and sensors for smart-campus ideas.","ECE student who enjoys hardware hackathons and PCB design.","I connect sensors to the cloud and make dashboards for them."]},
   {"n":4,"roles":["design"],"branches":["cse","it","ece"],
    "skills":["ui-ux","figma","html-css","technical-writing","video-editing","pitching"],
    "langs":["CSS"],
    "repos":[["design-system","A tiny design system with usage notes","CSS"],["case-studies","UX case studies written up","CSS"],["motion-sketches","Small animation experiments","CSS"]],
    "bios":["UI/UX designer. Research, wireframes and polished Figma prototypes in a weekend.","Visual designer who loves clean systems and good motion.","Design thinking plus a bit of frontend. I make demos look like products."]},
   {"n":4,"roles":["product","pitch"],"branches":["mech","civil","chem","cse","it"],
    "skills":["product-mgmt","business-strategy","pitching","market-research","marketing","leadership","project-mgmt","technical-writing"],
    "langs":["Markdown"],
    "repos":[["pitch-decks","Pitch deck templates for student teams","Markdown"],["user-interviews","Interview guides and findings","Markdown"],["launch-plans","Simple go-to-market plans","Markdown"]],
    "bios":["Product and pitching lead. I turn ideas into clear problem statements and judge-ready stories.","Business-minded engineering student who enjoys market research and presenting; looking for builders.","I handle planning, user interviews and the final pitch so the team can build."]}
  ]$json$::jsonb;

  hack_names text[] := array['Campus Innovate 2027 (sample)', 'HealthTech Sprint 2027 (sample)', 'GreenCode Jam 2027 (sample)', 'FinTech Forge 2027 (sample)'];
  hack_ids uuid[] := '{}';

  teams jsonb := $json$[
   {"name":"Team Nexus","hack":1,"members":[1,9,15],"open":[["design",1]],"desc":"Three students from different colleges building something practical for campus life.","idea":"A campus helpdesk assistant that answers common questions and routes tickets to the right office."},
   {"name":"Pixel Pirates","hack":1,"members":[10,43,47],"open":[["backend",1]],"desc":"Design-led team that wants a strong backend partner.","idea":"A study-group finder that matches students by course, schedule and learning style."},
   {"name":"Circuit Breakers","hack":1,"members":[39,29],"open":[["ml-ai",1],["mobile",1]],"desc":"Hardware plus data. We need someone for ML and someone for a mobile app.","idea":"A low-cost energy monitor for hostel rooms with weekly savings tips."},
   {"name":"NeuralNomads","hack":2,"members":[2,16,44],"open":[["frontend",1]],"desc":"ML, backend and design already covered. Looking for a frontend developer.","idea":"A symptom-checker that explains results in plain language and suggests when to see a doctor."},
   {"name":"Code Cartel","hack":2,"members":[21,36,30],"open":[],"desc":"Full team with a security focus.","idea":"A privacy-first health records vault that students can share with campus clinics."},
   {"name":"Aurora Labs","hack":2,"members":[3,26,48],"open":[["backend",1]],"desc":"ML, mobile and product. We are missing someone to own the backend.","idea":"A medication reminder app that learns daily routines."},
   {"name":"GreenStack","hack":3,"members":[33,11,45,40],"open":[],"desc":"Full team of four. Cloud, frontend, design and IoT.","idea":"A carbon footprint tracker for college events."},
   {"name":"Quantum Quokkas","hack":3,"members":[4,17,31],"open":[["product",1]],"desc":"Technical trio looking for a product and pitch lead.","idea":"Route planner that suggests the lowest-emission way to get across the city."},
   {"name":"ByteBenders","hack":3,"members":[22,5],"open":[["design",1],["security",1]],"desc":"Two builders who need a designer and a security-minded teammate.","idea":"A marketplace to lend and borrow lab equipment between colleges."},
   {"name":"Delta Dynamics","hack":4,"members":[18,12,37],"open":[["ml-ai",1]],"desc":"Backend, frontend and security. Looking for an ML engineer.","idea":"Spending insights for students that flag unusual charges."},
   {"name":"Sprint Squad","hack":4,"members":[23,6,49],"open":[["devops",1]],"desc":"Full-stack, ML and product. Want a DevOps teammate to keep the demo online.","idea":"Split bills and track shared expenses for hostel groups."},
   {"name":"Hackstreet Boys","hack":4,"members":[27,41,7,50],"open":[],"desc":"Full team. Mobile, embedded, ML and product.","idea":"A tap-to-pay wallet for campus canteens."}
  ]$json$::jsonb;

  n_users constant int := 50;
  uids uuid[] := '{}';
  uid uuid;
  a jsonb;
  cum int; idx int;
  i int; j int; k int;
  arch_i int;
  roles_arr text[];
  skill_pool text[];
  picked text[];
  v_year int; v_birth int; v_college int; v_branch_slug text; v_bio text;
  v_github boolean; v_login text; v_skip numeric; v_max numeric;
  cal jsonb; repos jsonb; langnodes jsonb;
  t jsonb; v_team_id uuid; owner_uid uuid;
  real_user record; demo_pick uuid[];
  notes text[] := array['Hi! Your profile looks like a great fit for what we are building.', 'Saw your projects and would love to team up for the next hackathon.', 'Hello! Are you free to team up for a hackathon next month?', null];
begin
  if exists (select 1 from public.profiles where is_demo) then
    raise notice 'Demo data is already present; nothing to do.';
    return;
  end if;

  perform setseed(0.37);

  -- Sample hackathons (obviously fictional, flagged as demo).
  for i in 1..4 loop
    insert into public.hackathons (name, organizer, mode, city, starts_on, ends_on, is_demo)
    values (hack_names[i], 'Sample organizer', (array['in_person','online','hybrid','hybrid'])[i]::public.hackathon_mode,
            case when i = 1 then 'Hyderabad' else null end,
            date '2027-02-05' + (i - 1) * 21, date '2027-02-07' + (i - 1) * 21, true)
    returning id into uid;
    hack_ids := hack_ids || uid;
  end loop;

  -- Students.
  idx := 0; cum := 0; arch_i := 0;
  for i in 1..n_users loop
    -- which archetype this student belongs to (counts add up to 50)
    if i > cum then
      arch_i := arch_i + 1;
      a := arch -> (arch_i - 1);
      cum := cum + (a ->> 'n')::int;
    end if;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      format('fmt.demo.%s@demo.fmt.invalid', lpad(i::text, 2, '0')), '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now() - make_interval(days => (random() * 20)::int), now(),
      '', '', '', '', '', '', '', ''
    ) returning id into uid;
    uids := uids || uid;

    v_year := 1 + floor(random() * 4)::int;
    v_birth := 2009 - v_year - (case when random() < 0.25 then 1 else 0 end);
    v_college := 1 + floor(random() * 25)::int;
    v_branch_slug := (a -> 'branches' ->> floor(random() * jsonb_array_length(a -> 'branches'))::int);
    v_bio := case when i % 10 = 0 then null else (a -> 'bios' ->> floor(random() * 3)::int) end;

    update public.profiles p
    set display_name = first_names[i] || ' ' || last_names[((i * 7) % 25) + 1],
        degree = (case when random() < 0.8 then 'btech' else 'be' end)::public.degree,
        college_id = v_college,
        branch_id = (select b.id from public.branches b where b.slug = v_branch_slug),
        year_of_study = v_year,
        graduation_year = 2031 - v_year,
        birth_year = v_birth,
        consent_version = 'demo', consented_at = now(), onboarded_at = now(),
        bio = v_bio,
        linkedin_url = case when random() < 0.45 then format('https://www.linkedin.com/in/fmt-demo-user-%s', lpad(i::text, 2, '0')) end,
        is_demo = true
    where p.id = uid;

    -- roles: the first is always given, the others sometimes
    roles_arr := array(select jsonb_array_elements_text(a -> 'roles'));
    insert into public.profile_roles (user_id, role_id)
    select uid, r.id from public.roles r
    where r.slug = roles_arr[1] or (r.slug = any (roles_arr[2:]) and random() < 0.35);

    -- skills: 4 to 8 from the pool, with mixed levels
    skill_pool := array(select jsonb_array_elements_text(a -> 'skills'));
    picked := array(select s from unnest(skill_pool) s order by random() limit 4 + floor(random() * 5)::int);
    insert into public.profile_skills (user_id, skill_id, level)
    select uid, sk.id,
           (case when random() < 0.25 then 'beginner' when random() < 0.6 then 'intermediate' else 'advanced' end)::public.skill_level
    from public.skills sk where sk.slug = any (picked);

    -- hackathon interest: one or two of the sample hackathons
    insert into public.hackathon_interest (user_id, hackathon_id)
    select uid, h from (select unnest(hack_ids) h order by random() limit 1 + floor(random() * 2)::int) q;

    -- GitHub: most builders have connected it, few non-coders do
    v_github := case when (a -> 'roles' ->> 0) in ('design', 'product') then random() < 0.25 else random() < 0.75 end;
    if v_github then
      v_login := 'fmt-demo-' || lpad(i::text, 2, '0');
      v_skip := 0.25 + random() * 0.5;   -- share of quiet days
      v_max := 4 + random() * 14;        -- busiest days

      with params as (
        select ((current_date - 364) - extract(dow from (current_date - 364))::int) as s
      ), days as (
        select p.s + g as d, g, case when random() < v_skip then 0 else (random() * v_max)::int end as c
        from params p, generate_series(0, current_date - (select s from params)) g
      ), levelled as (
        select d, g, c, case when c = 0 then 'NONE' when c <= 2 then 'FIRST_QUARTILE' when c <= 5 then 'SECOND_QUARTILE'
                             when c <= 9 then 'THIRD_QUARTILE' else 'FOURTH_QUARTILE' end as lvl
        from days
      ), weeks as (
        select g / 7 as w,
               jsonb_build_object('contributionDays',
                 jsonb_agg(jsonb_build_object('date', d, 'contributionCount', c, 'contributionLevel', lvl) order by g)) as week
        from levelled group by g / 7
      )
      select jsonb_build_object('totalContributions', (select sum(c) from days), 'weeks', (select jsonb_agg(week order by w) from weeks))
      into cal;

      repos := (
        select jsonb_agg(jsonb_build_object(
                 'name', r ->> 0, 'description', r ->> 1,
                 'url', format('https://github.com/%s/%s', v_login, r ->> 0),
                 'stargazerCount', (random() * 90)::int, 'forkCount', (random() * 12)::int,
                 'primaryLanguage', jsonb_build_object('name', r ->> 2)))
        from jsonb_array_elements(a -> 'repos') r);
      langnodes := (
        select jsonb_agg(jsonb_build_object('primaryLanguage', jsonb_build_object('name', l)))
        from (select (a -> 'langs' ->> floor(random() * jsonb_array_length(a -> 'langs'))::int) as l
              from generate_series(1, 4 + floor(random() * 8)::int)) q);

      perform public.store_github_snapshot(uid, jsonb_build_object(
        'login', v_login, 'databaseId', 900000000 + i, 'createdAt', '2021-06-01T00:00:00Z',
        'followers', jsonb_build_object('totalCount', (random() * 60)::int),
        'repositories', jsonb_build_object('totalCount', 4 + (random() * 28)::int),
        'topRepos', jsonb_build_object('nodes', repos),
        'langRepos', jsonb_build_object('nodes', langnodes),
        'contributionsCollection', jsonb_build_object('contributionCalendar', cal)));
    end if;
  end loop;

  -- Teams: 12 teams with 36 members in total; the other 14 students have no team.
  for j in 0..jsonb_array_length(teams) - 1 loop
    t := teams -> j;
    owner_uid := uids[(t -> 'members' ->> 0)::int];
    insert into public.teams (name, hackathon_id, description, idea, owner_id, recruit_status, is_demo)
    values (t ->> 'name', hack_ids[(t ->> 'hack')::int], t ->> 'desc', t ->> 'idea', owner_uid,
            case when jsonb_array_length(t -> 'open') = 0 then 'full'
                 when jsonb_array_length(t -> 'members') >= 3 then 'partially_filled' else 'open' end::public.recruit_status,
            true)
    returning id into v_team_id;

    for k in 0..jsonb_array_length(t -> 'members') - 1 loop
      insert into public.team_members (team_id, user_id, is_owner)
      values (v_team_id, uids[(t -> 'members' ->> k)::int], k = 0);
    end loop;

    insert into public.team_positions (team_id, role_id, spots)
    select v_team_id, r.id, (p ->> 1)::smallint
    from jsonb_array_elements(t -> 'open') p join public.roles r on r.slug = (p ->> 0);
  end loop;

  -- A few pending requests from sample students to every real account, so the Received tab has something.
  for real_user in select id from public.profiles where not is_demo and onboarded_at is not null loop
    demo_pick := array(select id from public.profiles where is_demo order by random() limit 3);
    for k in 1..coalesce(array_length(demo_pick, 1), 0) loop
      insert into public.connection_requests (sender_id, recipient_id, note)
      values (demo_pick[k], real_user.id, notes[1 + floor(random() * 4)::int])
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;
