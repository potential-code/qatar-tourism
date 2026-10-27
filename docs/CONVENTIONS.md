# Conventions

## Design (non-negotiable)

Rawzaba's email: "engaging, visually cohesive and easy to present, with purposeful animation, responsive layouts, clear navigation and fully populated screens."

- **Start from `/design`** (`client/src/features/design-showcase`). Every screen must look like it belongs there.
- **Brand tokens only.** Use the `teal`, `maroon`, `sand`, `ink` and `*-mist` utilities plus the shadcn semantic tokens. No raw hex in components, and no gold.
- **Type.** `font-display` (Spectral, light 300 or normal 400) for page titles, section titles and big numbers. Jost (default `font-sans`) for UI, body and data.
- **Shape lock.** Buttons are pills (`rounded-full`), cards and panels `rounded-xl`, inputs `rounded-lg`.
- **Arch frame (`ArchFrame`) is an accent:** at most one per view (programme hero card, certificate, persona portrait).
- **Imagery.**
  - Official photos are in `client/public/images/official/`. Use `PhotoPanel` for any text over a photo.
  - AI-generated images (image-gen skill) only where nothing official fits: training scenes, persona portraits. Save them to `client/public/images/generated/` and list each in `docs/ASSET-INVENTORY.md`.
  - People must match the persona (e.g. Maha Al Nouri is a woman).
- **Motion.**
  - `Reveal` / `Stagger` for entry, `cardHover` for interactive cards, `CountUp` for KPI numbers, spring tap feedback on primary actions.
  - Controls take 150–400 ms. Every animation must have a reason (hierarchy, feedback, state change, story).
  - `useReducedMotion()` must turn motion off; the global CSS already zeroes transitions.
  - Lenis smooth scroll and GSAP pinning are for the **public site only**.
- **States.** Every data view has a loading state (skeleton in the content's shape), an empty state (`EmptyState` with a reason and the next action), and an error state (message plus retry).
- **Responsive.**
  - Public, learner and trainer screens work at 390 / 768 / 1440 px.
  - The admin portal is desktop only (≥1280 px), which is a documented deviation.
  - Tables scroll inside a labelled container.
- **Copy.**
  - Use the brief's copy verbatim where it gives copy. English only.
  - Use no em-dashes in UI text. Use a period, comma or colon.
  - Times are shown in Qatar time (Asia/Qatar), with a "Qatar time" label.
- **Accessibility.** Labels above inputs, visible focus, keyboard operation, status not shown by colour alone, and text summaries for charts.

## Code

- TypeScript strict. Biome formats and lints (`bun run format`, `bun run lint`).
- Files and folders: components `PascalCase.tsx`, hooks `useThing.ts`, server `domain.layer.ts`. Keep files small and use one component per file.
- Server error shape: `{ error: { code, message, details } }` via `server/lib/errors.ts`.
- Dates are stored in UTC and rendered in Asia/Qatar. "Now" comes from `server/lib/clock.ts` (demo reference date), never `new Date()` scattered through services.
- No `any`. No `console.log`. No dead code or TODO placeholders in shipped screens.
- Tests sit next to the server module (`*.test.ts`); client tests go in `client/src/__tests__/`.

## Parallel work (Phase 2)

- Each agent works in its own git worktree on branch `feat/<agent>`. It commits locally and **never pushes**.
- **Owned files:** `client/src/features/<your domains>/**`, `client/src/routes/<your pages>`, `server/modules/<your domains>/**`, your tests.
- **Frozen shared files**, changed only through the lead:
  - `server/db/schema/**`, `shared/**`, `server/app.ts` mounting
  - `client/src/app/navigation.ts`, `client/src/components/{ui,brand,motion,data,layout}/**`, `client/src/styles/**`, `package.json`
- If you need a shared change, stop and report exactly what you need and why. Do not edit the file.
- **Definition of done:** `bun run typecheck`, `bun run lint` and `bun run test` all pass. Screens are fully populated from seeded data, checked at the required widths, and simulated features are labelled.
