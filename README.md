# Project skeleton

The starting point for every new full-stack project. Copy this directory, rename it, and build
your features on top. Whoever starts the project, it starts in the same shape: the same stack,
the same folders, the same security defaults, the same deployment.

It is base code, not a product. There is one worked example domain — `notes` — that runs
through every layer so you can see the pattern end to end, plus sign-in, roles, email, two
languages and a dashboard. Replace `notes` with your own domains and keep the pattern.

Why it is built this way, and what not to undo: [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Stack

|                  |                                                                        |
| ---------------- | ---------------------------------------------------------------------- |
| Runtime          | Bun 1.4, for development, builds and production                        |
| Language         | TypeScript 7 (the Go compiler)                                         |
| Frontend         | Vite 8 (Rolldown), React 19, single-page app served by nginx           |
| Routing          | TanStack Router, file-based, typed routes and search params            |
| Data             | TanStack Query; the Hono RPC client (`hc<AppType>`) for typed requests |
| Tables and forms | TanStack Table 9, TanStack Form                                        |
| UI               | Tailwind 4, shadcn/ui (new-york), lucide icons, Recharts               |
| Languages        | i18next with English and Arabic, right-to-left handled                 |
| Backend          | Hono on Bun                                                            |
| Validation       | Zod 4, one schema shared by the form and the API                       |
| Database         | PostgreSQL, Drizzle ORM and drizzle-kit, `postgres` driver             |
| Auth             | Better Auth: email and password, verified email, cookie sessions       |
| Email            | Handlebars templates; Mailpit locally, Amazon SES when deployed        |
| Lint and format  | Biome                                                                  |
| Tests            | `bun test`, Testing Library with happy-dom for components              |
| Deploy           | Docker images on Dokploy: API on 8000, client on 5000                  |

## Versions

Every dependency is on its latest stable release as of September 2026, checked for
compatibility with the others. Two deliberate holds:

- **Drizzle stays on 0.45.** 1.0 is still in beta.
- **Docker images do not float.** Bun is pinned to `oven/bun:1.4-alpine`, matching
  `packageManager` in `package.json`, and nginx to its stable line (`nginx:stable-alpine`), so a
  rebuild does not quietly change the runtime. Bump the image and `packageManager` together.

`bun outdated` from the root lists anything that has moved since.

## Starting a project from it

```bash
cp -r templates/project-skeleton ~/projects/my-app
cd ~/projects/my-app
git init
```

Then search for `project-skeleton` and `@workspace/` and rename them to your project.

## Running it locally

You provide PostgreSQL and Mailpit yourself — a native install or a standalone container. They
never go in this project's compose files.

```bash
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit   # inbox on :8025

bun install
cp .env.example .env
```

Fill in `.env`: `DATABASE_URL`, a `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), and the
`SEED_*` passwords. Then:

```bash
bun run db:generate    # first time only: writes the first migration from the schema
bun run db:migrate
bun run db:seed        # an admin and a user, credentials from .env
bun run dev            # API on :8000, client on :5173
```

The skeleton ships **no migration files**. The first migration belongs to your project's
history, so you generate it once after copying and commit it.

Sign in on http://localhost:5173 with the seeded admin. Verification and password-reset emails
arrive in Mailpit.

## Scripts

All scripts live in the root `package.json` and run from the root.

|                         |                                                                   |
| ----------------------- | ----------------------------------------------------------------- |
| `bun run dev`           | API and client together, both watching                            |
| `bun run build`         | typecheck, bundle the API into `server/dist`, build `client/dist` |
| `bun run start:server`  | run the built API                                                 |
| `bun run typecheck`     | `tsc --noEmit` over client, server and shared                     |
| `bun run test`          | server and client tests (no database needed)                      |
| `bun run lint`          | Biome lint and format check                                       |
| `bun run format`        | Biome, fixing what it can                                         |
| `bun run db:generate`   | write a migration from the schema                                 |
| `bun run db:migrate`    | apply migrations                                                  |
| `bun run db:studio`     | Drizzle Studio                                                    |
| `bun run db:seed`       | seed accounts; refuses to run in production                       |
| `bun run auth:generate` | regenerate `server/db/schema/auth.ts` from the Better Auth config |

There is no `db:push`, on purpose — see the deployment standard.

## Layout

```
client/                    Vite SPA
  src/
    routes/                file-based pages; (auth)/ for sign-in screens, _app/ behind sign-in
    components/            app components (PascalCase)
      ui/                  shadcn primitives (kebab-case, generated — edit sparingly)
    queries/               TanStack Query keys, options and mutations, one file per domain
    lib/                   api client, auth client, query client, route guards, cn()
    i18n/                  i18next setup and locales/{en,ar}/common.json
    hooks/  config/  styles/
  vite.config.ts           includes the plugin that keeps server code out of the bundle
  Dockerfile  nginx.conf
server/                    Hono API
  index.ts                 binds the port; graceful shutdown
  app.ts                   middleware stack, mounts every route, exports AppType
  routes/                  <domain>.routes.ts — URL, validator, middleware, c.json()
  controller/              <domain>.controller.ts — plain functions, no Hono
  services/                <domain>.service.ts — Drizzle, transactions, ownership
  middleware/              auth, errors, rate limits, validation, request logging
  auth/auth.ts             the Better Auth instance
  config/env.ts            environment, validated at boot; nothing else reads process.env
  db/                      connection, schema/, migrations/, migrate.ts, seed.ts
  templates/               Handlebars email templates
  lib/                     HttpError, logger
  Dockerfile  entrypoint.sh  build.ts
shared/                    imported by both sides: Zod schemas, roles
docs/                      DECISIONS.md, AWS-SECRETS.md
```

`client/` and `server/` each have a dependency-only `package.json`. `shared/` is a plain
directory. One hoisted `node_modules` at the root.

Path aliases: `@/` is `client/src`, `@shared/` is `shared`, `@server/` is `server`. The client
may use `@server/` only as `import type` — see below.

## How a request flows

```
browser ── hc<AppType> ──► routes/note.routes.ts     requireAuth, zod validation, c.json()
                               │
                               ▼
                           controller/note.controller.ts     plain args in, plain data out
                               │
                               ▼
                           services/note.service.ts          Drizzle; ownership in the query
```

The client never hand-writes a request type. `server/app.ts` exports `type AppType`, and
`client/src/lib/api.ts` builds a typed client from it:

```ts
import type { AppType } from '@server/app'

export const api = hc<AppType>(env.VITE_API_URL, { init: { credentials: 'include' } }).api

const res = await api.notes.$get({ query: { page: '1', pageSize: '20' } })
```

Rename a field in a service and the client stops compiling where it uses it.

## Adding a domain

Using `invoices` as the example:

1. **Schema.** Add `server/db/schema/invoice.ts`, export it from `server/db/schema/index.ts`,
   then run `bun run db:generate` and `bun run db:migrate`.
2. **Shared validation.** Add `shared/schemas/invoice.ts` with the request schemas, and export
   it from `shared/schemas/index.ts`.
3. **Service.** `server/services/invoice.service.ts`: the Drizzle queries. Every read and write
   that belongs to a user takes the user id and filters on it; a record the user does not own
   is "not found".
4. **Controller.** `server/controller/invoice.controller.ts`: take the viewer and the parsed
   input, call the service, return plain data.
5. **Routes.** `server/routes/invoice.routes.ts`: chain `.get()`, `.post()` and so on with
   `validate(...)` and the auth middleware, then mount it in `server/app.ts` with `.route()`.
   Keep the chain unbroken — that is what carries the types to the client.
6. **Client.** Add `client/src/queries/invoice.queries.ts`, then pages under
   `client/src/routes/_app/`. Put every string in both locale files.
7. **Tests.** Route tests with `app.request()` in `server/__tests__/`.

## Security, built in

| Measure                 | Where                                                                     |
| ----------------------- | ------------------------------------------------------------------------- |
| Server code stays out   | `client/vite.config.ts` fails the build if anything under `server/` loads |
| Validated environment   | `server/config/env.ts` exits at boot, naming the bad keys                 |
| Session cookie          | Better Auth: `HttpOnly`, `SameSite=Lax`, `Secure` when deployed           |
| Fresh user each request | session cookie cache off, so role changes and sign-outs apply at once     |
| Roles                   | `role` cannot be set by sign-up (`input: false`); `requireRole('admin')`  |
| Object-level access     | services filter by owner; not-owned and missing both answer 404           |
| CORS                    | exact origins from `CLIENT_URL`, credentials, never a wildcard            |
| CSRF                    | `hono/csrf` checks the origin of form posts; JSON requires CORS preflight |
| Rate limits             | 300/min per IP overall; 10 per 15 min on sign-in, sign-up, password reset |
| Real client IP          | taken from the socket; `X-Forwarded-For` only when `TRUST_PROXY=true`     |
| Security headers        | `hono/secure-headers` on the API, headers in `client/nginx.conf`          |
| Body size               | 1 MB limit                                                                |
| Errors                  | one JSON shape; no stack traces or internal messages when deployed        |
| Email verification      | required before sign-in                                                   |
| Seed accounts           | credentials from the environment; the seed refuses to run in production   |
| Open redirects          | `?redirect=` after sign-in accepts same-site paths only                   |

Every error the API returns has the same shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} } }
```

## Environment

Every key is in [`.env.example`](.env.example), grouped and commented. The server validates
them in `server/config/env.ts`; the client validates `VITE_API_URL` when it builds.

- An **empty value counts as unset.** Compose turns an unset `${VAR}` into an empty string, so
  this is what makes a key missing from Dokploy fail the deploy instead of slipping through.
- `VITE_*` values are compiled into the JavaScript the browser downloads. They are public —
  never put a secret behind that prefix — and changing one needs a rebuild.
- `.env` has no `NODE_ENV`. The server defaults to development, compose sets it when deployed,
  and because the client build reads the same file, a `NODE_ENV` there would make Vite bundle
  React's development build.
- Set `TRUST_PROXY=true` when deployed behind Dokploy, so rate limits see the real client IP.
- To keep secrets in AWS Secrets Manager instead of Dokploy, follow
  [`docs/AWS-SECRETS.md`](docs/AWS-SECRETS.md): setup, build and runtime flow, rotation and
  offboarding.

## Deployment

Follows the house deployment standard: Dokploy owns routing, TLS and ports; compose lists only
what to build and which `${VAR}`s each service reads; no database in compose.

|        | Image                         | Port | Notes                                                     |
| ------ | ----------------------------- | ---- | --------------------------------------------------------- |
| server | `oven/bun:1-alpine`, non-root | 8000 | migrations run in the entrypoint before the server starts |
| client | `nginx:alpine`                | 5000 | `VITE_API_URL` is a build arg                             |
- Put the client and the API under one parent domain (`app.example.com`,
  `api.example.com`) so the session cookie is same-site.
- `BETTER_AUTH_URL` is the API's public origin; `CLIENT_URL` is the client's.
- The server image carries only the bundle, the email templates and the migrations — no
  `node_modules`.
- `docker-compose.staging.yml` differs from production only in `NODE_ENV`. Staging behaves like
  production: secure cookies, SES, no internal error messages.
- The migrator exits with an error when there are no migrations, so a project cannot be
  deployed until its first migration is generated and committed.

## Conventions

- Files: `<camelCaseDomain>.<layer>.ts` on the server (`note.routes.ts`,
  `note.controller.ts`, `note.service.ts`); PascalCase components; shadcn `ui/` stays kebab-case.
- Folders are plural, except `controller/`.
- Controllers and services never import Hono. Routes never import Drizzle.
- Only `server/config/env.ts` reads `process.env`.
- The client imports from `@server/` with `import type` only.
- Every user-facing string goes through `t()`, in both locale files. Use logical Tailwind
  classes (`ms-`, `pe-`, `start-`) so right-to-left works.
- Style: single quotes, no semicolons, 2 spaces, 100 columns — Biome enforces it.

## What has been verified

- Typecheck, lint, and 44 tests (30 server, 14 client) pass.
- The API bundle boots with no `node_modules`; health, CORS preflight, CSRF rejection,
  unauthenticated 401 and security headers were checked against the running bundle.
- The client build fails on a missing `VITE_API_URL` and on a value import of server code.
- **Not yet exercised against a real database:** sign-up, sign-in, the notes endpoints and the
  seed. The Docker images have not been built. Do both on the first project that adopts this.
