# Decisions

Decisions made after the PRD and TRD were written. **Where this file disagrees with `PRD.md` or `TRD.md`, this file wins.** Add a new entry for every decision that changes scope or architecture.

---

## D1 · Zero-cost stack: Next.js + Supabase (2026-11-03)

**Decision.** Build one Next.js app on top of Supabase's free tier. No paid services until launch metrics justify them.

| Need | Was (TRD) | Now |
| --- | --- | --- |
| Database | Managed Postgres on AWS + PgBouncer | Supabase Postgres (free: 500 MB) |
| Auth | Better Auth, self-hosted | Supabase Auth (free: 50k monthly users) |
| API | Fastify modular monolith | Next.js Server Actions and Route Handlers, plus Postgres functions |
| Realtime chat | Socket.IO server + Redis adapter | Supabase Realtime |
| File storage | Cloudflare R2 | Supabase Storage (free: 1 GB) |
| Background jobs | BullMQ on Redis | Postgres `pg_cron` and Supabase Edge Functions |
| Discovery queue | Precomputed lists in Redis | One SQL function that ranks candidates on each request |
| Hosting | 2 VMs, nginx, Cloudflare Tunnel, Docker | Vercel free tier while building (see note) |
| Repo | pnpm + Turborepo monorepo | Single Next.js app, npm |

**Why.** You set a zero budget. Docker isn't installed locally. The 90-day goal is 2,000 users, which free tiers comfortably handle.

**Superseded TRD sections:** 1, 2, 3 (repo layout), 4, 8 (transport), 10 (Redis, BullMQ, R2), 12 (deploy pipeline), 13. The TRD's data model (section 5), matching design (section 7) and security principles still apply, adapted to this stack.

**Free-tier limits to watch.**
- A free Supabase project **pauses after 7 days without activity**. Fine while building; upgrade before launch.
- Vercel's free (Hobby) plan is for non-commercial use. Fine while building; at launch, move to Cloudflare Workers (free) or a paid plan.
- Supabase's built-in email sender is for testing only and allows only a few emails per hour. Before real users sign up, connect a free SMTP provider (for example Resend's free tier, about 100 emails per day).

---

## D2 · Sign-in: email and password only (2026-11-03)

**Decision.** Sign-up is email and password, with email verification required. **No phone number, no OTP, no OAuth sign-in, no Clerk.**

- Replaces PRD AUTH-1 (GitHub OAuth is removed as a sign-in method) and the founder brief's mandatory phone number.
- **AUTH-2 (new text):** Email must be verified before the account can use Discover, Teams or Messages.
- Bot protection: Supabase Auth's built-in CAPTCHA support with Cloudflare Turnstile (free). Kept from AUTH-4, minus phone and OTP limits.
- Recovery: password reset by email (AUTH-6, minus phone).

**GitHub stays on profiles without OAuth.** Users enter their GitHub username. The app reads public repositories from GitHub's public API and caches them (PROF-3). Nothing is verified about ownership. A "verified GitHub" badge can come later.

**Trade-off accepted.** Without a phone number, one person can create several accounts with several emails. Defences are: unique email, Turnstile, daily connect caps, reports and bans. This is weaker than the original plan.

---

## D3 · Eligibility: B.Tech students only, self-declared (2026-11-03)

**Decision.** Only students currently pursuing a B.Tech can join. At sign-up they declare degree (B.Tech), college, branch and year of study. Verification is not required to join.

- **AUTH-7 (new text):** Sign-up requires declaring an ongoing B.Tech degree, college, branch and expected graduation year, plus accepting the terms and privacy notice (versioned consent record).
- A "college verified" badge (college email, PRD AUTH-3) is optional and comes later.
- Profiles without a badge show "Self-declared".
- Narrows the PRD's audience: design, business and other non-B.Tech students cannot join. B.Tech students of any branch still can.

---

## D4 · No minimum age (2026-11-03)

**Decision.** No 18+ rule. Students aged 16, 17 or over can join. Replaces PRD section 8 "Age" and the TRD's 18+ gate.

