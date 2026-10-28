# Architecture

Qatar Tourism Academy demo: a stateful mockup LMS. Sources of truth, in order:

1. `docs/brief/BRIEF.txt`: the brief (§1–18). Content, rules, data, acceptance criteria.
2. `docs/brief/EMAIL.md`: Rawzaba's email. Design quality is a top priority, journeys must stay connected, and anything not live must be labelled simulated.
3. **Branding comes from qatartourism.com, not the brief.** See `client/src/styles/tokens.css` and `docs/DECISIONS.md` → "Brand source".
4. `docs/PLAN.md`: phases, agents, ownership.

## Stack

| Layer  | Choice                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------ |
| Client | React 19, Vite, TanStack Router (file routes) / Query / Table / Form, Tailwind 4, shadcn + Radix |
| Motion | `motion` (Framer Motion) everywhere; GSAP ScrollTrigger and Lenis on the public site only        |
| Server | Hono on Bun, Better Auth (cookie sessions), Drizzle on Postgres (`qatar_tourism_db`)             |
| Shared | `shared/` with zod schemas, roles, permissions matrix, constants and curriculum content          |
| Tests  | `bun test` (server via `app.request`, client via happy-dom); Playwright for the e2e walkthrough  |

Two processes: client on :5173 (nginx :5000 in Docker), API on :8000. These are the defaults in code. This machine's `.env` uses API :8140 and client :5240 because other projects hold the defaults; `playwright.config.ts` and `e2e/support/env.ts` hard-code 8140/5240. Ports are set by `PORT`, `BETTER_AUTH_URL`, `CLIENT_URL` and `VITE_API_URL` (see `README.md` → Ports). The client calls the API through the typed Hono RPC client (`client/src/lib/api.ts`).

## Folder map

```
client/src/
  app/             navigation.ts (portal nav, brief §5/§10/§12), providers
  routes/          THIN TanStack file routes: guard + compose a feature component. No logic.
    index.tsx, design.tsx, (auth)/, learner.tsx + learner/, trainer.tsx + trainer/, admin.tsx + admin/
  features/<domain>/
    components/    UI for this domain only
    hooks/         React hooks (useX)
    queries/       TanStack Query options + mutations (the only place that calls api)
    utils/         pure helpers
    types.ts
  components/
    ui/            shadcn primitives (brand-styled). Do not put feature logic here.
    brand/         Logo, ArchFrame (accent only), SwoopReveal, PhotoPanel, SectionHeading
    motion/        variants, Reveal/Stagger, CountUp, MotionPage, LenisProvider
    data/          StatCard, ProgressRing, charts/* (ChartCard, ColumnChart, DonutChart, …)
    layout/        PortalShell, PortalSidebar, PortalHeader, PageHeader, Breadcrumbs, DemoBadge, SimulatedTag
  lib/             api client, auth-client, route-guards, utils, analytics/{format,csv,types}
  styles/          tokens.css (brand), app.css (theme mapping)

server/
  modules/<domain>/
    <domain>.routes.ts      Hono router: validation + auth middleware, chained for RPC types
    <domain>.controller.ts  plain functions: map request → service call → response DTO
    <domain>.service.ts     business logic + Drizzle queries (ONLY place that touches the DB)
    <domain>.policy.ts      who may do what (brief §11). Called by services, enforced server-side.
    <domain>.test.ts
  db/schema/<domain>.ts     Drizzle tables, exported from db/schema/index.ts
  db/seed/                  deterministic demo dataset + reset snapshot
  middleware/               auth (requireAuth, requireRole), scope (withScope, assert...InScope), error, logger, rate-limit, validate
  modules/audit/audit.service.ts   audit(c, {...}) helper that services call for every audited write
  lib/                      errors, logger, clock (demo reference date)

shared/
  roles.ts, permissions.ts, schemas/<domain>.ts, constants/, content/
```

## Rules

- **Separation of concerns.** Routes compose, components render, queries fetch, services decide, policies authorise.
- **Permissions live on the server** (brief §11). Hiding a button is never the check. Trainer 1 must not get Trainer 2's roster by changing an ID.
- **Audit every write** that the brief lists: permission, marking, session, export, certificate and notification events.
- **No hard-coded numbers.** Every KPI, chart and report is computed from seeded rows, so totals reconcile and update after walkthrough actions.
- **Label every simulated capability** with `SimulatedTag` (scripted AI, SSO/CRM, demo email, online-classroom adapters, voice fallback).
- **Show the "Demo data" indicator** on data screens (`DemoBadge`). The footer notice is: "Demonstration environment. All learner and training data is fictional."
- **One ownership per file.** During parallel work an agent edits only its own `features/<x>` and `server/modules/<x>`. Shared files change only through the lead (see `docs/CONVENTIONS.md`).
