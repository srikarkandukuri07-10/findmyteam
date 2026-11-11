# Build plan: modules

The platform is built one module at a time, in this order. Each module ends with something that works end to end: tables with RLS, pages, and the checks under "Done when". A module does not start until the previous one is done.

**Modules 0 to 9 are the launch.** Modules 10 and 11 come after launch, once real teams exist.

Requirement IDs refer to `PRD.md`, as amended by `DECISIONS.md`.

| # | Module | What it delivers | PRD IDs | Status |
| --- | --- | --- | --- | --- |
| 0 | Foundations | App skeleton, Supabase wiring, CI, docs | none | Done (GitHub repo pending) |
| W | Waitlist (pre-launch) | Public landing page and waitlist; app locked until launch (D19) | WAIT-1 to 3 | Built; live site is waitlist-only |
| 1 | Auth and onboarding | Google sign-in (D25), three-card onboarding with phone, typed college name, skills/bio, proof of work (D26) | AUTH-1, 4, 7 | Built (D25, D26); Turnstile deferred |
| 2 | Hackathons catalogue | Hackathon records anyone can add; mark interest | HACK-1, 2, 3 | Built; list starts empty by design (no seed data) |
| 3 | Profiles | Profile, skills, roles, photo, GitHub repos, past hackathons, projects | PROF-1 to 6, 8 | 3a built (profile, skills, roles, links, completeness); GitHub connection built (needs dashboard setup, see D13); 3b next (photo, past hackathons, manual projects) |
| 4 | People discovery | One card at a time, Connect / Skip, filters, ranking v1, daily cap | DISC-1 to 4, 6, 7 | Built early (D18): swipe deck and ranking v1; filters pending |
| 5 | Requests and connections | Sent / Received, accept, reject, cancel, expiry, block | REQ-1 to 7 | Built early (D18): send, accept, decline, cancel, expiry; block pending; block built with Messages (D23) |
| 6 | Messaging | 1:1 chat, unread counts, read state, typing, block and report | MSG-1 to 5, 7 | 1:1 chat built (D23): live messages, read state, typing, unread, links, block, report, mute. Team chat and link previews later |
| 7 | Teams | Create team, positions, directory, join requests, invites, group chat, leave / remove | TEAM-1 to 10 | |
| 8 | Notifications | In-app notification centre, email for key events | NOTIF-1, 3, 4 | |
| 9 | Safety, admin and launch readiness | Reports queue, admin panel, ban, audit log, data export and deletion, legal pages | SAFE-1 to 3, AUTH-8 | |
| 10 | Reviews and reputation | Post-team reviews, blind window, reliability indicator | REV-1 to 5, PROF-9 | After launch |
| 11 | Matching v2 and growth | Better ranking, preferences, share cards, web push, digest | DISC-5, 8, PROF-7, 10, NOTIF-2 | After launch |

---

## Module 0 · Foundations

- Next.js 16 (App Router, TypeScript, Tailwind) in a single app.
- Supabase clients for browser, server and `proxy.ts` session refresh.
- Env validation with Zod (`src/lib/env.ts`), `.env.example`.
- `/api/health` endpoint.
- GitHub Actions CI: lint, typecheck, build.
- Docs: `docs/`, `CLAUDE.md`.
- Supabase project created; `supabase/migrations/` holds every schema change.

**Done when:** `npm run dev` starts; lint, typecheck and build pass; the app reads the session from a real Supabase project.

## Module 1 · Auth and onboarding

- Sign-up with email and password, Turnstile CAPTCHA, email verification link.
- Onboarding step: B.Tech declaration (college, branch, year, expected graduation), birth year, terms and privacy consent with version.
- Sign-in, sign-out, password reset.
- `proxy.ts` sends signed-out users to `/login` and users without onboarding to `/onboarding`.
- Tables: `colleges` (seeded list of Hyderabad colleges), `users_meta` (consent version, birth year, status).

**Done when:** a new person can sign up, verify, complete onboarding and sign in again; unverified users cannot reach app pages; RLS tests pass.

## Module 2 · Hackathons catalogue

- `hackathons` table: name, organizer, dates, mode, link, status.
- Search with duplicate warning (trigram similarity), create, mark interest.
- Admin merge of duplicates arrives in Module 9.

**Done when:** a user can search, add and mark interest in a hackathon; a near-duplicate name shows a warning.

## Module 3 · Profiles

- Basic info, bio (500 characters), photo upload to Supabase Storage.
- Skills from a fixed list (technical and non-technical), preferred roles.
- GitHub username with public repos and languages, cached.
- Past hackathons (including external ones) with role, contribution, result and teammates; every achievement shows "Self-reported" or "Verified".
- Projects; LinkedIn URL field; profile completeness score.

**Done when:** a full profile can be built and viewed by another signed-in user; private fields (email) are never visible to others.

## Module 4 · People discovery

- One card at a time with Connect and Skip buttons, keyboard shortcuts, swipe gesture as an extra.
- Card: photo, name, college, skills, top hackathon result, top project, GitHub highlights, badges, "why you match" line.
- Ranking v1 as one SQL function: excludes self, blocked, connected, pending, recently skipped; scores complementary roles, shared hackathon interest, same city, completeness.
- Filters: skills, role, college, year, hackathon interest.
- Daily connect cap of 25 with a visible counter.

**Done when:** two test users can find each other; blocked and skipped users don't appear; the cap is enforced by the database.

## Module 5 · Requests and connections

- Request states: Pending, Accepted, Rejected, Cancelled, Expired (14 days).
- Sent and Received tabs; optional 200-character note; rejection shown as "Not a match right now".
- Accept creates a connection and a 1:1 conversation in one transaction.
- Block ends the connection.

**Done when:** every state change is tested; rejections and skips send no notification.

## Module 6 · Messaging

- 1:1 chat only between connected users, delivered through Supabase Realtime.
- Unread counts, read state, typing indicator, text and links.
- Block and report from the chat; mute.

**Done when:** messages arrive in under a second in two browsers; a blocked user can no longer send or read.

## Module 7 · Teams

- Create a team for a hackathon: name, description, idea, problem statement, expectations.
- Roles: owner, admin, member. Open positions with role, required and preferred skills, count.
- Recruitment status (Open, Partially filled, Full, Closed), updated automatically.
- Teams directory as browsable cards with filters; team detail page.
- Request to join a position; owner or admin accepts or rejects; invites from Discover.
- Group chat; leave (with reason), remove member, transfer ownership.
- One team per person per hackathon, enforced in the database.

**Done when:** a team can recruit a member through a join request and an invite, then chat; position counts stay correct when two requests are accepted at once.

## Module 8 · Notifications

- In-app notification centre for requests, acceptances, team events and messages, live through Realtime.
- Email for account events.
- Never notify on a skip or a rejection.

## Module 9 · Safety, admin and launch readiness

- Report a user, message, team or hackathon with a reason.
- Admin panel: report queue, user lookup, suspend or ban, merge hackathons, audit log.
- Rate limits on requests and messages.
- Account data export and deletion.
- Privacy policy, terms, grievance contact. Resolve the minors question in `DECISIONS.md` D4.
- Move to a production hosting plan; connect free SMTP; upgrade or keep the Supabase project active.

**Done when:** the launch checklist in this section is complete.
