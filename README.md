# Qatar Tourism Academy (demonstration LMS)

A clickable, frontend-only demonstration of a Qatar Tourism branded Service Excellence Academy.
It connects public registration, personalised learning (Program B), a hybrid certification
journey (Program A), a trainer workspace and an Academy admin workspace. All data is fictional.

There is no backend. Browser services (`client/src/services`) run the business rules over a
seeded demo database (`client/src/mocks`) that each browser keeps in IndexedDB. The hosted demo
is a static site.

Built from Potential.com's brief (`docs/brief/BRIEF.txt`, §1–18) and Rawzaba's email
(`docs/brief/EMAIL.md`).

## Handover documents

| Document                                                           | What it covers                                             |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md)                         | The 15–20 minute presenter script (brief §17)              |
| [docs/FUNCTIONAL-VS-SIMULATED.md](docs/FUNCTIONAL-VS-SIMULATED.md) | What is real and what is simulated, and how the UI says so |
| [docs/PERMISSIONS.md](docs/PERMISSIONS.md)                         | The §11 permission matrix, where it is enforced, tests     |
| [docs/DATA-DELETION.md](docs/DATA-DELETION.md)                     | What data exists, where, and how to delete it              |
| [docs/DEVIATIONS.md](docs/DEVIATIONS.md)                           | Deviations from the brief and known gaps                   |
| [docs/ASSET-INVENTORY.md](docs/ASSET-INVENTORY.md)                 | Every image, video and package, with its source            |
| [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md)                   | Questions for Rawzaba and the client                       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                       | Stack, folders and rules                                   |
| [docs/DECISIONS.md](docs/DECISIONS.md)                             | Why things are built the way they are                      |

## Handover decisions (brief §18)

| Item                 | Decision                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Stack                | Bun, React 19 + Vite SPA. No backend: browser services over IndexedDB, served as static files |
| SCORM format         | SCORM 2004 4th Edition sample package (C04), built for this demo, not an Articulate export    |
| AI mode              | Scripted, deterministic demo logic. No AI model is called. Labelled simulated in the UI       |
| Speech mode          | Browser speech recognition where available, typed fallback, labelled recorded demonstration   |
| Email mode           | Simulated. Demo emails are written to the notification log. No external email is sent         |
| Hosting location     | To be confirmed by the client (see `docs/OPEN-QUESTIONS.md`)                                  |
| Demo access duration | To be confirmed by the client (see `docs/OPEN-QUESTIONS.md`)                                  |

## Prerequisites

- **Bun.** `package.json` pins `bun@1.4.2`. Local development has also been run on Bun 1.3.14.
  The Docker image builds with `oven/bun:1.4-alpine`.
- **Chrome** (or another browser with the Web Speech API) for voice practice speech-to-text
  (see `docs/DEVIATIONS.md`).

Nothing else. No database, no mail server, no API keys.

## First run

```bash
bun install
bun run dev        # Vite only, on http://localhost:5173
```

Open the URL and sign in with a demo account below. The first load seeds the demo data in the
browser.

## Environment

Every setting is optional. Copy `.env.example` to `.env` at the repository root to change one.