**Open legal risk, not resolved.** India's DPDP Act 2023 requires verifiable parental consent before processing personal data of anyone under 18, and limits tracking of minors. Before public launch, get legal advice and decide one of:
1. Collect date of birth and run a parental-consent step for under-18 users.
2. Exclude under-18 users from some features (for example, discovery by strangers).
3. Revisit the age decision.

Until then, the app collects birth year at sign-up so this can be enforced later without asking everyone again.

---

## D5 · Authorization through Row Level Security (2026-11-03)

**Decision.** Every table has Postgres Row Level Security (RLS) turned on, with explicit policies. This reverses the TRD's "Row-level security is not used".

**Why.** With Supabase the browser talks to the database directly, so the database itself must refuse what a user is not allowed to see or change. Writes that touch several rows (accepting a request creates a connection and a conversation) run as Postgres functions inside one transaction.

---

## D6 · B.E. counts as B.Tech (2026-11-03, built; awaiting founder confirmation)

**Decision.** Onboarding accepts **B.Tech or B.E.** Osmania University's affiliated colleges (CBIT, Vasavi, MJCET, Matrusri, Methodist and others) award a B.E., which is the same engineering degree under another name. A B.Tech-only rule would stop students from several top Hyderabad colleges from joining honestly.

**To allow B.Tech only:** remove `'be'` from the `public.degree` enum in a new migration and from the `degree` enum in `src/lib/validation/auth.ts`.

---

## D7 · Name: FMT, short for FindMyTeam (2026-11-03)

Set by the founder. `src/lib/brand.ts` holds the name; renaming means changing that one file.

---

## D8 · Hosting on Vercel, deployed from GitHub (2026-11-03)

Code lives at `github.com/srikarkandukuri07-10/findmyteam`; Vercel builds every push to `main` to production and every other branch to a preview URL. Vercel's free Hobby plan is for non-commercial use, which covers building and testing; revisit before charging anyone or at public launch.

---

## D9 · Visual style: lavender page, cream cards (2026-11-03; colors and dark mode superseded by D16)

Taken from the founder's reference image. Colours are tokens in `src/app/globals.css` (page `#c9c5d3`, cards `#f7f4ea`, accent `#6f5fae`, large-number purple `#9d8ccc`), with a dark variant. Reusable pieces (`Card`, `Chip`, `Stat`, `ButtonLink`) live in `src/components/ui.tsx`. Text and button colours were chosen for readable contrast; the lighter purple is used only for large numbers and fills.

---

## D10 · Hackathon catalogue rules (2026-11-03)

- Any signed-in, **onboarded** user can add a hackathon, up to **5 per day**. Everything goes through database functions; direct table writes are blocked.
- Exact duplicates (same name and start date) are rejected; near-duplicates trigger a warning with links before saving. Admin merge of duplicates arrives in Module 9.
- A hackathon can last at most 62 days, with dates between 2015 and 2035 (past events are needed for profile history in Module 3).
- **No seed data.** Dates and links for real events must come from the founder or users, never from guesses. The list starts empty.
- "Today" for countdown labels is the Indian calendar date.
- Interest rows are private. Users see only their own, plus an aggregate count per hackathon.

---

## D11 · Intentional `SECURITY DEFINER` functions (2026-11-03)

Supabase's advisor warns that signed-in users can call these functions. That is the design: they are the only write path, and each calls `require_onboarded()` first. The checks in `supabase/tests/` prove anonymous and non-onboarded callers are refused. Do not "fix" the warning by revoking access.

---

## D12 · Profile privacy and limits (2026-11-03)

- Other students never read the `profiles` table. They get a safe subset through `get_profile()`: no birth year, consent data, email or account status. Suspended and banned students are hidden from others.
- Up to **15 skills** (each with a beginner / intermediate / advanced level) and **3 roles** per student, chosen from fixed lists seeded in the migration. Adding to those lists is a migration, not a user action.
- GitHub is a username only; LinkedIn is a plain link that must be an `https://…linkedin.com/in/…` address. Both are format-checked in the database.
- A profile counts as "built" at 70% completeness (3 skills, a 40+ character bio and a role).

