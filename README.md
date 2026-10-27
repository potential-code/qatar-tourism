# Qatar Tourism Academy (demonstration LMS)

A stateful demonstration of a Qatar Tourism branded Service Excellence Academy. It connects
public registration, personalised learning (Program B), a hybrid certification journey
(Program A), a trainer workspace and an Academy admin workspace. All data is fictional.

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

| Item                 | Decision                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Stack                | Bun, React 19 + Vite SPA, Hono API, Better Auth, Drizzle on PostgreSQL                      |
| SCORM format         | SCORM 2004 4th Edition sample package (C04), built for this demo, not an Articulate export  |
| AI mode              | Scripted, deterministic demo logic. No AI model is called. Labelled simulated in the UI     |
| Speech mode          | Browser speech recognition where available, typed fallback, labelled recorded demonstration |
| Email mode           | Simulated. Demo emails are written to the notification log. No external email is sent       |
| Hosting location     | To be confirmed by the client (see `docs/OPEN-QUESTIONS.md`)                                |
| Demo access duration | To be confirmed by the client (see `docs/OPEN-QUESTIONS.md`)                                |

## Prerequisites

- **Bun.** `package.json` pins `bun@1.4.2` and requires `>=1.4.0`. The Docker images use
  `oven/bun:1.4-alpine`. Local development has also been run on Bun 1.3.14.
- **PostgreSQL** (16 is used locally). You provide it yourself, natively or in a container. It is
  never part of the compose files.
- **Two databases:** one for the app (for example `qatar_tourism_db`) and a throwaway one for
  tests whose name contains `test` (for example `qatar_tourism_test`).
- **Mailpit is not required.** Only Better Auth's password-reset email uses the mail transport.
  Sending is fire-and-forget, so without Mailpit the failure is logged and nothing else breaks.
- **Chrome** (or another browser with the Web Speech API) for voice practice speech-to-text (see `docs/DEVIATIONS.md`).

## Environment

Copy `.env.example` to `.env` at the repository root. The server validates it at boot
(`server/config/env.ts`) and exits naming any bad key. An empty value counts as unset.

| Key                            | Required     | Purpose                                                                                       |
| ------------------------------ | ------------ | --------------------------------------------------------------------------------------------- |
| `PORT`                         | no           | API port. Default `8000`                                                                      |
| `LOG_LEVEL`                    | no           | `info` by default                                                                             |
| `DATABASE_URL`                 | yes          | The app database                                                                              |
| `BETTER_AUTH_SECRET`           | yes          | At least 32 characters. `openssl rand -base64 32`                                             |
| `BETTER_AUTH_URL`              | yes          | Public origin of the API, for example `http://localhost:8000`                                 |
| `CLIENT_URL`                   | yes          | Browser origins allowed to call the API with cookies, comma-separated, exact match            |
| `TRUST_PROXY`                  | no           | `true` only behind your own proxy (Traefik under Dokploy)                                     |
| `API_RATE_LIMIT_PER_MINUTE`    | no           | Per-IP limit on `/api/*`. Default 300                                                         |
| `CREDENTIAL_RATE_LIMIT`        | no           | Sign-in and registration attempts per 15 minutes per IP. Default 50                           |
| `AWS_*`, `SES_FROM_EMAIL`      | no           | Amazon SES, used only when `NODE_ENV` is `staging` or `production`                            |
| `MAILPIT_HOST`, `MAILPIT_PORT` | no           | Local mail transport. Defaults `localhost:1025`                                               |
| `DEMO_REFERENCE_DATE`          | no           | `YYYY-MM-DD`. Every "Day +N" in the seed is relative to it. Unset: today (Qatar) at seed time |
| `SEED_DEMO_PASSWORD`           | yes, to seed | One shared password for every seeded account. At least 12 characters                          |
| `ALLOW_DEMO_SEED`              | no           | Must be `true` for seeding or reset to run when `NODE_ENV=production`                         |
| `TEST_DATABASE_URL`            | for tests    | Throwaway database. The tests truncate it                                                     |
| `VITE_API_URL`                 | yes          | API origin compiled into the client. The client build fails without it                        |

