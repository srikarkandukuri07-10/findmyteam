# TRD: Hackathon Teammate Network

Nov 3, 2026 · @SRIKAR

## 1. Technical overview

A modular monolith in TypeScript with a separate realtime server and worker process, backed by PostgreSQL, Redis and Cloudflare R2, and fronted by Cloudflare. It is deliberately boring: one language, one region (Mumbai), and clear places to scale later.

**Principles**

- PostgreSQL is the source of truth; Redis holds only rebuildable state.
- Services are stateless, so any container can serve any request.
- Anything asynchronous goes through the outbox and queues, never inline in a request.
- Discovery is precomputed; serving a card is a cheap read.
- Security and privacy are defaults: private origin, deny-by-default authorization, minimal personal data in responses and logs.
- Observable from day one: every request, job and socket event is traceable.
- Add infrastructure only when a measured limit is hit (see the scaling table).

&#91;embedded content: architecture · edge, origin VMs, data layer\]

Traffic enters through Cloudflare and reaches nginx on each VM only through an outbound tunnel, then is balanced across API and realtime containers. Workers pull jobs from Redis and call outside services; all services share the same Postgres, Redis and R2.

## 2. Tech stack

One language (TypeScript) across web, API and workers, one primary database, boring infrastructure. Where two options are close, the choice below is the default; change it only with a reason.

| Layer | Choice | Notes |
| --- | --- | --- |
| Edge | Cloudflare DNS, CDN, WAF, rate limiting, Turnstile, Tunnel | Origin IPs are never public; Tunnel replaces open inbound ports |
| Web app | Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Motion for swipe animations, TanStack Query | PWA first (installable, web push) |
| Web hosting | Cloudflare Workers via the OpenNext Cloudflare adapter | Fallback: run Next.js as a container on the VMs behind nginx if the adapter blocks a feature |
| API | Node.js LTS + Fastify + Zod schemas, OpenAPI generated from the schemas | Modular monolith, not microservices |
| Realtime | Socket.IO server as its own process, Redis adapter | Rooms per conversation and per team; auto-reconnect |
| Workers | BullMQ on Redis | Email, push, GitHub sync, embeddings, digests, moderation jobs |
| Database | PostgreSQL with pgvector and pg\_trgm, PgBouncer in front | Managed Postgres in the Mumbai region (for example AWS RDS ap-south-1); PITR enabled |
| ORM and migrations | Drizzle ORM + drizzle-kit migrations | SQL-first, versioned, reviewed in PRs |
| Cache, queues, pub/sub | Redis (or Valkey) with AOF persistence | Sessions, rate limits, discovery queues, presence, BullMQ |
| Object storage | Cloudflare R2 | Avatars and uploads via presigned URLs; no egress fees |
| Image handling | Cloudflare Images or a sharp worker | Resize to fixed variants on upload; strip EXIF |
| Auth | Better Auth (self-hosted, Postgres-backed) | GitHub OAuth, email, sessions; Auth.js is the fallback |
| Phone OTP | WhatsApp Cloud API authentication template, Firebase phone auth as fallback | Avoids SMS DLT lead time; SMS provider only if needed |
| Email | Resend or Amazon SES (Mumbai) | Transactional plus weekly digest |
| Push | Web Push (VAPID) now, FCM when the mobile app ships | Per-type opt-outs |
| Search | Postgres full-text and trigram | Add Typesense or Meilisearch only when queries get slow |
| Embeddings | Hosted embedding model, vectors stored in pgvector with an HNSW index | Computed in a worker when a profile changes |
| Load balancing | nginx upstreams (least\_conn) on each VM; Cloudflare Load Balancing later for multi-origin failover | WebSocket upgrade handled in nginx |
| Containers | Docker, Docker Compose on 2 app VMs | No Kubernetes at this scale |
| IaC and secrets | Terraform (Cloudflare and cloud resources), Doppler or Infisical | No secrets in the repo or in images |
| CI/CD | GitHub Actions, images in GHCR, scripted rolling deploy | Staging and production environments |
| Observability | Sentry, OpenTelemetry to Grafana Cloud or Better Stack, PostHog | Errors, traces, logs, product analytics, uptime checks |
| Testing | Vitest, Playwright, k6, Testcontainers | Unit, integration, end-to-end, load |
| Feature flags | GrowthBook or Unleash; a simple DB flag table is acceptable at launch | Safe rollouts of matching changes |

## 3. Repository structure and conventions

A single pnpm + Turborepo monorepo. The API is one deployable with strictly separated modules; the realtime server and workers reuse the same packages.

