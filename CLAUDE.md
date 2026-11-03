# Hackathon Teammate Network

Web app where B.Tech students find hackathon teammates outside their friend circle: one-card-at-a-time people discovery, a teams directory, request/accept connections, chat, and (later) reviews tied to real teams.

Read before coding:
- `docs/DECISIONS.md` — latest decisions; **overrides the PRD and TRD where they disagree**
- `docs/MODULES.md` — build order and the current module
- `docs/PRD.md` — requirements and IDs (AUTH-1, DISC-3, ...)
- `docs/TRD.md` — original technical design; data model and matching still apply, infrastructure is superseded

@AGENTS.md

## Stack
Next.js 16 (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, Realtime, Storage) on free tiers. Zod for validation. npm.
Next.js 16 renamed `middleware.ts` to `src/proxy.ts`. Check `node_modules/next/dist/docs/` before using a Next.js API.

## Commands
- `npm run dev` — start the app
- `npm run lint` / `npm run typecheck` / `npm run build` — all must pass before a module is done

## Rules
- Work one module at a time (`docs/MODULES.md`). Propose a plan before editing; don't start the next module unasked.
- Every schema change is a migration file in `supabase/migrations/`. Never change the database by hand.
- RLS is on for every table, with explicit policies. Writes that touch several rows go in one Postgres function.
- Use `src/lib/supabase/server.ts` on the server and `client.ts` in the browser. Never use the service-role key in browser code.
- Validate all input with Zod. No `any` at boundaries.
- Never return or log another user's email. No phone numbers are collected.
- No paid services without the founder's approval.
- Cite PRD IDs in commits and tests. Record new decisions in `docs/DECISIONS.md`.
