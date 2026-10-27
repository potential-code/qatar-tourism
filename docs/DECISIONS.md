# Decisions

Why the skeleton is shaped the way it is. Each entry is a decision someone will be tempted to
undo; read the entry before you do.

---

## Two processes, not one meta-framework

The client is a Vite SPA served by nginx. The server is a Hono API on Bun. They are separate
builds, separate images and separate ports (5000 and 8000).

A meta-framework such as TanStack Start or Next.js compiles client and server from **one**
module graph. Server functions are published as endpoints automatically, and keeping server code
out of the browser bundle depends on the compiler noticing every import path. On a previous
project a server module reached the browser transitively through a middleware file; the build
passed and a 953 kB chunk carried the database driver, the mailer and the auth server to every
visitor.

With two builds that failure mode does not exist. The client build never sees the server's
source, and every endpoint is one somebody wrote in `server/routes/` on purpose. The cost is a
second deployable, and losing end-to-end types for free — which Hono RPC gives back (next entry).

## Hono, not Express

- **Typed client without codegen.** `server/app.ts` exports `type AppType`; the client builds
  `hc<AppType>(url)` from it. Request and response types flow across the process boundary with a
  type-only import. Express has no equivalent — you hand-write client types or run an OpenAPI
  generator.
- **Security middleware is first-party.** CORS, CSRF, secure headers, body limit and request id
  ship with Hono. Express needs a package for each, and `csurf` is abandoned.
- **Web-standard `Request` and `Response`.** Better Auth's handler takes a `Request`, so it
  mounts with one line and no adapter.
- **Tests need no port.** `app.request('/api/…')` runs the whole middleware stack in-process.

Costs:

- The middleware ecosystem is smaller than Express's.
- RPC inference needs the routes **chained** (`.get().post()`, `.route().route()`) and a
  return type TypeScript can infer. That is why controllers return plain data and route files
  wrap it with `c.json()`.
- The editor slows once the chained type grows past a few dozen routes. When that happens,
  split the client per domain (`hc<typeof noteRoutes>`) rather than one client for everything.

If Hono ever has to go, only `server/routes/`, `server/middleware/` and `server/app.ts` know it
exists. Controllers and services never import it.

## Routes, controller, services

| Layer         | Knows about                        | Never                   |
| ------------- | ---------------------------------- | ----------------------- |
| `routes/`     | URL, method, validator, middleware | Drizzle                 |
| `controller/` | the viewer, the input, services    | Hono, `Request`, `c`    |
| `services/`   | Drizzle, transactions, ownership   | Hono, HTTP status codes |

Ownership checks live in services, next to the query, so a new route cannot forget them: a
service asked for a note it does not own answers "not found", the same as a note that does not
exist, so ids cannot be probed.

## Bun at runtime too

The house deployment standard builds with Bun and runs on Node. This skeleton runs on Bun as
well: the server has no native modules, Bun runs the bundle directly, and one runtime in
development and production removes a class of "works locally" bugs. If a dependency with a
native Node addon arrives, switch the runtime stage to `node:22-alpine` and bundle with
`target: 'node'`.

## TypeScript 7, and Biome instead of ESLint

`tsc` 7 is the Go port — type-checking this repository takes well under a second. It removed
`baseUrl`, so every `paths` entry in `tsconfig.json` is written relative to the file.

typescript-eslint supports TypeScript `<6.1` and cannot load 7. Biome needs no TypeScript
installation, so it lints and formats instead of ESLint + Prettier.

## One tsconfig, two builds

Client, server and shared are type-checked as one program, which is what lets the client name
`AppType`. That does not merge the builds: `verbatimModuleSyntax` guarantees an
`import type` is erased, and `client/vite.config.ts` refuses to load any file under `server/`,
so a value import of server code fails the client build instead of shipping.

## Environment validated at boot

`server/config/env.ts` parses `process.env` with Zod when the process starts, and exits with the
names of the bad keys if anything is wrong. Nothing else reads `process.env`.

Compose substitutes an unset `${VAR}` with an **empty string**, not `undefined`. An inline
`process.env.X ?? default` lets `''` straight through — `Number('')` is `0` — so a key missing
from the Dokploy panel produces a healthy-looking container that misbehaves. The schema treats
`''` as unset, so the same mistake stops the container at boot with the missing key named in
its log.

The client does the same with `import.meta.env` at build time: a missing `VITE_API_URL` fails
`vite build`, not the first fetch in the browser.

## Cookies across two origins

The client and API live on different origins (`app.example.com`, `api.example.com`). Better
Auth's session cookie is `HttpOnly`, `Secure` and `SameSite=Lax`, which works because both
hosts share a registrable domain — the requests are same-site even though they are
cross-origin. Deploy them under the same parent domain. CORS allows exactly the origins in
`CLIENT_URL`, with credentials, and never a wildcard.

## No migrations in the skeleton

Migrations are generated from the schema in the project that adopts the skeleton, so the first
migration belongs to that project's history. Run `bun run db:generate` once after copying.

---

# Qatar Tourism Academy decisions

## Brand source: qatartourism.com, not the brief

The brief's palette (maroon #7A1738 primary, gold #B69053) is marked provisional. The user decided to take branding from https://www.qatartourism.com/en:

- Colours: teal #00627B is the dominant site colour; maroon #7D002A is secondary; the background is #FAF8F4. No gold appears on the site.
- Logo: the official SVG from the site (`client/public/brand/`). Media-pack logos live at /en/travel-trade/sales-resources/qatar-tourism-media-pack.
- Fonts: the site uses **Orchidea Pro** (display serif) and **VisitQatar** (body). Both are commercial, so we use free lookalikes: **Spectral** (display, closest match side by side) and **Jost** (UI, matches the site's own Futura fallback). Swap in the real files if Qatar Tourism supplies them.
- Light theme only, matching the site.

## English only

The language switcher and Arabic resources were removed. Layouts keep logical (start/end) spacing so RTL can be added later (brief §2 asks for "RTL-ready").

## Roles

`learner`, `trainer` and `admin`. Public registration always creates a learner. Trainer and admin accounts are pre-provisioned (brief §3). Portal routes redirect a wrong role to its own home, but the API is the real check.

## Scripted AI, sample SCORM

AI path generation, role-play, voice and analytics chat use deterministic demo logic, labelled simulated (brief §9 allows this). There is no Articulate licence, so we built our own SCORM 2004 sample package, labelled as such (brief §8).

## Deviations from the brief (report at handover)

- The admin portal is desktop only (brief §18 asks for 390 / 768 / 1440 px everywhere).
- Trainer T04 is renamed because the brief gives the name "Daniel Costa" to both T04 and learner persona L0004.
- The fonts are substitutes (see above).