```text
repo/
  apps/
    web/                 Next.js PWA
    api/                 Fastify HTTP API
    realtime/            Socket.IO server
    worker/              BullMQ workers and schedulers
    admin/               Admin dashboard (Next.js, separate route group or app)
  packages/
    db/                  Drizzle schema, migrations, seed, query helpers
    domain/              Business rules shared by api, worker, realtime (pure TS)
    contracts/           Zod schemas, OpenAPI, generated API client types
    config/              Env parsing and validation (Zod), feature flags
    ui/                  Shared React components (shadcn based)
    eslint-config/ tsconfig/
  infra/
    terraform/           Cloudflare and cloud resources
    docker/              Dockerfiles, compose files, nginx config
    scripts/             Deploy, backup, restore drills
  docs/                  PRD, TRD, ADRs, runbooks
  CLAUDE.md              Instructions for Claude Code
```

**API modules** (each has `routes`, `service`, `repo`, `schemas`, `events`, `tests`): `auth`, `users`, `profiles`, `hackathons`, `discovery`, `requests`, `connections`, `teams`, `messaging`, `reviews`, `notifications`, `moderation`, `admin`.

**Rules**

- Modules talk through service functions and domain events, never by reading each other's tables directly.
- All input and output is validated with Zod; no `any` in module boundaries.
- Every schema change is a migration in `packages/db`; never edit the database by hand.
- All times are stored in UTC (`timestamptz`); IDs are UUID v7 (time-sortable).
- Every write endpoint that can be retried takes an idempotency key.
- Feature code ships with tests; a PR does not merge with a failing check.
- Conventional commits, small PRs, ADRs in `docs/` for decisions that change architecture.

## 4. Infrastructure and environments

**Cloudflare and nginx are complementary.** Cloudflare terminates the public connection, filters abuse and caches static content. nginx sits behind it on each VM, balances across local containers, and handles the WebSocket upgrade. Cloudflare Workers cannot run nginx or connect to a standard Redis, which is why the API, realtime server and workers run on VMs.

**Environments**

| Environment | Purpose | Shape |
| --- | --- | --- |
| local | Development | Docker Compose: Postgres, Redis, Mailpit, MinIO or R2 dev bucket |
| preview | Per-PR web previews | Cloudflare preview deployments pointing at staging API |
| staging | Pre-release checks, load tests | 1 small VM, small managed Postgres, own R2 bucket, own domain |
| production | Live | 2 app VMs, managed Postgres, Redis VM, R2, Cloudflare in front |

**Production topology**

- `app-1` and `app-2` (Mumbai region): each runs `cloudflared`, nginx, 2 API containers, 2 realtime containers, 1 worker container.
- `data-1`: Redis with AOF persistence and daily snapshots (or a managed Redis in the same region).
- Managed PostgreSQL with PgBouncer, automated backups and point-in-time recovery; the application uses the pooled connection.
- Cloudflare Tunnel connects each VM outbound to Cloudflare, so the VM firewall allows no public inbound ports except SSH from a bastion or an allow-listed IP.
- Cloudflare routes `api.` and `ws.` hostnames to the tunnels; Cloudflare Load Balancing with health checks is added when a second region or origin pool appears.

**Cloudflare configuration**

- DNS, proxied records, TLS Full (strict) with an origin certificate.
- WAF managed rules, bot fight mode, rate limiting rules on `/auth/*`, OTP endpoints and request sending.
- Turnstile on signup, login, OTP request and report forms.
- Cache rules: static assets and public profile pages cached; `/api/*` and `/ws` never cached.
- Access (Zero Trust) in front of the admin dashboard and staging.

**nginx (per VM)**

```nginx
upstream api      { least_conn; server api-1:3000; server api-2:3000; keepalive 32; }
upstream realtime { least_conn; server rt-1:4000;  server rt-2:4000; }

server {
  listen 8080;
  set_real_ip_from 172.16.0.0/12;   # docker network where cloudflared runs
  real_ip_header CF-Connecting-IP;

  location /api/ {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header X-Request-Id $request_id;
    proxy_read_timeout 30s;
  }

  location /socket.io/ {
    proxy_pass http://realtime;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 75s;
  }
}
```

Runtime notes: use WebSocket-only transport in Socket.IO, so no sticky sessions are needed and any realtime container can serve any client; the Redis adapter fans events out across containers. Set container memory limits and restart policies, and give every container a health check so nginx only routes to healthy ones.

## 5. Data model

PostgreSQL is the source of truth. All primary keys are UUID v7, all timestamps `timestamptz`. Soft-delete users with `deleted_at`, then hard-purge personal data after the retention window.