---

## D13 · GitHub is an optional connection, not a sign-in method (2026-11-03)

Sign-in is still email and password (D2 stands). Onboarding now has an **optional step 2** at `/onboarding/connect`: "Connect GitHub" (OAuth through Supabase `linkIdentity`) and a LinkedIn link, both skippable and available later from the profile.

- When a student authorizes GitHub, the **database itself** fetches their public activity from GitHub's API (extension `http`, function `connect_github`) using the one-time token the server passes along. Students therefore can't submit made-up numbers, and no signing secret is needed. The token is never stored or logged.
- Stored as a snapshot in `github_snapshots`: repository count, followers, the past year's contribution calendar, top 6 repositories (shown as "Top projects") and top languages. The profile shows a "Verified with GitHub" badge.
- The snapshot is refreshed only by disconnecting and connecting again. Automatic refresh would need a server-side GitHub token or stored user tokens; not built.
- The free-text GitHub username field is gone from profile editing. A username typed before this change shows as an unverified plain link until the student connects or removes it.
- Needs setup in two dashboards (GitHub OAuth app, Supabase GitHub provider and "manual linking"); see the module 3 hand-over notes. Until then the Connect button shows "Connecting GitHub isn't available right now".

---

## D14 · Richer profiles are suggested more (internal rule; never shown to students)

Founder's rule: students who give more information are suggested more often by the matching algorithm. "More" means a verified GitHub connection (and its activity), LinkedIn, skills, roles and a bio, i.e. the same facts behind the profile strength score.

