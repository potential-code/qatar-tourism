import { logger } from '@server/lib/logger'
import { createMiddleware } from 'hono/factory'
import type { RequestIdVariables } from 'hono/request-id'

/** One JSON line per request. Query strings are left out: they can carry tokens. */
export const requestLogger = createMiddleware<{ Variables: RequestIdVariables }>(
  async (c, next) => {
    const start = performance.now()
    await next()
    logger.info(
      {
        requestId: c.var.requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Math.round(performance.now() - start),
      },
      'request',
    )
  },
)