| Key                                                | Purpose                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `CLIENT_PORT`                                      | Port for `bun run dev`. Default `5173`. A `--port` flag overrides it                                            |
| `VITE_DEMO_REFERENCE_DATE`                         | `YYYY-MM-DD`. Every "Day +N" in the seed is relative to it. Unset: the fixed date in `shared/constants/demo.ts` |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`, `BASIC_AUTH` | Basic Auth for dev, preview and Docker. Default `admin` / `Potential`. See Deployment                          |

`VITE_*` values are public: they are compiled into the JavaScript the browser downloads.

This machine's main checkout runs the client on 5240. The e2e suite starts its own Vite server
on 5250 (`e2e/support/env.ts`).

## Where the data lives

- Each browser holds its **own copy** of the demo database in IndexedDB (`qta-demo`). Two
  browsers, or two people, never see each other's changes.
- Learner, trainer and admin views connect **within one browser**: switch roles with the demo
  toolbar (or sign out and in) in the same window, and each role sees the others' changes.
- Changes survive a reload. Files chosen for an assignment but not yet submitted do not.
- **Reset** restores the seed: Academy Management → Audit and demo reset
  (`/admin/manage/audit`) → **Reset demo data**, then confirm. The admin stays signed in.
  Learners and trainers cannot reach it.
- Clearing the site data for the demo's address in the browser also starts again from the seed.

The seed is deterministic: the same reference date always gives the same rows, IDs and charts.

## Demo accounts

Every seeded account uses the password **`password`**.

| Account                             | Role                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| `admin@example.com` (Academy Admin) | Demo administrator. Has the demo toolbar                         |
| `noor.haddad@example.com`           | Fresh learner L0036. Starts at the profile wizard                |
| `maha.alnouri@example.com`          | Principal persona L0001                                          |
| `amal.alnouri@example.com`          | Trainer T01. Every trainer is `firstname.lastname@example.com`   |
| Every other learner                 | `firstname.lastname@example.com`, e.g. `omar.alsafi@example.com` |

The sign-in page offers Noor, a trainer and the admin in one click. **More demo learners** lists
the personas below and Mariam. Addresses are name-based on purpose (`docs/DEVIATIONS.md` #9).

**Walkthrough personas** (brief §15):

| Code  | Name          | Starting state                                          |
| ----- | ------------- | ------------------------------------------------------- |
| L0001 | Maha Al Nouri | Program B, baseline 40, needs service recovery practice |
| L0002 | Omar Al Safi  | Program A, Level 1 complete, eligible to book           |
| L0003 | Leila Rahman  | Programs A and B, independent progress in each          |
| L0004 | Daniel Costa  | Program A assignment returned for revision              |
| L0005 | Sara Mansour  | Program B completed, pre 60 and post 100                |

**Trainers** (brief §16, T04 renamed, see `docs/DEVIATIONS.md`):

| Code | Name           | Code | Name          |
| ---- | -------------- | ---- | ------------- |
| T01  | Amal Al Nouri  | T06  | Priya Menon   |
| T02  | Khalid Mansour | T07  | Youssef Karim |
| T03  | Leila Haddad   | T08  | Sofia Martins |
| T04  | Rafael Sousa   | T09  | Hassan Farouk |
| T05  | Noura Al Saleh | T10  | Aisha Rahman  |

The **demo toolbar** appears only for `admin@example.com`. It switches between the five
personas, the ten trainers and the admin without re-entering passwords. It cannot reach any
other account.

The two simulated SSO buttons sign in as fixed learners `amira.alansari@example.com` (L0013) and
`rania.althani@example.com` (L0016).

For presenting or QA, `/<path>?demo-as=<userId>` opens any page signed in as a seeded account
(for example `/learner?demo-as=user-l0002` for Omar). Ids: `user-admin`, `user-t01` to
`user-t10`, `user-l0001` to `user-l1200`.

## Scripts

All scripts run from the repository root.

| Script                | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `bun run dev`         | Vite dev server only (port from `CLIENT_PORT`, default 5173)  |
| `bun run build`       | Typecheck, then build the static site into `client/dist`      |
| `bun run preview`     | Serve the built site locally (port 5000)                      |
| `bun run typecheck`   | `tsc --noEmit` over client, shared and e2e                    |
| `bun run lint`        | Biome lint and format check                                   |
| `bun run format`      | Biome, fixing what it can                                     |
| `bun run test`        | Client and shared tests (`bun test`, happy-dom)               |
| `bun run test:e2e`    | Playwright walkthrough (brief §17) and accessibility checks   |
| `bun run scorm:build` | Copy the C04 SCORM package from `scorm/` into `client/public` |

## Tests

```bash
bun run test        # services, seed totals, permissions, components
bun run test:e2e    # end-to-end walkthrough and accessibility
```

- `bun run test` covers the browser services (`client/src/services/__tests__`): the seed
  totals, permission and scope rules, booking and waitlist rules, certification and reset
  determinism. See `docs/PERMISSIONS.md`.
- `bun run test:e2e` starts its own Vite server on 5250. Each run uses a fresh browser, so it
  starts from the seed. The walkthrough specs (`e2e/01-…` to `e2e/06-…` and `e2e/08-reset`)
  share one browser context, so each role sees the previous role's changes, as in a live demo.
  `e2e/07-permissions` and `e2e/09-accessibility` use a fresh browser per test. The HTML report
  goes to `e2e/.report`.

## Deployment (Docker and Dokploy)

One static image, like `wep-mockup`: `Dockerfile` builds the site with Bun, then nginx serves
`client/dist`. No backend and no database.

- `docker/nginx.conf`: SPA fallback to `index.html`, open `/healthz`, immutable `/assets/`,
  `text/vtt` captions, byte-range video under `/media/`, the SCORM package under `/scorm/`.
- **Basic Auth.** `docker compose` and `bun run dev` default to `admin` / `Potential`; set
  `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` to change it. The browser asks once and reuses it on
  every page. In a bare `docker run` with either missing, the site answers 503, so it is never served unprotected by accident. `BASIC_AUTH=off` serves it openly
  (local runs only). `/healthz` is always open.
- `docker-compose.yml` is for Dokploy: one `web` service on container port 80, on the external
  `dokploy-network`, no `ports:`. Add the domain in Dokploy.
- `VITE_DEMO_REFERENCE_DATE` is a build argument.

```bash
docker build -t qatar-tourism .
docker run --rm -p 8080:80 -e BASIC_AUTH=off qatar-tourism   # http://localhost:8080
```

Hosting only serves files. Every visitor's demo data stays in their own browser.

## Layout

```
client/src/
  routes/          thin TanStack file routes: guard and compose a feature
  features/<x>/    pages and components per domain
  queries/         TanStack Query options and mutations (the UI's only door to services)
  services/        browser services: the business rules, permissions, audit and notifications
  mocks/           seed, in-memory demo database, IndexedDB persistence
  components/, lib/, hooks/, styles/, i18n/
shared/            roles, permission matrix, zod schemas, constants, curriculum content
scorm/             SCORM 2004 sample package source (C04)
e2e/               Playwright walkthrough specs
docker/            nginx config and the Basic Auth start script
docs/              brief, handover documents, architecture and decisions
```

See `docs/ARCHITECTURE.md` for the full folder map and rules.
