# PRD: Hackathon Teammate Network

Nov 3, 2026 · @SRIKAR

## 1. Overview

A web app where students find hackathon teammates outside their existing friend circles, through Tinder-style discovery backed by verified skills, hackathon history and collaboration reviews. Launch is Hyderabad colleges, then India, then global.

**Problem.** Students form hackathon teams from the same friends and classmates every time. Skills overlap, commitment levels differ, and a strong designer or ML engineer at another college has no way to be found. Networks, not talent, limit who teams up.

**Product.** Discovery of people and of recruiting teams, a request/accept connection model, messaging unlocked only after acceptance, team spaces with group chat, and a reputation layer built from real collaborations.

**What makes it more than a Tinder clone.**

- Matching is about *contribution and complementarity*, not attraction: skills, roles, past hackathons, availability.
- Credibility is first-class: self-reported vs verified achievements, reviews tied to real team membership, anti-ghosting signals.
- It supports teams recruiting individuals and individuals joining teams, not only person-to-person.
- Hackathon history from *outside* the platform counts from day one.

**Positioning.** Tinder + LinkedIn + hackathon team formation. It is not a hackathon listing site and not a Discord replacement.

## 2. Goals, non-goals and success metrics

The launch goal is to make a student at one Hyderabad college reliably find and form a team with a student at another, before a specific hackathon.

**Goals**

- Let a student with no team find a compatible teammate or team in under 10 minutes.
- Make profiles credible enough that a stranger is willing to commit to a hackathon with them.
- Reach enough density in 3 to 5 launch colleges that the discovery deck is never empty.
- Keep users safe: harassment and fake accounts are handled quickly.

**Non-goals (for now)**

- A hackathon listing or aggregation website.
- A full Discord competitor (channels, voice, bots).
- Team-to-team discovery.
- Monetization.
- Non-hackathon collaboration (internships, startups).

**Success metrics (first 90 days after launch)**

| Metric | Target | Why it matters |
| --- | --- | --- |
| Verified signups across launch colleges | 2,000 | Enough density for matching |
| Profile completion rate | 70% | Thin profiles make bad matches |
| Request acceptance rate | 30% | Signals match quality |
| Connections that lead to a chat of 5+ messages | 50% | Real conversation, not just clicks |
| Teams formed through the platform | 150 | The actual outcome |
| Reports per 1,000 active users | under 5, 90% resolved within 24 hours | Safety health |
| Week-4 retention of users who joined a team | 40% | Value beyond one event |

Targets are starting assumptions to be revised after the first cohort.

## 3. Users and personas

| Persona | Situation | Needs |
| --- | --- | --- |
| Solo seeker | B.Tech student, strong in one area (e.g. AI/ML), no team for an upcoming hackathon | Find complementary people beyond their college; judge credibility quickly |
| Team recruiter | Team of 2 to 3 with one open slot and a specific role needed | Reach qualified candidates; manage requests; run a group chat |
| Team joiner | Student who wants to join an already-formed team | Browse teams for a given hackathon; see members and the problem statement |
| Non-CS contributor | Designer, business or hardware student | Be discoverable by technical teams; show non-code work |
| Moderator / admin | Platform operator | Review reports, ban abusers, verify achievements, audit actions |

Initial audience is B.Tech and engineering students in Hyderabad. Design, business and other branches are supported from day one in profiles and filters.

## 4. Phasing

Launch needs Phases 1 and 2 (every P0 requirement). Phases 3 and 4 add matching quality, the reputation layer and growth features.

&#91;embedded content: roadmap · 4 phases, 3 gates\]

Phase 1 proves the core loop with people discovery, requests and chat. Phase 2 adds teams, which is where the product becomes more than a swipe app. Reputation (Phase 3) needs real collaborations to exist first, so it follows launch.

## 5. Functional requirements

Priority: **P0** = needed for launch, **P1** = soon after, **P2** = later. Each requirement is written so it can be tested.

### 5.1 Registration, identity and onboarding

