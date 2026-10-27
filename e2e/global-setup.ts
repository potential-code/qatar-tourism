import { apiAs, resetDemo } from './support/api'
import { ACCOUNTS } from './support/env'

/**
 * Every run starts from the deterministic snapshot (brief §17 demonstration resilience).
 * E2E_SKIP_RESET=1 skips it while iterating on a single spec.
 */
export default async function globalSetup() {
  if (process.env.E2E_SKIP_RESET === '1') return
  const admin = await apiAs(ACCOUNTS.admin)
  await resetDemo(admin)
  await admin.dispose()
}
