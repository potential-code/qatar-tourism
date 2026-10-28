# Qatar Tourism Academy Mockup: Implementation Plan

## Context

Rawzaba (email, 26 Oct 2026, "Qatar Tourism Academy — Mockup Development Brief and Instructions") asked for a polished, interactive, **stateful demo LMS** for Qatar Tourism's Service Excellence Academy. Sources of truth:
- **The brief** (`/mnt/c/Users/aliya/Downloads/Qatar_Tourism_Mockup_Developer_Brief.docx`, §1–18) covers all content, rules, data and acceptance criteria. Copy it into `docs/brief/`.
- **Rawzaba's email wording** makes design quality a top priority: "engaging, visually cohesive and easy to present, with purposeful animation, responsive layouts, clear navigation and fully populated screens". Learner, trainer and admin journeys stay connected. Integrations that aren't live are clearly marked simulated. A reset is required.
- **Branding comes from qatartourism.com, not the brief:**
  - Colours: teal #00627B primary, maroon #7D002A secondary (darker #5F0020), background #FAF8F4, text #1A1919, greys #575654 / #807E7C, light teal #7FB0BC. No gold.
  - Logo: the official SVG and the media pack.
  - Font: "VisitQatar" is proprietary, so use the closest free lookalike, verified side by side against the site.

**User decisions**
- Repo: `~/Projects/qatar-tourism`, remote `git@github.com:potential-code/qatar-tourism.git` (empty, reachable). Touch no other project.
- English only, with no language switcher. Use logical start/end CSS so RTL can be added later.
- AI path generation, role-play, voice and analytics chat all use **scripted demo logic**, labelled simulated.
- No Articulate licence, so build our **own SCORM 2004 sample package**, labelled "SCORM 2004 sample package".
- Motion: rich and immersive. Framer Motion everywhere, GSAP ScrollTrigger and Lenis on the public site. Honour `prefers-reduced-motion`.
- The arch/dome motif is an accent only, not overused. Other site motifs: swoop-in clip-path reveals, gradient image masks, serif display titles over photography.
- Imagery: official site assets first, AI-generated (image-gen skill) only where appropriate. Personas must match their gender and character.
- Mobile responsive (390 / 768 / 1440 px): public site, learner portal, trainer workspace. The admin portal is desktop only; log this as a handover deviation from §18.
- Rename trainer T04 "Daniel Costa" to avoid the clash with learner L0004, and log it as a deviation.
- Git: **local only.** Each agent works on its own local branch and worktree, and the lead reviews and merges into **local `main`**. Add the remote, but **never push until the user says so.**

## Stack (from potential-template)

Copy `/mnt/c/Users/aliya/potential-template/templates/project-skeleton`:
- Bun 1.4, TypeScript 7, Biome
- React 19, Vite 8, TanStack Router / Query / Table v9 / Form, Tailwind 4, shadcn/Radix, recharts 3
- Hono 4 with an RPC client, Better Auth, Drizzle 0.45 on Postgres, `bun test`
- Dockerfiles ready for Dokploy

**Additions:** `motion` (Framer Motion), `gsap`, `lenis`, `scorm-again`, `@playwright/test` (end-to-end), and `pdf-lib` for the certificate.

**Reuse by porting, not importing.** The templates and `packages/core` are TanStack Start, which is incompatible with the skeleton. Port these pieces:
| Need                                                                                                                                                                              | Port from                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| UI primitives the skeleton lacks: StatCard, EmptyState, ProgressRing, tabs, select, progress, avatar, breadcrumb, calendar, popover, switch, radio, checkbox, scroll-area, drawer | `packages/core/src/{layouts,ui}/`                                                                                                         |
| Course player, outline sidebar, quiz runner, catalogue/detail, admin course builder (dnd-kit), certificate PDF and verify                                                         | `templates/learning-module/src/components/{learner,admin,certificates}`, `src/server/{progress,attempts,certificates,certificate-pdf}.ts` |
| Charts (`ChartCard`, column/stacked/donut/funnel-like bars, Sparkline, Meter), CSV export, range/bucket helpers, metric-registry pattern                                          | `templates/analytics/src/{components/charts,lib,server/registry.ts}`                                                                      |
| Timezone-to-instant storage, session phase logic                                                                                                                                  | `templates/events/src/server/{timezone,phase}.ts`                                                                                         |
| Booking, cancel and reschedule, attendance close-out                                                                                                                              | `templates/mentorship/src/server/bookings.ts`, `components/mentee/{SlotPicker,BookingDialog,MyBookings}`                                  |
| Page anatomy and states                                                                                                                                                           | `mockup-references/layout-rules.md`; screenshots in `mockup-references/platform/{learning,dashboards}` and `landing/`                     |

