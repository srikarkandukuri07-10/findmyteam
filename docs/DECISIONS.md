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

## Still open

- **Review eligibility.** The PRD requires 7 days of shared team membership before a review, which may block most real hackathon teams. Decide before Module 10.
- **Team invites at launch.** PRD section 6 includes invites in the launch flow, but TEAM-8 is marked P1. This plan includes invites in Module 7.
- **One team per hackathon (TEAM-10).** Enforce in the database in Module 7.