`VITE_*` values are public: they are compiled into the JavaScript the browser downloads.
`.env` has no `NODE_ENV`. Do not add one: the client build reads the same file.

## Ports

The defaults in code are **API 8000** and **client 5173** (`client/vite.config.ts`). Docker
serves the client on 5000 through nginx.

This machine's `.env` uses **API 8140 and client 5240**, because other local projects hold the
defaults. Ports are configurable:

- API: `PORT`, plus `BETTER_AUTH_URL` and `VITE_API_URL` pointing at it.
- Client: pass `--port` to Vite, plus `CLIENT_URL` pointing at it. `bun run dev` always starts
  the client on 5173. For another port run the two halves separately:

  ```bash
  bun run dev:server                 # API on $PORT
  bun run dev:client --port 5240     # client on 5240
  ```

`playwright.config.ts` and `e2e/support/env.ts` hard-code `http://localhost:8140` and
`http://localhost:5240`. To run the end-to-end suite on other ports, change both files.

## First run

```bash
bun install
cp .env.example .env              # then fill in the keys above
bun run db:migrate                # applies server/db/migrations
bun run db:seed                   # the deterministic demo dataset
bun run dev                       # API and client together, both watching
```

The seed prints the reference date and the row counts. Sign in at the client URL with a demo
account below.

For the tests, migrate the test database once:

```bash
DATABASE_URL="$TEST_DATABASE_URL" bun run db:migrate
```

## Seed and reset

The seed is deterministic: the same reference date always produces the same rows, IDs and
charts. Three ways to reset, all doing the same thing (truncate every table, rebuild the dataset
in one transaction):

| Way          | How                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Command line | `bun run db:reset` (identical to `bun run db:seed`). A running server picks up the new demo clock within 15 seconds |
| Admin screen | Academy Management → Audit and demo reset (`/admin/manage/audit`) → **Reset demo data**, then confirm               |
| API          | `POST /api/demo/reset` with body `{ "confirm": true }`, signed in as the admin                                      |

The admin screen and the API keep the calling admin signed in and write a `demo.reset` audit
event. Learners and trainers get 403.

**Production guard.** Seeding and reset refuse to run when `NODE_ENV=production` unless
`ALLOW_DEMO_SEED=true`. Set it only on a hosted demonstration deployment.

Reset does not delete uploaded files under `uploads/`. See `docs/DATA-DELETION.md`.

## Demo accounts

Every seeded account uses the password in `SEED_DEMO_PASSWORD`. The end-to-end suite expects
`DemoAcademy2026!` (`e2e/support/env.ts`), so use that value if you run it.

| Account                                                | Role                                     |
| ------------------------------------------------------ | ---------------------------------------- |
| `admin@example.com` (Academy Admin)                    | Demo administrator. Has the demo toolbar |
| `trainer01@example.com` to `trainer10@example.com`     | Trainers T01 to T10                      |
| `learner0001@example.com` to `learner1200@example.com` | Learners L0001 to L1200                  |

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

The two simulated SSO buttons sign in as fixed learners `learner0013@example.com` and
`learner0016@example.com`.

## Scripts

All scripts run from the repository root.

| Script                  | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `bun run dev`           | API and client together, both watching (client on 5173)           |
| `bun run dev:server`    | API only, on `$PORT`                                              |
| `bun run dev:client`    | Client only. Add `--port <n>` for another port                    |
| `bun run build`         | Typecheck, bundle the API into `server/dist`, build `client/dist` |
| `bun run start:server`  | Run the built API                                                 |
| `bun run typecheck`     | `tsc --noEmit` over client, server and shared                     |
| `bun run lint`          | Biome lint and format check                                       |
| `bun run format`        | Biome, fixing what it can                                         |
| `bun run test`          | Server and shared tests, then client tests                        |
| `bun run test:e2e`      | Playwright walkthrough (brief §17). Resets the demo first         |
| `bun run db:generate`   | Write a migration from the schema                                 |
| `bun run db:migrate`    | Apply migrations                                                  |
| `bun run db:studio`     | Drizzle Studio                                                    |
| `bun run db:seed`       | Seed the demo dataset                                             |
| `bun run db:reset`      | Restore the demo snapshot (same as `db:seed`)                     |
| `bun run auth:generate` | Regenerate `server/db/schema/auth.ts` from the Better Auth config |

