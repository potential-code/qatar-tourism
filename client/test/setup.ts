import { afterEach } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Preloaded by `bun run test:client`. The DOM must exist before React or Testing Library load,
// hence the dynamic import below instead of a static one.
GlobalRegistrator.register({ url: 'http://localhost:5173' })

const { cleanup } = await import('@testing-library/react')

afterEach(() => {
  cleanup()
})
