import { afterEach } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Preloaded by `bun run test:client`. The DOM must exist before React or Testing Library load,
// hence the dynamic import below instead of a static one.
GlobalRegistrator.register({ url: 'http://localhost:5173' })

// Modules that read config/env.ts need a value; Vite would inline it at build time.
process.env.VITE_API_URL ??= 'http://localhost:8000'

const { cleanup } = await import('@testing-library/react')

afterEach(() => {
  cleanup()
})