**Porting checklist:** move `createServerFn` to a Hono route, controller and service; zod 3 to 4; `pg` to `postgres`; uuid `users` foreign keys to Better Auth `user.id` (text); react-hook-form to TanStack Form; recharts 2 to 3.

## Folder structure (separation of concerns)

```
qatar-tourism/
  client/src/
    app/                 router, providers (Query, Theme, Motion, Lenis), route guards
    routes/              thin TanStack file routes only (compose features)
      (public)/  (auth)/  learner/  trainer/  admin/
    features/<domain>/   components/ hooks/ queries/ utils/ types.ts   ← all UI logic
       public-site, auth, profile, programmes, learning, scorm-player, assessments,
       ai-path, roleplay, sessions, assignments, certificates, notifications,
       trainer-workspace, admin-dashboard, ai-analytics, reports, academy-mgmt, demo
    components/
      ui/                shadcn primitives
      layout/            PortalShell, PageHeader, Breadcrumbs, DemoToolbar, DemoBadge
      brand/             Logo, ArchFrame, SwoopReveal, GradientImage, SectionHeading
      motion/            variants.ts, MotionPage, Stagger, CountUp, ScrollReveal (GSAP), LenisProvider
      data/              DataTable, StatCard, ChartCard + charts, EmptyState, FilterBar
    lib/                 api client, auth-client, format (Qatar time), utils
    styles/              tokens.css (brand), app.css
  server/
    modules/<domain>/    <domain>.routes.ts  .controller.ts  .service.ts  .policy.ts  .test.ts
       (users, organisations, profiles, programmes, paths, courses, scorm, enrolments,
        progress, assessments, ai-path, roleplay, sessions, rsvps, attendance, assignments,
        certificates, notifications, audit, reports, analytics, ai-analytics, exports, demo)
    db/schema/<domain>.ts   db/seed/{index,rng,reference-date,personas,learners,trainers,sessions,activity}.ts
    middleware/ (auth, requireRole, scope, error, audit)   lib/ (errors, logger, clock)
  shared/   roles.ts, permissions.ts (matrix §11), schemas/<domain>.ts (zod), constants/ (thresholds, rubrics), content/ (curriculum C01–C07, question bank, scenarios, scripted AI)
  scorm/qta-sample-c04/   imsmanifest.xml + HTML/JS SCORM 2004 package (built to client/public/scorm)
  e2e/                    Playwright walkthrough specs
  docs/  brief/, ARCHITECTURE.md, CONVENTIONS.md, PERMISSIONS.md, FUNCTIONAL-VS-SIMULATED.md, WALKTHROUGH.md, DATA-DELETION.md, DEVIATIONS.md, ASSET-INVENTORY.md
```
**Rules:**
- Routes files only compose features.
- No database access outside services.
- Permission checks live in `.policy.ts` and are enforced in the API, not just hidden in the UI (§11).
- Every write passes through the audit middleware.
- Every metric is computed from seeded data; no hard-coded numbers.

## Phases and agents

Lead (me) coordinates, reviews each branch, merges and resolves conflicts. **File ownership:** each agent owns its `features/<x>` and `modules/<x>`. Shared files are frozen after Phase 1 and change only through the lead: `db/schema`, `shared/*`, `app.ts` route mounting, nav config, tokens.

### Phase 0: Foundation and design system (lead, sequential)

1. Copy the skeleton into `~/Projects/qatar-tourism`, `git init`, add the remote, strip Arabic and the language switcher, rename the app, set up the Docker/Postgres local port (5433), add the extra dependencies.
2. Brand: download the logo SVGs and media-pack assets, choose the fonts, write `tokens.css` (brand colours, semantic colours, radius, shadows/elevation, motion durations).
3. Build the `components/brand`, `components/motion` and `components/layout` kits, port the core UI primitives, and add a `/design` showcase route as the visual contract for all agents.
4. Docs: ARCHITECTURE, CONVENTIONS, and a copy of the brief.
5. Commit to local `main`. No push.

### Phase 1: Data contract, permissions and seed (1 agent: db-schema-engineer; then lead review)

- The full Drizzle schema for the §17 model: users/roles, profile, organisation, programme, path and version, assignment rule, course/unit/package, enrolment, unit progress, assessment and attempt, role-play and score, session, RSVP and waitlist, attendance, assignment/submission/review, certificate, notification, audit event, demo snapshot. Plus shared zod schemas and the `permissions.ts` matrix.
- Stub every module router (mounted in `app.ts`) so later agents only edit their own module.
- **Seed:**
  - Seeded random generator and a reference date with relative offsets.
  - Totals: 1,200 learners; enrolments A 420 / B 660 / C 180 (60 learners in both A and B); the status grid from §15; 120 A certificates; the organisation and seniority distributions; 20+ "Demo" organisations.
  - 10 trainers with T04 renamed, 30 sessions including full, waitlist, cancelled and rescheduled ones.
  - The 5 personas, plus the walkthrough edge cases.