- Implement it in Module 4's quality signal (TRD section 7, "Quality" weight), not in the UI.
- **Do not mention it anywhere in the product**: onboarding, profile strength card, settings, emails, help text. UI copy must not promise better matches or visibility.
- Keep the boost modest, so students with sparse profiles, including non-coders for whom GitHub is less relevant, still appear regularly (the PRD's cold-start and fairness requirements still apply).

---

## D15 · Email confirmation switched off for now (2026-11-03)

**Decision.** New accounts are signed in immediately after sign-up, with no confirmation email. This temporarily replaces PRD AUTH-2 (verified email required). Reason: Supabase's built-in email sender only reaches your own team's addresses, and there is no budget for a domain or email provider yet.

- Done by turning **Confirm email** off in Supabase (Authentication → Sign In / Providers → Email). The app already copes: `signUp` goes straight to `/onboarding` when Supabase returns a session, and still shows "check your email" if confirmation is ever switched back on. The database check that onboarding needs a verified email still holds, because Supabase marks accounts confirmed automatically while confirmation is off.
- **Risks accepted for now.** Nobody proves they own the email they type, so (1) fake or mistyped addresses can sign up, (2) someone can register a stranger's address first and the real owner then can't use it, and (3) "Forgot password" only helps when the address is real and email delivery works. A sign-up with an existing address now says "This email already has an account", which reveals that the address is registered.
- **Re-enable before launch** together with a real email sender (Resend with a domain, or Brevo), and send the existing accounts a verification link.

---

## D16 · Exact reference palette, one look, motion (2026-11-03)

- **Colors are measured from the reference image**, not approximated: page `#c4c1cb`, cards `#f6f4e8`, purple fills and big numbers `#a18ccd`, chips and pills `#d2cdd2`, cream accent `#e9e4d0`. They live as tokens in `src/app/globals.css`.
- **No dark mode.** The app used to switch to a dark theme on dark-mode devices, which broke the look. It is now locked to the reference palette (`color-scheme: light`). Do not add dark variants.
- Purple *text* (links, small labels) uses a deeper shade of the same purple, `--accent-ink` `#66549f`, because `#a18ccd` is too pale to read at small sizes. Buttons use the exact purple with dark text.
- **Motion.** Page changes use React `<ViewTransition>` (the `PageTransition` wrapper, one per page): the page being left slides out to the left and fades, the new page slides in from the right; "back" links (`transitionTypes={BACK_TRANSITION}`) run it the other way. Cards and list items fade in from the left in sequence (`.reveal`, `.stagger`), cards that open lift on hover (`.lift`), and buttons respond to hover and press. All of it is switched off for people who ask their device for reduced motion.
- Gotcha: put `PageTransition` around each page's own element, never in a layout (layouts stay mounted, so they never enter or exit).

---

## D17 · Guided onboarding after sign-up (2026-11-03)

Right after sign-up (or the first login) a student walks through three steps with a progress indicator: **1 Create your account** (studies and consent, required), **2 Connect GitHub (optional)** with an optional LinkedIn link, **3 Build your profile (optional)** with bio, skills and roles. Steps 2 and 3 each have "Skip for now". Routes: `/onboarding`, `/onboarding/connect`, `/onboarding/profile`; step logic in `src/lib/onboarding/steps.ts`.

Students who skip steps see the same list on the home page ("Get started") with a "Continue setup" button to the next unfinished step, so logging in later still leads back into the flow.

---

## D18 · Sample students, swiping and teams built early (2026-11-03)

At the founder's request, a first version of **people discovery (Module 4)**, **requests (Module 5)** and a **read-only teams directory (part of Module 7)** was built ahead of order so the product can be tried with realistic data.

- **Swiping.** `/discover` opens on a "Start discovering" card; the deck zooms in. Swipe right (or tap the tick, or press the right arrow) sends a request; swipe left (or the cross, or the left arrow) skips. A skip sends nothing and tells nobody. Limits: 25 requests per 24 hours, a skipped student returns after 30 days, a request expires after 14 days, one live request per pair. Motion uses the `motion` library; everything respects reduced motion.
- **Requests.** `/requests` has Received and Sent tabs. Accepting only connects the two students for now (chat is Module 6). A sender whose request was declined sees the neutral "Not a match right now".
- **Teams.** `/teams` and `/teams/[id]` list teams, members and open positions. Creating teams, joining and invites are still Module 7; the join button is disabled ("opens soon").
- **Ranking stays internal (D14).** Complementary roles and shared hackathon interest lead; a modest boost for fuller profiles exists in the database function, and no screen mentions it.
- **Sample data.** 50 fictional students (emails `@demo.fmt.invalid`), 4 sample hackathons and 12 teams, flagged `is_demo` and labelled "Sample" in the app. 14 students are deliberately in no team. Seed: `supabase/seed/demo-data.sql`. **Remove before launch** with `supabase/seed/remove-demo.sql`; it deletes the sample users, teams and hackathons and everything attached to them.
- Each real account also gets 3 pending requests from sample students so accepting can be tried.

---

## D19 · Waitlist only until launch (2026-11-05)

Before launch the public site is a **waitlist landing page and nothing else**. The founder will promote it with an Instagram reel and a "link in bio".

- **Lock.** `src/lib/waitlist/mode.ts`: while waitlist mode is on, `proxy.ts` redirects every route except `/`, `/privacy` and `/terms` to `/` (sign-up, log-in, auth callbacks and all app pages included), and the sign-up, log-in and password-reset actions refuse to run. It is **on unless `WAITLIST_MODE=off`**, so a missing variable can never open sign-ups. Set `WAITLIST_MODE=off` only in a local `.env.local` to work on the app.
- **Supabase side.** "Allow new users to sign up" must be **off** in Supabase Auth settings, so nobody can create an account by calling Supabase directly with the public key. Existing accounts (founders, the dev tester, sample students) are unaffected.
- **Data.** Table `waitlist`, invisible to the API (RLS on, no policies, privileges revoked). Four public functions: `join_waitlist` (validates everything, one row per email in any case, at most 5 sign-ups an hour per network), `waitlist_standing(code)` (place and referral count, no personal data), `waitlist_stats()` (total and top colleges only), `waitlist_options()` (colleges, branches, roles for the form). A repeat email gets "already on the list" and nothing else. Checks: `supabase/tests/module-6-waitlist.sql`.
- **Fields.** Name, email, college (or a typed one), optional branch, year, roles, an optional "hardest part of finding a team" answer, a B.Tech/B.E. confirmation and consent (`waitlist-2026-11-05`). No phone number.
- **Referrals.** Each person gets an 8-character code; `/?ref=CODE` credits whoever shared it, and each friend who joins moves them up 10 places. `?src=` (or an Instagram referrer) is kept as the source, so the reel's sign-ups can be counted.
- **Spam.** A hidden honeypot field, and the network limit above. The network is stored only as an HMAC with `WAITLIST_HASH_SECRET` (set in Vercel), never as an address. Without the secret (local) there is no limit.
- **Founders' view.** In the Supabase dashboard: table `waitlist` and views `waitlist_daily`, `waitlist_by_college`, `waitlist_top_referrers` (not exposed to the API).
- **Same database for now.** The free plan allows two active projects and the founder's account already has two, so the waitlist lives in the FMT project for now. Move it to its own production project before launch (see Still open).
- **At launch:** invite in waves college by college, with a personal link that fills in the details; set `status` to `invited`, then `joined` with `joined_user_id`; give waitlisters a Founding member badge.

---

## D20 · Roles and private test access (2026-11-06)

- **Roles.** `profiles.role` is `student` (default), `investor` or `admin`. Nobody can change a role from the API (profiles writes are revoked); the founder's account is `admin`. `is_admin()` is the check for policies and functions. Investors arrive with the pitch module (not built yet).
- **Testing while the site is locked (D19).** The full app runs only on previews of the **`dev` branch**: Vercel has `WAITLIST_MODE=off` for Preview + branch `dev` only, and Vercel Authentication protects every preview URL, so only someone logged into the founder's Vercel account can open it. Production (`main`, findmyteam.tech) stays waitlist-only. Locally, `.env.local` has `WAITLIST_MODE=off`.
- **Workflow.** Work lands on `dev` first and is tested on its preview; it reaches `main` (production) only when the founder approves, and stays behind the lock there until launch.
- **Plans are display-only.** A Free and a Pro card describe the plans; no payment provider until the founder approves one.
- **Build order agreed with the founder:** 1 roles and test access, 2 new app layout and homepage, 3 universal search and profiles with photos, 4 Scout (the pop-up swipe deck; skipped people return after 7 days), 5 Messages. Pitches to investors and hosted hackathons come later.
- Checks: `supabase/tests/module-7-roles.sql`.

---

## Still open

- **Launch hackathons.** The founder should supply the real hackathons (name, dates, link) for the launch cycle; add them through the app.
- **Leaked-password protection** is off in Supabase Auth (dashboard setting, may need a paid plan). Turn it on before launch if available.
- **Email confirmation is off (D15).** Turn it back on, with a real email sender, before launch.
- **Unused Vercel variable.** `GITHUB_SNAPSHOT_SECRET` exists in the Vercel project from an abandoned design (D13). Nothing reads it; delete it in Vercel's settings.
- **Test account in the shared database.** The `dev-tester` account (a fake "Dev Tester" profile) exists in the same database production uses. Remove it before people-discovery (Module 4) goes live, or it will appear in real students' decks.
- **Sample data (D18).** Run `supabase/seed/remove-demo.sql` before real students arrive.
- **Shared database.** Local development and production use one Supabase project. Create a separate production project before launch.
- **Waitlist data (D19).** It sits in the shared project. Before launch, pause or delete one of the two active free projects (the account limit), create the production project, and move the `waitlist` table there.
- **Supabase sign-ups (D19).** Keep "Allow new users to sign up" off until launch.
- **Review eligibility.** The PRD requires 7 days of shared team membership before a review, which may block most real hackathon teams. Decide before Module 10.
- **Team invites at launch.** PRD section 6 includes invites in the launch flow, but TEAM-8 is marked P1. This plan includes invites in Module 7.
- **One team per hackathon (TEAM-10).** Enforce in the database in Module 7.
