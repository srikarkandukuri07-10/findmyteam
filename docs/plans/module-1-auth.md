# Module 1 plan · Auth and onboarding

Status: **built 2026-11-03.** Verified in the browser: log-in, onboarding (incl. under-18 and B.E.), home, log-out, route protection, validation messages. Database checks: `supabase/tests/module-1-rls.sql` (14 checks). Not yet verified: the email links (sign-up verification, password reset), which need the dashboard settings below. Turnstile is deferred to launch prep (Module 9). Covers PRD AUTH-1, AUTH-2, AUTH-4, AUTH-6, AUTH-7 as amended by `DECISIONS.md` D2–D4.

## What a student will be able to do

1. Sign up with email and password.
2. Click the link in the verification email.
3. Complete onboarding: name, college, branch, year of study, expected graduation year, birth year, and a checkbox confirming they are pursuing a B.Tech and accept the terms and privacy notice.
4. Land on a placeholder home page (Discover arrives in Module 4).
5. Sign out, sign back in, and reset a forgotten password by email.

Signed-out visitors are sent to `/login`. Signed-in users who haven't finished onboarding are sent to `/onboarding`.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page with Sign up / Log in |
| `/signup`, `/login` | Forms; Server Actions call Supabase Auth |
| `/auth/confirm` | Route Handler that verifies the email link (`token_hash`) and signs the user in; works even if the link is opened on another device |
| `/forgot-password`, `/reset-password` | Password reset by email |
| `/onboarding` | B.Tech declaration and consent |
| `/home` | Placeholder for signed-in, onboarded users |
| `/terms`, `/privacy` | Placeholder legal pages, version `2026-11-03` |

## Database (migration `0001_auth_onboarding.sql`)

- **`colleges`**: `id`, `name`, `city`, `email_domain` (for the later badge). Seeded with Hyderabad engineering colleges.
- **`branches`**: fixed list (CSE, IT, ECE, EEE, Mechanical, Civil, AI & ML, AI & DS, CSE Cyber Security, Chemical, Other).
- **`profiles`**: one row per user, created automatically by a trigger when someone signs up. Module 1 columns: `display_name`, `college_id`, `college_other` (if their college isn't listed), `branch_id`, `year_of_study` (1–5), `graduation_year`, `birth_year`, `degree` (fixed to `btech`), `consent_version`, `consented_at`, `onboarded_at`, `status` (active, suspended, banned). Module 3 adds the rest.
- **RLS:** a user can read and update only their own profile row. `status` and `onboarded_at` can't be changed directly by the user. Onboarding goes through one Postgres function that validates and sets them. `colleges` and `branches` are readable by signed-in users and writable by nobody.

## Code

- Zod schemas for every form in `src/lib/validation/auth.ts`, shared by client and server.
- Server Actions in `src/app/(auth)/actions.ts`.
- `proxy.ts` handles "signed in or not". The onboarding check lives in the layout of the signed-in route group, so the proxy doesn't hit the database on every request.
- Turnstile CAPTCHA is wired in but only switches on when its keys are set, so development isn't blocked.
- Vitest added for unit tests of the validation schemas. RLS is checked with SQL run as a normal user against the real project.

## Settings you need to change in the Supabase dashboard

I can't change these through the connected tools. I'll give exact steps when we get there.

1. **Authentication → URL Configuration:** Site URL `http://localhost:3000`, redirect URL `http://localhost:3000/**`.
2. **Authentication → Emails → Confirm signup:** change the link to `/auth/confirm?token_hash=...`, so verification works across devices.
3. **Later, before launch:** Cloudflare Turnstile keys (free) and custom SMTP (Resend free tier). Supabase's built-in email sender allows only a few emails per hour, which is enough for testing.

## Done when

- A new account can go through sign-up → verify → onboarding → home → sign out → sign in → reset password, in the browser.
- An unverified or signed-out user can't reach `/home` or `/onboarding`.
- One user can't read or change another user's profile row (SQL check as two different users).
- Lint, typecheck, unit tests and build pass.

## Needs your input

- **Which colleges to seed.** I'll seed about 20 well-known Hyderabad engineering colleges, plus "My college isn't listed". If you already know your 3–5 launch colleges, tell me and I'll make sure they're included.