| Area | Tables and key columns | Constraints and indexes |
| --- | --- | --- |
| Identity | `users` (email, email\_verified\_at, phone\_e164, phone\_verified\_at, status, age\_confirmed\_at, consent\_version, last\_active\_at, deleted\_at); `auth_accounts` (provider, provider\_account\_id); `colleges` (name, email\_domain, city); `college_verifications` | unique email; unique phone where not deleted; unique (provider, provider\_account\_id); status in active, suspended, banned, deleted |
| Profile | `profiles` (display\_name, photo\_key, college\_id, branch, year, city, bio, commitment\_level, availability, visibility, completeness, embedding vector); `skills` (slug, category); `user_skills` (level, is\_primary); `roles`; `user_roles`; `github_links` (github\_id, login, synced\_at, summary); `github_repos` (cached top repos) | unique github\_id; GIN index on skills array or join index (skill\_id, user\_id); HNSW index on `embedding` |
| Hackathons and history | `hackathons` (name, organizer, starts\_on, ends\_on, mode, url, created\_by, merged\_into, status); `hackathon_history` (user\_id, hackathon\_id, role, contribution, result, verification\_status, verification\_method, evidence\_url); `history_teammates` (history\_id, name, linked\_user\_id); `projects` (name, description, stack, contribution, repo\_url, live\_url); `hackathon_interest` | unique (user\_id, hackathon\_id) on history and interest; trigram index on hackathon name for dedupe; result enum winner, runner\_up, finalist, shortlisted, participant |
| Discovery | `swipes` (actor\_id, target\_id, action connect or skip, created\_at); `user_blocks` (blocker\_id, blocked\_id) | primary key (actor\_id, target\_id); index (actor\_id, created\_at); unique (blocker\_id, blocked\_id) |
| Requests | `connection_requests` (sender\_id, recipient\_id, status, note, hackathon\_id, expires\_at, responded\_at); `connections` (user\_a, user\_b, created\_at, ended\_at) | partial unique (sender\_id, recipient\_id) where status is pending; check user\_a < user\_b with unique (user\_a, user\_b); index (recipient\_id, status) |
| Teams | `teams` (name, hackathon\_id, description, idea, problem\_statement, expectations, recruit\_status, owner\_id, closes\_at); `team_members` (role, joined\_at, left\_at, leave\_reason); `team_positions` (role\_id, required\_skill\_ids, preferred\_skill\_ids, count\_total, count\_filled); `team_requests` (team\_id, position\_id, user\_id, direction join or invite, status, note) | primary key (team\_id, user\_id) on members; check count\_filled <= count\_total; one active request per (team\_id, position\_id, user\_id); index (hackathon\_id, recruit\_status) |
| Messaging | `conversations` (type direct or team, connection\_id, team\_id); `conversation_members` (last\_read\_message\_id, muted, left\_at); `messages` (conversation\_id, sender\_id, body, client\_msg\_id, created\_at, deleted\_at) | index (conversation\_id, id desc); unique (sender\_id, client\_msg\_id) for idempotent sends |
| Reviews | `reviews` (team\_id, reviewer\_id, reviewee\_id, six rating columns, comment, state hidden, published or removed, submitted\_at, published\_at); `reliability_stats` (user\_id, review\_count, averages, leave\_count) | unique (team\_id, reviewer\_id, reviewee\_id); check reviewer <> reviewee; eligibility enforced in the service by membership overlap of 7 days or more |
| Moderation | `reports` (reporter\_id, target\_type, target\_id, reason, status, assigned\_to); `moderation_actions`; `audit_log` (actor\_id, action, entity, entity\_id, diff, ip, created\_at) | index (status, created\_at); audit\_log is append-only |
| Notifications | `notifications` (user\_id, type, payload, read\_at); `push_subscriptions` (endpoint, keys); `notification_prefs` (user\_id, type, channel, enabled) | index (user\_id, read\_at, created\_at desc) |
| Platform | `outbox_events` (topic, payload, processed\_at); `idempotency_keys`; `feature_flags` | outbox rows written in the same transaction as the change they announce |

**Design rules**

- Domain events (request accepted, member joined, message sent) are written to `outbox_events` in the same transaction, then published to BullMQ by a relay. This avoids lost notifications after a crash.
- The decision "who can message whom" lives in one service function that checks the `connections` or `team_members` row; the database never trusts the client.
- Counters such as `count_filled` change only inside the transaction that accepts a team request, with a row lock on the position.
- Row-level security is not used; authorization is enforced in the service layer and covered by tests.

## 6. API design

REST over JSON under `/api/v1`, with the OpenAPI document generated from the Zod schemas and a typed client generated for the web app.

**Conventions**

- Auth: httpOnly, Secure, SameSite=Lax session cookie, plus a CSRF token on state-changing requests. The WebSocket handshake reuses the session.
- Pagination: cursor-based (`?cursor=&limit=`), never offset, for feeds, messages and notifications.
- Errors: `application/problem+json` with a stable `code` field the client can switch on.
- Idempotency: `Idempotency-Key` header on request sending, team joining, and message sending.
- Rate limits: per user and per IP, returned in `RateLimit-*` headers; stricter on auth, OTP and request endpoints.
- Versioning: `/v1` now; breaking changes go to `/v2`, additive changes do not bump.

