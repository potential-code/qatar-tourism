import { env } from '@server/config/env'
import { HttpError } from '@server/lib/errors'
import { notFound, onError } from '@server/middleware/error.middleware'
import { requestLogger } from '@server/middleware/logger.middleware'
import { globalRateLimit } from '@server/middleware/rate-limit.middleware'
import { adminRoutes } from '@server/routes/admin.routes'
import { authRoutes } from '@server/routes/auth.routes'
import { healthRoutes } from '@server/routes/health.routes'
import { meRoutes } from '@server/routes/me.routes'
import { noteRoutes } from '@server/routes/note.routes'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'

/**
 * The Hono app, without a port: index.ts serves it, tests call `app.request()`.
 */
export const app = new Hono()

app
  .use(requestId())
  .use(secureHeaders())
  .use(
    '/api/*',
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  )
  .use(csrf({ origin: env.CLIENT_URL }))
  .use(
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: () => {
        throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large')
      },
    }),
  )
  .use('/api/*', globalRateLimit)
  .use(requestLogger)

app.onError(onError)
app.notFound(notFound)

app.route('/api/auth', authRoutes)

// Chained so the full route tree is one type the client can import (type-only) for `hc`.
const routes = app
  .basePath('/api')
  .route('/health', healthRoutes)
  .route('/me', meRoutes)
  .route('/notes', noteRoutes)
  .route('/admin', adminRoutes)

export type AppType = typeof routes
