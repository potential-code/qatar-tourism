# Architecture

Qatar Tourism Academy demo: a stateful, frontend-only mockup LMS. There is no backend. Sources of truth, in order:

1. `docs/brief/BRIEF.txt`: the brief (§1–18). Content, rules, data, acceptance criteria.
2. `docs/brief/EMAIL.md`: Rawzaba's email. Design quality is a top priority, journeys must stay connected, and anything not live must be labelled simulated.
3. **Branding comes from qatartourism.com, not the brief.** See `client/src/styles/tokens.css` and `docs/DECISIONS.md` → "Brand source".
4. `docs/PLAN.md`: phases, agents, ownership.

## Stack

| Layer   | Choice                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------ |
| Client  | React 19, Vite, TanStack Router (file routes) / Query / Table / Form, Tailwind 4, shadcn + Radix |
| Motion  | `motion` (Framer Motion) everywhere; GSAP ScrollTrigger and Lenis on the public site only        |
| Data    | Browser services over an in-memory demo database, saved to IndexedDB. No server, no database     |
| Shared  | `shared/` with zod schemas, roles, permissions matrix, constants and curriculum content          |
| Tests   | `bun test` (services and components, happy-dom); Playwright for the e2e walkthrough              |
| Hosting | One static nginx image (`Dockerfile`, `docker/nginx.conf`)                                       |

One process in development: Vite on :5173 (`CLIENT_PORT` changes it). The e2e suite runs its
own Vite on :5250. The built site is plain files, served by nginx in Docker.

## Layering

```
routes  →  features  →  queries  →  services  →  mocks
```

- **routes** (`client/src/routes`): thin TanStack file routes. A guard (`requireRole`) and one
  feature component. No logic.
- **features** (`client/src/features/<domain>`): pages and components for one domain.
- **queries** (`features/<domain>/queries`, `client/src/queries`): TanStack Query options and
  mutations. The UI's only door to the services.
- **services** (`client/src/services`): the business rules. Each function checks the caller's
  role and scope, validates input with the shared zod schemas, reads or writes the demo
  database, writes audit events and notifications, and returns copies. They throw `ApiError`
  (`client/src/lib/api-error.ts`) with the old HTTP status, so screens keep their 401, 403,
  404 and 409 branches.
- **mocks** (`client/src/mocks`): the deterministic seed (`seed/`), the in-memory database
  (`db.ts`), table defaults and IndexedDB persistence (`persist.ts`).

The UI never imports `mocks/` or `services/` directly; it goes through queries. Swapping in a
real backend means replacing `services/` with API calls behind the same queries.

## How the data lives

- `services/boot.ts` loads the saved snapshot from IndexedDB before the first render, or seeds
  a new one. It also honours the `?demo-as=<userId>` deep link.
- Writes change the in-memory database and call `commit()`, which saves the whole snapshot to
  IndexedDB 250 ms later. Session changes save at once, and `pagehide` flushes a pending save.
- The demo clock (`services/clock.ts`) is 08:00 Qatar time on the reference date
  (`shared/constants/demo.ts`, or `VITE_DEMO_REFERENCE_DATE`).
- Reset (`services/demo.service.ts`, admin only) rebuilds the seed, empties stored uploads and
  keeps the admin signed in.
- Each browser has its own copy. Roles connect within one browser through the demo toolbar.

## Folder map

```
client/src/
  app/             navigation.ts (portal nav, brief §5/§10/§12)
  routes/          THIN TanStack file routes: guard + compose a feature component. No logic.
    index.tsx, design.tsx, (auth)/, learner.tsx + learner/, trainer.tsx + trainer/, admin.tsx + admin/
  features/<domain>/
    components/    UI for this domain only
    hooks/         React hooks (useX)
    queries/       TanStack Query options + mutations (the only place that calls services)
    utils/         pure helpers
    types.ts
  queries/         cross-feature queries (current user)
  services/
    api.ts         plumbing: delay, out, parseInput, insertRow/updateRow, commit, ApiError
    session-context.ts, scope.ts   who is calling, requireRole, record scope checks
    <domain>.service.ts            one file per domain, larger domains split into <domain>/
    __tests__/                     service tests (permissions, booking, certification, reset)
  mocks/
    seed/          deterministic dataset (brief §15–16), reference date
    db.ts          in-memory demo database, commit/flush, reset
    persist.ts     IndexedDB snapshots and uploaded file blobs
  components/
    ui/            shadcn primitives (brand-styled). Do not put feature logic here.
    brand/         Logo, ArchFrame (accent only), SwoopReveal, PhotoPanel, SectionHeading
    motion/        variants, Reveal/Stagger, CountUp, MotionPage, LenisProvider
    data/          StatCard, ProgressRing, charts/* (ChartCard, ColumnChart, DonutChart, …)
    layout/        PortalShell, PortalSidebar, PortalHeader, PageHeader, Breadcrumbs, DemoBadge, SimulatedTag
  hooks/           useSession, useAppForm, useReturnFocus
  lib/             api-error, route-guards, query-client, download, format/, analytics/{format,csv,types}
  config/          env.schema.ts (build-time check of VITE_* values)
  styles/          tokens.css (brand), app.css (theme mapping)

shared/
  roles.ts, permissions.ts, schemas/<domain>.ts, constants/, content/, types/, utils/

scorm/             C04 SCORM 2004 package source; `bun run scorm:build` copies it to client/public
docker/            nginx.conf, security-headers.conf, basic-auth.sh
e2e/               Playwright specs; support/walkthrough.ts shares one browser across the story
```

## Rules

- **Separation of concerns.** Routes compose, components render, queries fetch, services decide.
- **Permissions live in the services** (brief §11). Hiding a button is never the check. Trainer
  1 must not get Trainer 2's roster by changing an ID: `scope.ts` refuses it. Route guards only
  redirect. In this mockup the services run in the browser, so this is a faithful model of the
  rules, not a security boundary (see `docs/DEVIATIONS.md`).
- **Audit every write** that the brief lists: permission, marking, session, export, certificate
  and notification events.
- **No hard-coded numbers.** Every KPI, chart and report is computed from seeded rows, so totals
  reconcile and update after walkthrough actions.
- **Label every simulated capability** with `SimulatedTag` (scripted AI, SSO/CRM, demo email,
  online-classroom adapters, voice fallback).
- **Show the "Demo data" indicator** on data screens (`DemoBadge`). The footer notice is:
  "Demonstration environment. All learner and training data is fictional."