## Tests

```bash
bun run test        # unit and integration tests
bun run test:e2e    # end-to-end walkthrough
```

- `bun run test` forces `DATABASE_URL` to `TEST_DATABASE_URL`, so it can never truncate the
  app database. Tests that need a database are skipped when `TEST_DATABASE_URL` is unset.
- `bun run test:e2e` runs against the **app database**. Its global setup calls the admin
  reset, and the last spec resets again, so the demo ends in its starting state. It starts the
  API and client itself on 8140 and 5240, or reuses ones already running there. It needs
  `SEED_DEMO_PASSWORD=DemoAcademy2026!`. Set `E2E_SKIP_RESET=1` to skip the first reset while
  iterating on one spec.
- The specs follow the walkthrough minute by minute (`e2e/01-…` to `e2e/08-…`). The HTML
  report goes to `e2e/.report`.

## Deployment (Docker and Dokploy)

The repository follows the house Dokploy standard: Dokploy owns routing, TLS and ports, and
the compose files list only what to build and which variables each service reads. There is no
database in compose.

| Service | Image                           | Port | Notes                                         |
| ------- | ------------------------------- | ---- | --------------------------------------------- |
| server  | `oven/bun:1.4-alpine`, non-root | 8000 | `entrypoint.sh` runs migrations, then the API |
| client  | `nginx:stable-alpine`           | 5000 | `VITE_API_URL` is a build argument            |
- `docker-compose.yml` sets `NODE_ENV=production`. `docker-compose.staging.yml` differs only in
  `NODE_ENV=staging`.
- Put the client and the API under one parent domain (for example `academy.example.com` and
  `api.academy.example.com`) so the session cookie is same-site.
- `BETTER_AUTH_URL` is the API's public origin. `CLIENT_URL` is the client's.
- Set `TRUST_PROXY=true` behind Dokploy (compose defaults it to `true`).

**Before a hosted demo.** Three gaps in the deployment files as they stand today:

1. The compose files do not pass `SEED_DEMO_PASSWORD`, `ALLOW_DEMO_SEED` or
   `DEMO_REFERENCE_DATE` to the server. Without `ALLOW_DEMO_SEED=true` and `SEED_DEMO_PASSWORD`,
   the admin reset fails on the hosted demo. Add them to the server's `environment` block and
   set them in Dokploy.
2. The server image bundles only `index.js` and `migrate.js`, not the seed. Seed the hosted
   database once from a workstation:
   `DATABASE_URL=<hosted url> SEED_DEMO_PASSWORD=<password> bun run db:seed`. After that the
   admin reset works from the admin screen (once gap 1 is fixed).
3. Uploads are written to `/app/uploads` inside the container, which is not a volume. Mount a
   volume there if uploaded files must survive a redeploy, and check that the non-root `bun`
   user can write to it.

## Layout

```
client/src/        Vite SPA: routes/ (thin), features/<domain>/, components/, lib/, styles/
server/            Hono API: modules/<domain>/{routes,controller,service,policy,test}
server/db/         schema/, migrations/, seed/
shared/            roles, permission matrix, zod schemas, constants, curriculum content
scorm/             SCORM 2004 sample package source (C04)
e2e/               Playwright walkthrough specs
docs/              Brief, handover documents, architecture and decisions
```

See `docs/ARCHITECTURE.md` for the full folder map and rules.