| ID | Requirement | Priority |
| --- | --- | --- |
| AUTH-1 | Sign up with GitHub OAuth or email; email verification is mandatory | P0 |
|  |  | P0 |
| AUTH-3 | College email verification gives a "college verified" badge; non-college emails can join but are labelled unverified | P0 |
| AUTH-4 | Bot protection (Turnstile) on signup and OTP requests; OTP rate limits per phone, IP and device | P0 |
| AUTH-5 | Phone number is private by default and never shown to other users | P0 |
| AUTH-6 | Account recovery via verified email or phone; session list with sign-out of other devices | P0 |
|  |  | P0 |
| AUTH-8 | Account deletion and data export from settings | P0 |

### 5.2 Profiles

| ID | Requirement | Priority |
| --- | --- | --- |
| PROF-1 | Basic info: name, photo, college, branch, year, city | P0 |
| PROF-2 | Skills from a controlled taxonomy (technical and non-technical) plus preferred roles; free-text bio capped at 500 characters | P0 |
| PROF-3 | GitHub connection showing top repositories and languages, synced in the background and cached | P0 |
| PROF-4 | Previous hackathons, including external ones: name, year, organizer, role, contribution, result (winner, runner-up, finalist, shortlisted, participant), teammates | P0 |
| PROF-5 | Every achievement carries a badge: self-reported, or verified (with the verification method shown) | P0 |
| PROF-6 | Projects: name, description, stack, personal contribution, repo link, live link | P0 |
| PROF-7 | Availability and collaboration preferences (commitment level, working hours, remote or in-person, competitive or casual) | P1 |
| PROF-8 | LinkedIn link as a plain URL field, not an integration | P1 |
| PROF-9 | Collaboration history and reviews section on the profile | P1 |
| PROF-10 | Public, shareable profile page with a preview card for WhatsApp, opt-in | P1 |

### 5.3 People discovery

| ID | Requirement | Priority |
| --- | --- | --- |
| DISC-1 | One profile card at a time with Connect and Skip buttons; keyboard shortcuts and swipe gestures as an enhancement | P0 |
| DISC-2 | Card shows photo, name, college, skills, top hackathon result, top project, GitHub highlights, badges and a "why you match" line | P0 |
| DISC-3 | Connect sends a request immediately; Skip sends nothing and notifies nobody | P0 |
| DISC-4 | Filters: skills, role, college, year, city, hackathon interest, availability | P0 |
| DISC-5 | Skipped profiles do not reappear for 7 days (changed from 30, D22), then may return | P1 |
| DISC-6 | Already-connected, blocked, reported and pending users never appear | P0 |
| DISC-7 | Daily connect cap (default 25) with a visible counter | P0 |
| DISC-8 | Undo last skip within the current session | P2 |
| SRCH-1 | Universal search in the top bar with suggestions on every letter: people by name, skill or college, and teams; opening a result shows the profile with Connect (added 2026-11-06, D21) | P0 |

### 5.4 Requests

| ID | Requirement | Priority |
| --- | --- | --- |
| REQ-1 | Request states: Pending, Accepted, Rejected, Cancelled, Expired (after 14 days) | P0 |
| REQ-2 | Sent tab with status per request; Received tab with Accept and Reject | P0 |
| REQ-3 | Optional note of up to 200 characters with a request; templated spam is rate limited | P0 |
| REQ-4 | Sender can cancel a pending request | P0 |
| REQ-5 | Rejection is shown to the sender as a neutral "not a match right now", with no reason | P0 |
| REQ-6 | Same pair cannot re-request for 30 days after a rejection | P1 |
| REQ-7 | Accepting a request creates a connection and a 1:1 conversation | P0 |

### 5.5 Teams and team discovery

