// Vite's own `vite/client` types clash with bun-types over `ImportMeta.env`, so the pieces the
// client needs are declared here instead.

interface ImportMetaEnv {
  /** YYYY-MM-DD: overrides the fixed DEMO_REFERENCE_DATE for the seeded dataset. */
  readonly VITE_DEMO_REFERENCE_DATE?: string
}

declare module '*.css'
