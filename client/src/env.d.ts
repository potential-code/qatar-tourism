// Vite's own `vite/client` types clash with bun-types over `ImportMeta.env`, so the pieces the
// client needs are declared here instead.

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

declare module '*.css'