| ID | Requirement | Priority |
| --- | --- | --- |
| TEAM-1 | Create a team with name, hackathon, description, idea (optional), problem statement | P0 |
| TEAM-2 | Roles in a team: owner, admin, member; the owner approves recruitment by default and can delegate to admins | P0 |
| TEAM-3 | Open positions, each with a role, required and preferred skills, and a count | P0 |
| TEAM-4 | Recruitment status: Open, Partially filled, Full, Closed; becomes Full automatically when positions run out | P0 |
| TEAM-5 | Teams directory with a card per team (not swipe), filterable by hackathon, role needed and skills | P0 |
| TEAM-6 | Team detail page: members and their profiles, problem statement, positions, expectations | P0 |
| TEAM-7 | "Request to join" for a specific open position; owner or admin accepts or rejects | P0 |
| TEAM-8 | Team invites individuals: team admins can invite from people discovery | P1 |
| TEAM-9 | Leave team (with an optional reason), remove member (admin), transfer ownership | P0 |
| TEAM-10 | A person can be in multiple teams, one per hackathon | P1 |
| TEAM-11 | Team closes automatically some days after the hackathon date | P1 |

### 5.6 Messaging

| ID | Requirement | Priority |
| --- | --- | --- |
| MSG-1 | 1:1 chat only between accepted connections | P0 |
| MSG-2 | Team group chat; joining the team grants access, leaving revokes it | P0 |
| MSG-3 | Real-time delivery, unread counts, sent and read state, typing indicator | P0 |
| MSG-4 | Text and links; link previews | P0 |
| MSG-5 | Block and report from any conversation; blocking ends the connection | P0 |
| MSG-6 | Image and file sharing | P2 |
| MSG-7 | Mute a conversation | P1 |

### 5.7 Hackathons

| ID | Requirement | Priority |
| --- | --- | --- |
| HACK-1 | Hackathon is an entity (name, organizer, dates, mode, link) so teams, interests and history link to it consistently | P0 |
| HACK-2 | Any user can create a hackathon entry; admins can merge duplicates | P0 |
| HACK-3 | Users mark interest in a hackathon; discovery can filter to people interested in the same one | P0 |
| HACK-4 | Past hackathons on profiles link to the same entity so external events are comparable | P1 |
| HACK-5 | Automated hackathon discovery is out of scope | Not planned |

### 5.8 Reviews and reputation

| ID | Requirement | Priority |
| --- | --- | --- |
| REV-1 | A review is allowed only between people who shared a team for at least 7 days | P1 |
| REV-2 | Dimensions: technical contribution, reliability, communication, teamwork, commitment, problem solving (1 to 5) and an optional comment | P1 |
| REV-3 | Reviews unlock after the team closes or a member leaves, and stay hidden until both sides submit or 14 days pass (prevents revenge reviews) | P1 |
| REV-4 | Reviews can be reported; moderators can remove them; reviewers cannot edit after publication | P1 |
| REV-5 | A reliability indicator is shown only after at least 3 reviews, to avoid noise | P1 |
| REV-6 | Leave-team reasons and commitment confirmations feed an anti-ghosting signal visible to team admins | P2 |

### 5.9 Notifications

| ID | Requirement | Priority |
| --- | --- | --- |
| NOTIF-1 | In-app notification centre for requests, acceptances, team events and messages | P0 |
| NOTIF-2 | Web push for requests, acceptances and messages, with per-type opt-out | P0 |
| NOTIF-3 | Email for account events and a weekly digest of matches and open teams | P1 |
| NOTIF-4 | No notification is sent for a skipped profile or a rejected request | P0 |

### 5.10 Safety, moderation and admin

| ID | Requirement | Priority |
| --- | --- | --- |
| SAFE-1 | Report a user, message, team or review with a reason | P0 |
| SAFE-2 | Admin dashboard: report queue, user lookup, ban or suspend, team and hackathon management, audit log | P0 |
| SAFE-3 | Message-request limits and rate limits to slow harassment and spam | P0 |
| SAFE-4 | Profile photo moderation (automated check plus manual review on flags) | P1 |
| SAFE-5 | Users can hide their profile from specific colleges or pause discovery | P1 |
| SAFE-6 | Achievement verification workflow: organizer link, certificate or Devpost URL check, teammate attestation | P1 |