**Endpoints by module**

| Module | Endpoints |
| --- | --- |
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/github/callback`, `POST /auth/email/verify`, `POST /auth/phone/otp`, `POST /auth/phone/verify`, `POST /auth/recover`, `GET /auth/sessions`, `DELETE /auth/sessions/:id` |
| Me and settings | `GET /me`, `PATCH /me`, `DELETE /me`, `POST /me/export`, `GET /me/notification-prefs`, `PUT /me/notification-prefs` |
| Profiles | `GET /profiles/:id`, `PUT /me/profile`, `PUT /me/skills`, `POST /me/photo/upload-url`, `POST /me/github/connect`, `POST /me/github/sync`, `CRUD /me/hackathon-history`, `CRUD /me/projects` |
| Hackathons | `GET /hackathons?q=`, `POST /hackathons`, `GET /hackathons/:id`, `PUT /me/hackathon-interest/:id` |
| Discovery | `GET /discover/people?cursor=&filters=`, `POST /discover/people/:id/connect`, `POST /discover/people/:id/skip`, `GET /discover/teams?hackathon=&role=&skills=` |
| Requests | `GET /requests/sent`, `GET /requests/received`, `POST /requests/:id/accept`, `POST /requests/:id/reject`, `POST /requests/:id/cancel` |
| Connections | `GET /connections`, `DELETE /connections/:id`, `POST /users/:id/block`, `DELETE /users/:id/block` |
| Teams | `POST /teams`, `GET /teams/:id`, `PATCH /teams/:id`, `POST /teams/:id/positions`, `POST /teams/:id/join-requests`, `POST /teams/:id/invites`, `POST /team-requests/:id/accept`, `POST /team-requests/:id/reject`, `POST /teams/:id/leave`, `DELETE /teams/:id/members/:userId`, `POST /teams/:id/transfer-ownership` |
| Messaging | `GET /conversations`, `GET /conversations/:id/messages?cursor=`, `POST /conversations/:id/messages`, `POST /conversations/:id/read`, `PUT /conversations/:id/mute` |
| Reviews | `GET /me/review-prompts`, `POST /teams/:id/reviews`, `GET /profiles/:id/reviews`, `POST /reviews/:id/report` |
| Notifications | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `POST /push/subscribe`, `DELETE /push/subscribe` |
| Moderation | `POST /reports` |
| Admin (separate auth and IP rules) | `GET /admin/reports`, `POST /admin/reports/:id/resolve`, `POST /admin/users/:id/suspend`, `POST /admin/users/:id/ban`, `POST /admin/hackathons/merge`, `GET /admin/audit-log`, `POST /admin/achievements/:id/verify` |

**WebSocket events** (Socket.IO): client to server `message:send`, `message:read`, `typing:start`, `typing:stop`, `presence:ping`; server to client `message:new`, `message:read`, `typing`, `request:new`, `request:updated`, `team:updated`, `notification:new`, `unread:count`. Every server event carries a monotonically increasing id so clients can resume after reconnect.

## 7. Discovery and matching design

Discovery is a precomputed queue per user, not a live query per card. A worker builds the queue; the API only pops from it.

**Pipeline**

1. **Candidate generation (SQL).** Start from active, discoverable users. Exclude self, blocked either way, connected, pending, recently skipped, reported and suspended users. Apply the user's hard filters (college, year, role, hackathon interest). Cap the pool at a few hundred candidates, ordered by recent activity.
2. **Scoring (TypeScript in the worker).** Score each candidate with the weighted features below and keep the top 50.
3. **Queue (Redis).** Store the ordered candidate ids in `disc:queue:{userId}` with a TTL. When the queue drops below 10 cards, enqueue a refill job.
4. **Serve.** `GET /discover/people` pops the next cards, hydrates them from a per-profile card cache (`card:{userId}`), and attaches the "why you match" line.
5. **Record.** Connect writes a `swipes` row and creates a connection request in one transaction; Skip writes a `swipes` row only. Both remove the card from the queue.
6. **Invalidate.** Blocks, new connections, profile edits and suspensions remove the affected ids from queues; a nightly job rebuilds queues for active users.

**Scoring features** (weights are starting defaults, tuned from acceptance-rate data)

| Feature | How it is computed | Default weight |
| --- | --- | --- |
| Complementarity | Lookup table `role_complements` (for example ML engineer to frontend, backend, designer, product); overridden by the user's stated "looking for" roles | 0.30 |
| Similarity | Cosine similarity of profile embeddings from pgvector (skills, roles, bio, projects, hackathon roles) | 0.15 |
| Context | Shared hackathon interest, same city, overlapping availability, compatible commitment level | 0.25 |
| Quality | Profile completeness, verified badges, reliability score when available | 0.20 |
| Freshness and fairness | Recent activity; temporary boost for new users; penalty for profiles that already received many pending requests | 0.10 |

When the user belongs to a recruiting team, a `fills_open_position` term is added to the complementarity score for candidates matching that team's required skills.

**Explanations.** The top two contributing features are turned into a short sentence (for example "Frontend developer, also interested in SIH 2026") and stored with the queue entry.

**Cold start.** If fewer than 20 candidates survive filtering, relax constraints in a fixed order: hackathon interest, then city, then skill strictness. Never relax blocks, age or safety exclusions.

**Skip behavior.** A skipped user is excluded for 30 days, then may return once at lower priority.

**Teams directory.** Browsed through a normal filtered query (hackathon, role, skills, status) ordered by fit with the viewer's skills; it uses the same scoring helper for the fit but needs no queue.

**Embeddings.** A worker recomputes a profile embedding when profile text or skills change (debounced), and stores it in `profiles.embedding`. The embedding model and dimension live in config, so changing the model means a backfill job, not a schema redesign.

## 8. Realtime and messaging design

Postgres stores every message; Redis only carries live events. If Redis is lost, no message is lost.

**Send path**

1. The client sends `message:send` with a `client_msg_id` over the WebSocket (or `POST /conversations/:id/messages` as a fallback).
2. The realtime server authenticates the socket from the session, checks conversation membership, and applies a per-user rate limit.
3. The message is inserted into Postgres (unique on sender and `client_msg_id`, so retries are safe) and an outbox event is written.
4. The server publishes `message:new` to the room `conv:{id}` through the Redis adapter; every realtime container forwards it to connected members.
5. For members who are offline, a worker creates a notification and sends a web push, collapsed per conversation so a burst becomes one push.

**Rooms and presence**

- On connect, a socket joins `user:{id}` (for requests and notifications) and a room per conversation the user belongs to.
- Leaving a team or ending a connection removes the user from the room immediately and the next membership check fails.
- Presence is a Redis key `presence:{userId}` with a short TTL refreshed by `presence:ping`; "last seen" is shown only between accepted connections.

**Unread counts**

- `conversation_members.last_read_message_id` is the durable source.
- Redis holds a fast counter `unread:{userId}:{conversationId}`, incremented on send and reset on read; a reconciliation job repairs drift from Postgres.

**Reconnect and ordering**

- Message ids are UUID v7, so ordering within a conversation is the id order.
- On reconnect the client sends the last id it saw per conversation and the server replays anything newer from Postgres.

**Safety in chat**

- Direct chat exists only if a `connections` row is active; blocking ends the connection and closes the room.
- Messages are text and links at launch. Links get a preview fetched server-side with an allow-listed fetcher (SSRF protection, size and time limits).
- Report from any message captures the message and a window of surrounding messages for moderators.
- Message bodies are stored encrypted at rest by the database volume; end-to-end encryption is out of scope.

## 9. Auth, identity and anti-abuse

**Sign-in flow**

1. Turnstile token is verified server-side before any signup, login or OTP request.
2. User signs up with GitHub OAuth or email and password; email verification link is required.
3. Phone verification sends an OTP through the WhatsApp Cloud API authentication template (Firebase phone auth as fallback). The OTP is stored hashed in Redis with a 5-minute TTL and a limited number of attempts.
4. Phone is normalised to E.164, then a unique constraint rejects a second active account with the same number.
5. Optional college email verification sends a link to the address; the domain must match a row in `colleges` to earn the badge.
6. Sessions are server-side rows (hashed token in a cookie), rotated on privilege change, with device list and remote sign-out.

**Passwords and recovery**

- Argon2id hashing; breached-password check on signup; email-based reset with single-use tokens; account recovery via verified phone.
- GitHub-only accounts have no password; recovery goes through GitHub or the verified email.

**Duplicate and fake account defenses** (layered; none is perfect)

| Signal | Use |
| --- | --- |
| Verified phone | Hard unique constraint |
| GitHub account | Unique `github_id`; account age and public activity shown to reviewers and used as a trust signal |
| College email | Badge, plus unique per college email |
| Turnstile and rate limits | Slows scripted signups |
| Device and IP signals | Soft flags: many signups from one device or IP raise a moderation review, not an auto-ban |
| Behavior | New accounts have lower daily connect caps and no first-message ability to unconnected users |

**Authorization**

- Authorization is checked in the service layer with explicit policy functions (`canMessage`, `canViewProfile`, `canManageTeam`, `canReview`), each unit-tested, with a deny-by-default stance.
- Admin routes require a separate role, Cloudflare Access, and write to the audit log.
- Rate-limit buckets live in Redis using a sliding window; keys include user id and IP.

## 10. Storage, background jobs, caching and notifications

**Object storage (Cloudflare R2)**

- Buckets: `app-public` (processed avatars and team images, served through a Cloudflare custom domain and CDN cache) and `app-private` (original uploads, exports, backups).
- Upload flow: the client requests a presigned PUT URL with a size and type limit, uploads directly to R2, then calls the API to confirm. A worker validates the file type by content, strips EXIF, creates fixed-size variants, runs the image safety check, and only then marks the photo live.
- Keys are random (`avatars/{userId}/{uuid}.webp`), never user-supplied names. Lifecycle rules delete orphaned uploads after 24 hours.

**Redis keys**

| Key | Purpose | TTL |
| --- | --- | --- |
| `sess:{hash}` | Session cache in front of the sessions table | session lifetime |
| `rl:{scope}:{id}:{window}` | Sliding-window rate limits | window length |
| `otp:{phoneHash}` | Hashed OTP and attempt count | 5 minutes |
| `disc:queue:{userId}` | Ordered discovery candidates | 24 hours |
| `card:{userId}` | Serialised profile card | 10 minutes, deleted on profile change |
| `presence:{userId}` | Online marker | 60 seconds, refreshed by ping |
| `unread:{userId}:{convId}` | Fast unread counter | none, reconciled nightly |
| `gh:ratelimit` | GitHub API budget tracking | rolling |

**Background jobs (BullMQ)**

| Queue | Jobs | Notes |
| --- | --- | --- |
| `outbox` | Relay outbox events to the right queues | Runs every second; at-least-once |
| `notify` | In-app, push and email dispatch with per-type preferences | Push collapsed per conversation |
| `discovery` | Build and refill discovery queues, nightly rebuild | Concurrency limited to protect Postgres |
| `embeddings` | Compute profile embeddings, backfills | Debounced per user |
| `github` | Sync repos and languages for connected accounts | Respect GitHub rate limits; conditional requests with ETags |
| `media` | Image validation, resize, moderation check | Retries with backoff |
| `reviews` | Open review windows, publish hidden reviews after the deadline | Scheduled |
| `lifecycle` | Expire requests after 14 days, close teams after the hackathon, purge deleted accounts | Daily schedule |
| `digest` | Weekly email digest of matches and open teams | Weekly schedule |

All jobs are idempotent, have retry limits with exponential backoff, and failed jobs land in a dead-letter queue that raises an alert.

**Notification policy**

| Event | In-app | Push | Email |
| --- | --- | --- | --- |
| Request received or accepted | Yes | Yes | No |
| New message | Yes | Yes, collapsed, only when offline | No |
| Team join request, accepted or rejected | Yes | Yes | No |
| Review prompt | Yes | Yes | Yes |
| Weekly digest | No | No | Yes |
| Account and security events | Yes | No | Yes |

Skips and rejections never generate a notification.

## 11. Security, privacy and DPDP compliance engineering

**Application security**

- OWASP ASVS Level 2 as the checklist; threat model reviewed per milestone.
- Strict Content Security Policy, secure headers, CSRF protection, SameSite cookies, output encoding by default in React.
- Input validation on every boundary (Zod); parameterised queries only through Drizzle; no string-built SQL.
- SSRF protection for link previews and GitHub fetches; allow-listed egress from the worker VM.
- File uploads: type sniffing, size caps, EXIF stripping, no execution paths, separate domain for user content.
- Dependency scanning (Dependabot and `pnpm audit`), container image scanning, secret scanning in CI.
- Admin and staging behind Cloudflare Access; SSH keys only, no passwords, fail2ban or equivalent.
- Least-privilege database roles: the app role cannot alter schema; migrations run with a separate role.

**Data protection**

- TLS everywhere (Cloudflare to origin over the tunnel; app to Postgres and Redis over private networking with TLS).
- Encryption at rest on database volumes, R2 and backups. Backup bucket is separate with restricted credentials.
- Phone numbers and emails are never returned by public endpoints; log scrubbing removes tokens, OTPs and phone numbers.

**DPDP Act 2023 engineering requirements**

| Requirement | Implementation |
| --- | --- |
| Notice and consent | Versioned consent record (`consent_version`, timestamp) captured at signup; re-consent flow when the policy changes |
| Purpose limitation | Data used only for matching, safety and service communication; analytics events carry no personal content |
| Access and portability | `POST /me/export` produces a downloadable archive (profile, history, requests, messages) via a worker |
| Erasure | `DELETE /me` starts account deletion: immediate deactivation, personal data purged after a short grace window; reviews and reports retained in anonymised form where needed for safety |
| Grievance | In-app contact and a named grievance officer shown in the policy page |
| Breach response | Runbook with detection, assessment, notification steps and owner |
| Children's data | 18+ gate at signup (see PRD open decisions) |
| Retention | Defined retention for messages, logs and backups; scheduled purge jobs |

Have the privacy policy and terms reviewed by a lawyer before launch; this table is an engineering checklist, not legal advice.

## 12. Observability, CI/CD, testing, backups and disaster recovery

**Observability**

- Structured JSON logs (pino) with a request id that flows from nginx through API, queue jobs and WebSocket events.
- OpenTelemetry traces and metrics to Grafana Cloud or Better Stack; Sentry for errors in web, API, realtime and workers.
- Dashboards: API latency and error rate, WebSocket connections, queue depth and age, Postgres connections and slow queries, Redis memory, discovery queue hit rate.
- Alerts to a phone-reachable channel: error-rate spike, queue age over threshold, dead-letter growth, failed backup, disk and memory pressure, health check failures.
- PostHog funnel events: signup, profile completed, first connect, first accept, first message, team formed.

**CI/CD**

1. Pull request: lint, typecheck, unit and integration tests (Testcontainers Postgres and Redis), migration check, Docker build, preview deployment of the web app.
2. Merge to `main`: build and push images to GHCR, deploy to staging automatically, run Playwright smoke tests.
3. Production deploy: manual approval, run migrations first (backward-compatible, expand then contract), then roll containers one VM at a time with health checks, with automatic rollback if checks fail.
4. Database migrations never drop or rename in the same release that stops using a column.

**Testing strategy**

| Level | Tooling | Focus |
| --- | --- | --- |
| Unit | Vitest | Scoring functions, policy functions, state machines for requests, teams and reviews |
| Integration | Vitest + Fastify inject + Testcontainers | Each API module against a real Postgres and Redis; authorization matrix |
| Contract | OpenAPI diff in CI | No accidental breaking API changes |
| End to end | Playwright | Signup, onboarding, connect and accept, join a team, chat, report |
| Load | k6 | Discovery pop, message send, 5,000 concurrent sockets, queue throughput |
| Security | ZAP baseline scan in CI, dependency audit | Regressions in headers, injection, auth |

**Backups and disaster recovery**

- Postgres: automated daily snapshots plus point-in-time recovery; WAL archived to R2 if self-hosted.
- Redis: AOF with hourly snapshots; treated as rebuildable, so only sessions and unread counters are lost in a worst case.
- R2: versioning on the private bucket; public assets can be regenerated from originals.
- Targets at launch: recovery point under 15 minutes, recovery time under 4 hours.
- A restore drill is run into staging before launch and every quarter; a backup that has never been restored does not count.
- Runbooks in `docs/runbooks/` for: database failover, Redis loss, Cloudflare tunnel down, bad deploy rollback, credential leak, and abuse spike.

## 13. Scaling plan and capacity assumptions

The launch target is 50,000 registered users and 5,000 concurrent WebSocket connections. The design reaches that without re-architecture; the table says what to change when each limit is reached.

| Signal | First response | Later response |
| --- | --- | --- |
| API CPU high | Add API containers or a third app VM | Autoscaling group behind Cloudflare Load Balancing |
| Many WebSocket connections | Add realtime containers; raise file descriptor limits | Move realtime to its own VM pool |
| Postgres CPU or connections | PgBouncer tuning, missing indexes, read cache for cards | Read replica for discovery and profile reads |
| Discovery builds slow | Lower candidate pool, tighten indexes, batch scoring | Partition by college or city; precompute offline |
| Redis memory | Shorten TTLs, trim queue length | Separate Redis for queues and for cache |
| Search slow | Better trigram and GIN indexes | Typesense or Meilisearch |
| Messages table large | Partition by month, archive old messages | Dedicated message store |
| New region (outside India) | Cloudflare Load Balancing with a second origin pool | Regional Postgres replicas |

**Cost posture.** Cloudflare and R2 stay on low tiers early (R2 has no egress fees). Use the smallest VM sizes that pass the load test with headroom, and review spend monthly. Keep staging small and shut it down outside working hours if needed.

## 14. Build plan for Claude Code

Build in vertical milestones, each ending with something that runs, is tested and is deployed to staging. Each milestone maps to PRD requirement IDs so scope is unambiguous.

| Milestone | Scope | PRD IDs | Exit criteria |
| --- | --- | --- | --- |
| M0 Foundations | Monorepo, TypeScript and lint config, env validation, Docker Compose (Postgres, Redis, Mailpit), `packages/db` with migrations, Fastify skeleton with `/health`, pino logging, Sentry, GitHub Actions, Terraform skeleton, staging deploy | none | `pnpm dev` starts everything; CI green; a hello-world deploy reaches staging through Cloudflare Tunnel and nginx |
| M1 Auth and identity | Better Auth with GitHub OAuth and email; email verification; phone OTP behind a provider interface (mock for dev, WhatsApp or Firebase for real); Turnstile; rate limiting; sessions; consent and age gate | AUTH-1 to AUTH-8 | Full signup and login flow works end to end; unique phone enforced; abuse limits tested |
| M2 Profiles | Skills and roles seed data, colleges, profile CRUD, photo upload to R2 with media worker, GitHub sync worker, hackathon history, projects, completeness score | PROF-1 to PROF-6 | A complete profile can be built and viewed; GitHub data syncs in the background and is cached |
| M3 Discovery and requests | Swipes, candidate query, scoring v1 (filters and skill complementarity), Redis queues, discover endpoints, request state machine, connections, blocks, daily caps | DISC-1 to DISC-7, REQ-1 to REQ-7 | Two test users can find, connect and accept; blocked users never appear; state machine fully unit tested |
| M4 Messaging and realtime | Realtime server, conversations, send path with idempotency, unread counts, presence, web push, notification centre, report endpoint | MSG-1 to MSG-5, MSG-7, NOTIF-1, NOTIF-2, SAFE-1, SAFE-3 | Messages deliver in under a second across two containers; reconnect replays missed messages |
| M5 Hackathons and teams | Hackathon entities, teams, positions, join requests, owner approval, team directory and detail page, group chat, leave and remove | HACK-1 to HACK-3, TEAM-1 to TEAM-7, TEAM-9 | A team can be created, recruit a member, and chat; position counts stay correct under concurrent accepts |
| M6 Launch readiness | Admin dashboard and audit log, moderation actions, notification preferences, account export and deletion, Cloudflare WAF and rate rules, dashboards and alerts, k6 load test, restore drill, Playwright suite, security review, legal pages | AUTH-8, SAFE-2, NOTIF-4, NFRs | Load test meets targets; restore drill passed; launch checklist complete |
| M7 Trust and matching | Embeddings worker, vector ranking, preference settings, reviews with blind window, reliability stats, achievement verification, team invites | PROF-7, PROF-9, DISC-5, REV-1 to REV-6, SAFE-6, TEAM-8, TEAM-10, TEAM-11 | Reviews unlock only for eligible teammates; ranking beats v1 on acceptance rate in staging replays |
| M8 Growth | Public profile pages and share cards, WhatsApp sharing links, weekly digest, image sharing, Expo mobile app | PROF-10, NOTIF-3, MSG-6 | Shared links render previews; mobile app reaches feature parity for discovery and chat |

**Definition of done (every milestone and every PR)**

- Acceptance criteria from the PRD are demonstrably met; each requirement ID has at least one test.
- Migration is backward-compatible and reviewed; OpenAPI schema is regenerated and committed.
- Authorization policy tests cover allowed and denied cases.
- No secrets in code; new env vars documented in `packages/config` and `.env.example`.
- Logs, metrics and error reporting added for new code paths; runbook updated if operations change.
- Feature is behind a flag if it affects discovery ranking, notifications or messaging.

**Suggested way of working with Claude Code**

1. Put this PRD and TRD in `docs/` and keep `CLAUDE.md` short, pointing to them.
2. Start each milestone in plan mode: ask Claude Code to read the PRD IDs and TRD sections for that milestone and propose a task list before writing code.
3. One milestone per branch, small commits, tests first for state machines and policy functions.
4. Clear the session between milestones; re-anchor with the docs and the repository state.
5. Record any decision that deviates from the TRD as an ADR in `docs/adr/`, and update the TRD.

**Suggested `CLAUDE.md`**

```markdown
# Hackathon Teammate Network