- `POST /demo/reset` restores the snapshot (admin only).
- **Tests:** seed reconciliation asserts every total from §15 and §16.

### Phase 2: Parallel feature build (5 agents, each in its own worktree)

| Agent                                                    | Scope (brief §)                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A: Public site and accounts** (frontend-ui-architect)  | §2–4: immersive homepage (GSAP/Lenis, hero loop, A/B/C programme cards, How it works, sessions, FAQ, footer notice), programme detail pages, sign-in modes, registration with simulated verification, 3-step profile wizard, simulated SSO, routing rules, demo toolbar                                                                                                                                   |
| **B: Learning engine** (full-stack)                      | §5, 7, 8, 9 (paths): learner shell and Overview, My learning, Progress, Profile; video player with captions and transcript (C01); **SCORM 2004 sample package and scorm-again player** (launch, resume, restart, completion saved once); pre/post assessments; scripted AI path generator; Program B completion; certificate PDF and verification                                                         |
| **C: Practice and assignments** (full-stack)             | §9 role-play (text, plus voice through the browser microphone with transcript and a typed fallback, scripted visitor replies, 5-criterion rubric with evidence); §6 assignment upload, versions, revisions; learner Assignments and AI practice pages                                                                                                                                                     |
| **D: Sessions and trainer workspace** (full-stack)       | §6 booking (calendar/list, eligibility, capacity, waitlist, 24-hour policy, reschedule); §10–11 trainer workspace, session create/edit/reschedule/cancel, attendance, rubric scoring, marking queue, notifications log with simulated emails, deduplication, allowed vs denied exports, audit                                                                                                             |
| **E: Admin workspace** (frontend-ui-architect + backend) | §12–14 desktop only: Dashboard with KPIs, distribution, funnel, improvement, operational panels; AI Analytics chat (7 scripted prompts with computed answers, clarifying question, underlying records); 10 Reports (search, sort, pagination 25/50/100, filters, detail panels, CSV); Academy Management including the path builder (rules, priority, preview with Maha, versioning) and the reset screen |

Each agent:
- Loads `frontend-ui` and `design-taste-frontend` / `high-end-visual-design` (UI) and `backend-feature` / `security-review` (API) skills.
- Uses only the Phase 0 kits.
- Writes `bun test` tests for its module.
- Fills every screen with seeded data and handles empty, loading and error states.
- Labels anything simulated.

The lead merges in the order D, B, C, A, E (so learner booking hooks exist before admin reports) and reruns the full test suite after each merge.

### Phase 3: Integration and design polish (lead plus 1 design-review agent)

- Wire the cross-role effects: booking, then trainer reschedule, then learner My sessions, then admin totals; marking, then progress, then certificate, then dashboard.
- Run the 15–20 minute walkthrough from §17 as **Playwright e2e** (`e2e/walkthrough.spec.ts`) with screenshots at 390, 768 and 1440 px.
- The design agent reviews the screenshots against qatartourism.com for cohesion, motion and density, then fixes issues.

### Phase 4: QA and handover (lead plus 1 review agent)

- Run the `code-review` skill (high) on the merged diff, plus a permissions security pass: trainer ID tampering and export blocked at the API.
- Accessibility pass: keyboard, focus, contrast, captions, text summaries for charts.
- Write the docs: FUNCTIONAL-VS-SIMULATED, PERMISSIONS, WALKTHROUGH, DATA-DELETION, DEVIATIONS (admin not mobile, T04 rename, sample SCORM, scripted AI, font substitute), ASSET-INVENTORY, setup README.
- Check off every §18 acceptance criterion with evidence. Leave the Dokploy deployment ready. **Push to the remote only when the user says to.**

## Verification

- `bun run typecheck && bun run lint && bun test` must be green at every merge.
- The seed reconciliation test asserts 1,200 / 1,260 / 420 / 660 / 180 / 120, the status grid, and capacity never exceeded.
- Policy tests: a learner calling trainer or admin APIs gets 403; Trainer 1 requesting Trainer 2's roster gets 403; a trainer's personal-data export is denied and audited.
- SCORM: close and reopen resumes; a pass updates progress once.
- Playwright walkthrough (§17) passes end to end, with a reset between runs reproducing identical charts.
- Manual demo run at 390, 768 and 1440 px: `bun run dev` (client :5173, API :8000 by default), or on this machine API :8140 and client :5240 (see `README.md` → Ports).

## Still open (not blocking the build)

Hosting location and demo duration, the trial end date for the deletion plan, Rawzaba's timeline estimate, and real VisitQatar font files if they become available. Tracked in `docs/OPEN-QUESTIONS.md`.