### 5.11 Pre-launch waitlist (added 2026-11-05, see DECISIONS D19)

| ID | Requirement | Priority |
| --- | --- | --- |
| WAIT-1 | Anyone can join a waitlist from the landing page with name, email, college, year and optional branch, roles and one question; one entry per email | P0 |
| WAIT-2 | Each person gets an invite link; friends who join through it move them up the list; the source of each sign-up is recorded | P0 |
| WAIT-3 | Until launch the site is the waitlist only: no sign-up, log-in or app page is reachable | P0 |

## 6. Key user flows

**Onboarding.**

1. Continue with GitHub or email, pass Turnstile.
2. Verify email.
3. Add college email (optional, gives a badge), basic info, skills and preferred roles.
4. Import hackathons and projects (GitHub repos are suggested automatically).
5. Pick hackathons of interest, then land in Discover with a profile completeness prompt.

**Person to person.**

1. User opens Discover and sees one card with a "why you match" line.
2. Connect sends a request, with an optional note. Skip moves on.
3. Recipient sees it under Received, and accepts or rejects.
4. Accept creates a connection and a chat; the sender sees "Accepted" under Sent.
5. Either person can block or report from the chat.

**Join a team.**

1. User opens Teams, filters by hackathon and role, and opens a team page.
2. User picks an open position and sends a request with a note.
3. Owner or admin reviews the applicant's profile and accepts or rejects.
4. On accept, the user joins the team and the group chat; positions decrement and status updates.

**Recruit a member.**

1. Owner creates a team and lists open positions.
2. The team appears in the Teams directory and also in the discovery ranking of matching individuals.
3. Owner or admin can invite people from Discover, or review incoming join requests.

**Review after a collaboration.**

1. The team closes or a member leaves; review prompts appear for eligible teammates.
2. Each submits ratings; reviews are hidden until both sides submit or 14 days pass.
3. Published reviews appear on profiles and can be reported.

## 7. Matching and recommendation requirements

Discovery must never feel random. Ranking combines hard filters, complementary and similar skill matching, and quality signals.

- **Hard exclusions:** blocked, reported, already connected, pending, recently skipped, paused, suspended.
- **Complementary matching:** an ML profile ranks frontend, backend, design and product profiles higher.
- **Similar matching:** same-skill profiles still appear, at a smaller weight, so the deck is not only "opposites".
- **Context signals:** shared hackathon interest, same city, overlapping availability, compatible commitment level (casual vs competitive).
- **Quality signals:** profile completeness, verified badges, reliability score once it exists, recent activity.
- **Team-aware ranking:** when a user belongs to a recruiting team, discovery prioritizes people who fill that team's open positions.
- **Explainability:** every card shows a short reason (for example "Frontend developer, interested in SIH 2026, 2 verified hackathons").
- **Manual control:** the user can set what teammate they are looking for (roles, skills, commitment) and use filters. Manual preferences override automatic ranking.
- **Fairness:** new users get a temporary boost so they are seen; no user is shown to more than a daily cap of people, to avoid a few profiles absorbing all requests.
- **Cold start:** with few users, relax filters in a defined order (hackathon, then city, then skill strictness) rather than showing an empty deck.

## 8. Trust, safety, compliance and non-functional requirements

**Trust and safety**

- Duplicate-account defenses are layered: unique verified phone, unique GitHub account, college email, device and IP signals, and Turnstile. The goal is to make fake accounts expensive, not impossible.
- Women and other frequent targets of harassment get strong defaults: message-request limits, easy blocking, and fast report handling.
- Moderators can act on a report within the admin panel; every action is written to an audit log.
- Reviews tie to real shared membership, are hidden until both sides submit, and can be reported.

**Compliance (India)**

