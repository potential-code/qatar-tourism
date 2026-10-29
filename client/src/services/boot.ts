import { loadDb } from '@/mocks/db'
import { signInAs } from './auth.service'

/**
 * Starts the demo before the first render: loads (or seeds) the database, then honours the
 * `?demo-as=<userId>` deep link (QA, e2e and presenting) and removes it from the address bar.
 */
export async function bootDemo(location: Location = window.location): Promise<void> {
  await loadDb()
  const url = new URL(location.href)
  const demoAs = url.searchParams.get('demo-as')
  if (!demoAs) return
  await signInAs(demoAs).catch(() => undefined)
  url.searchParams.delete('demo-as')
  window.history.replaceState(window.history.state, '', url)
}
