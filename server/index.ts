import { app } from '@server/app'
import { env } from '@server/config/env'
import { closeDb, db } from '@server/db/connection'
import { logger } from '@server/lib/logger'
import { loadClock } from '@server/modules/demo/demo.service'
import { sql } from 'drizzle-orm'

const server = Bun.serve({ hostname: '0.0.0.0', port: env.PORT, fetch: app.fetch })

logger.info({ port: server.port, env: env.NODE_ENV }, 'Server listening')

// Report database reachability at boot without blocking it: the container's migrator has
// already failed hard if the database is down, and postgres.js reconnects on its own.
db.execute(sql`select 1`)
  .then(() => loadClock())
  .then((referenceDate) =>
    logger.info({ referenceDate }, 'Database connection ok; demo clock loaded'),
  )
  .catch((error: unknown) =>
    logger.error({ err: error }, 'Database is not reachable; requests that need it will fail'),
  )

// `bun run db:reset` runs in its own process: re-read the snapshot's anchor now and then, so a
// running server picks up a command-line reset without a restart.
const CLOCK_REFRESH_MS = 15_000
const clockRefresh = setInterval(() => {
  loadClock().catch((error: unknown) => logger.warn({ err: error }, 'Demo clock refresh failed'))
}, CLOCK_REFRESH_MS)

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  clearInterval(clockRefresh)
  logger.info({ signal }, 'Shutting down')
  try {
    // Stop accepting connections and let in-flight requests finish, then release the pool.
    await server.stop()
    await closeDb()
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Shutdown failed')
    process.exit(1)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