Student networking product for finding hackathon teammates. Read before coding:
- docs/PRD.md (what and why, requirement IDs)
- docs/TRD.md (how: stack, data model, API, infra)

## Stack
TypeScript everywhere. pnpm + Turborepo monorepo. Next.js web, Fastify API, Socket.IO realtime,
BullMQ workers, PostgreSQL (Drizzle, pgvector), Redis, Cloudflare R2. Deployed with Docker on VMs
behind nginx and Cloudflare Tunnel.

## Commands
- pnpm dev          start all apps and local services
- pnpm test         unit and integration tests
- pnpm lint && pnpm typecheck
- pnpm db:migrate   apply migrations;  pnpm db:generate  create one from schema changes

## Rules
- Work one milestone at a time (TRD section 14). Propose a plan before editing.
- Modular monolith: modules call each other through services and events, never across tables.
- Validate all input with Zod. No `any` at module boundaries.
- Authorization lives in policy functions in the service layer; deny by default; test them.
- Never edit the database by hand; every change is a Drizzle migration, backward-compatible.
- Retryable writes take an Idempotency-Key. Domain events go through the outbox table.
- Never log tokens, OTPs, phone numbers or message bodies.
- Do not expose email or phone in any public response.
- Secrets come from env via packages/config; never commit .env files.
- Cite requirement IDs (e.g. REQ-3) in PR descriptions and tests.

## When unsure
Ask, or record an ADR in docs/adr/. Do not widen scope beyond the PRD.
```