- Comply with the Digital Personal Data Protection Act 2023: explicit consent at signup, a clear privacy policy, purpose limitation, data export and deletion, breach process and a named grievance officer.
- Phone numbers and emails are never exposed to other users.
- Age: launch as 18+ only unless a minors policy with guardian consent is designed (see open decisions).
- SMS OTP in India requires DLT registration; the plan must account for lead time or use WhatsApp or Firebase based OTP.

**Non-functional requirements**

| Area | Requirement |
| --- | --- |
| Performance | Discover card loads in under 300 ms (p95) after the first load; API p95 under 400 ms; message delivery under 1 second |
| Availability | 99.5% monthly at launch; planned maintenance outside 6pm to 11pm IST |
| Scale target | 50,000 registered users and 5,000 concurrent chat connections without re-architecture |
| Mobile | Responsive PWA, installable, works well on mid-range Android phones and 4G |
| Accessibility | Keyboard-operable discovery, readable contrast, screen-reader labels on buttons |
| Privacy | Data stored in India region where practical; backups encrypted |
| Observability | Errors, latency and key funnel events tracked from day one |

## 9. Open decisions and recommended defaults

These were left open in the founder brief. Until decided, build with the recommended default so work is not blocked.

| Decision | Recommended default | Why |
| --- | --- | --- |
| Age policy | 18+ only at launch | Avoids guardian-consent obligations under DPDP |
| Student verification | College email gives a badge; not required to join | Many students lack working college email; badge still signals trust |
| Phone verification channel | WhatsApp or Firebase OTP first, SMS later | SMS needs DLT registration |
| Do skipped profiles return | Yes, after 30 days, low priority | Keeps deck fresh with small pools |
| Gestures vs buttons | Buttons first; swipe as an enhancement | Matches the founder's questionnaire choice |
| Team discovery interaction | Browsable cards with Request to Join, not swipe | Teams need more context than a card swipe allows |
| Team approvals | Owner approves; can delegate to admins | Simple and clear accountability |
| Hackathon as entity | Yes, user-created, admin-merged | Needed for filters, teams and verification |
| LinkedIn | URL field only | OAuth adds cost and little trust signal |
| Achievement verification | Self-reported by default; verified via organizer link, certificate or Devpost URL, or teammate attestation | Cheap and incremental |
| Review window | 7 days shared membership, hidden until both submit or 14 days | Reduces revenge and fake reviews |
| Chat scope | Text and links only at launch | Avoids building a Discord competitor and image moderation burden |
| Monetization | None until density is proven | Focus on liquidity |
| Team-to-team discovery | Not built | Not a confirmed requirement |

## 10. Launch plan, cold start and risks

**Launch plan**

1. Pick one upcoming hackathon that Hyderabad students care about, and launch 3 to 4 weeks before its team-formation deadline.
2. Seed 3 to 5 colleges densely through hackathon clubs and ambassadors, rather than thinly across the city.
3. Pre-seed profiles with ambassadors and founders so the first users find a full deck and a few open teams.
4. Build WhatsApp-native sharing: team invite links, public profile cards and "find me a teammate" links.
5. Review metrics weekly during the first hackathon cycle; fix matching and moderation issues before expanding.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Empty deck at launch | Users churn on day one | Dense seeding, relaxed filters, tie launch to a specific event |
| Harassment and unsafe messaging | Reputation and legal harm | Report and block, rate limits, quick moderation, mutual-accept before chat |
| Fake or duplicate accounts | Trust collapses | Phone plus GitHub plus college email, Turnstile, review gating |
| Ghosting after matching | Teams lose faith in the product | Commitment confirmations, reliability signals, leave reasons |
| Revenge or fake reviews | Reputation system distrusted | Shared-membership gating, blind reviews, moderation |
| Compliance gaps (DPDP, OTP rules) | Fines or blocked sign-ups | Consent, deletion and export from day one; start DLT early if using SMS |
| Overbuilding infrastructure | Slow to launch | Modular monolith, one region, Docker Compose |
| Event-driven usage | Traffic spikes then drops | Multi-hackathon support, weekly digests, team spaces that persist |
