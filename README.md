# TheOpenLearn

Gamified, AI-assisted learning planner built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Clerk**, **Prisma (PostgreSQL)**, **next-intl**, **Framer Motion**, and **React Hook Form + Zod**.

Users supply a **link**, **PDF** (file picker + pasted text for MVP), or **plain text**. The app runs an **understanding** step (mock or real AI), shows a **confirmation dialog**, then generates a **roadmap** with phases, tasks, resources, evaluations, XP, and achievements.

## Prerequisites

- Node.js 20+
- PostgreSQL database (or use Docker Compose below)
- [Clerk](https://clerk.com) application (publishable + secret keys)

## Database with Docker Compose

From the project root:

```bash
npm run docker:up
# same as: docker compose up -d
```

This starts **PostgreSQL 16** with user/db `openlearn`, password `openlearn`. The host port defaults to **59123** (`OPENLEARN_DB_PORT` in `.env`). Use the **same port** in `DATABASE_URL` (see `.env.example`).

If you see **“port is already allocated”**, Docker never starts `openlearn-db`, but Prisma still connects to **whatever else** is on that port → misleading **“credentials for openlearn are not valid”**. Fix: set a free port in `.env` for both `OPENLEARN_DB_PORT` and `DATABASE_URL`, then `docker compose up -d`.

Then run:

```bash
npm run db:push
npm run db:seed
```

Stop / remove:

```bash
npm run docker:down
docker compose down -v   # wipes data volume (or: npm run docker:reset)
```

Follow DB logs: `npm run docker:logs`.

**Prisma “credentials … not valid” for user `openlearn`:**  
The server is reachable, but the **password does not match** what this Postgres instance was first created with. That almost always means an **old Docker volume** from a previous `docker-compose.yml` (or you’re pointed at a different Postgres on the same port).

1. **Confirm the container DB accepts `openlearn` / `openlearn`:**

   ```bash
   npm run db:verify:docker
   ```

   You should see one row with `current_user = openlearn`. If this fails, the volume does not match the compose file.

2. **Reset volume + schema in one command** (deletes local DB data):

   ```bash
   npm run db:reset:all
   ```

   This runs `docker compose down -v`, starts Postgres (`--wait` until healthy), `prisma db push`, and `db:seed`.

3. **Restart Next** (`npm run dev`) so it picks up `.env`.

Use **`127.0.0.1`** in `DATABASE_URL` (not only `localhost`) on macOS if you ever see odd connection behaviour (`.env.example` uses `127.0.0.1`).

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and fill in values:

   - `DATABASE_URL` — e.g. Docker Compose URL above, or your own PostgreSQL string
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - Optional: `AI_PROVIDER` — defaults to `mock`; set to `openai` / `anthropic` only after you implement the provider (see below)

3. **Database**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Serbian locale: [http://localhost:3000/sr](http://localhost:3000/sr).

## Project layout

| Path | Role |
|------|------|
| `app/[locale]/` | Pages: landing, auth, dashboard, learn flow, roadmap, task |
| `components/ui/` | Reusable UI primitives (button, card, dialog, …) |
| `features/` | Feature UI (landing, learning wizard, roadmap views) |
| `i18n/` | Routing, request config, localized `Link` / `redirect` |
| `messages/` | `en.json`, `sr.json` copy |
| `prisma/schema.prisma` | Data model |
| `server/ai/` | AI abstraction + mock templates |
| `server/actions/` | Server Actions (analyze, create roadmap, complete task, …) |
| `lib/` | DB client, auth helpers, topic normalization / similarity |
| `types/ai.ts` | Shared AI DTOs |

## AI provider (mock → real)

Environment variables for each option are spelled out in **`.env.example`** (filled placeholder shapes so you know what to paste).

- **mock:** `AI_PROVIDER=mock` — no API keys.
- **openai:** `AI_PROVIDER=openai` plus `OPENAI_API_KEY` (and optional `OPENAI_MODEL`, `OPENAI_ORG_ID`). Keys look like `sk-proj-…`.
- **anthropic:** `AI_PROVIDER=anthropic` plus `ANTHROPIC_API_KEY` (and optional `ANTHROPIC_MODEL`). Keys look like `sk-ant-api03-…`.

Implementation note: **`openai`** and **`anthropic`** still need provider code in `server/ai/` (`AI_PROVIDER` is read in `server/ai/ai-service.ts`). Until that is wired, use **`mock`** for a working app.

- **Mock (default):** `server/ai/mock-templates.ts` returns sample roadmaps (e.g. React / music theory); otherwise a generic path.

## PDF parsing (MVP vs later)

- **MVP:** PDF upload stores `sourceFileName`; users paste excerpts into the main content field. `LearningIntent.sourceContent` holds text (and optional filename metadata).
- **Later:** Add a parser service (e.g. `pdf-parse`, cloud OCR, or an AI file API), upload to object storage, and replace `sourceContent` with extracted text before calling `analyzeUnderstanding`.

## Duplicate learning detection

`lib/normalize-topic.ts` provides normalization and a simple **Jaccard-style token overlap** in addition to equality / substring checks. Swap in embeddings or an external similarity API inside that module without changing the rest of the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Production server |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run docker:up` / `docker:down` | Start/stop Compose Postgres |
| `npm run docker:logs` | Tail Postgres logs |
| `npm run docker:reset` | `docker compose down -v` (delete volume) |
| `npm run db:reset:all` | Reset volume, start DB, `db push`, seed |
| `npm run db:verify:docker` | `psql` inside container (check `openlearn` user) |
| `npm run db:push` | Push Prisma schema (dev) |
| `npm run db:pull` | Introspect DB → schema |
| `npm run db:migrate` | `prisma migrate dev` (when you use migrations) |
| `npm run db:migrate:deploy` | `prisma migrate deploy` (CI/production) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:seed` | Seed achievements |
| `npm run db:studio` | Prisma Studio |
| `postinstall` | `prisma generate` after `npm install` |

## Clerk notes (v7)

Control components like `SignedIn` / `SignedOut` are not re-exported from `@clerk/nextjs` in v7 the same way; the landing page uses **`useAuth()`** for conditional UI. Prefer [Clerk’s `Show` component](https://clerk.com/docs) on the server if you migrate sections to RSC-only trees.

## License

Private / your terms.
