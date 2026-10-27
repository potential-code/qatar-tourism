import { isDeployed } from '@server/config/env'
import { errorBody, HttpError } from '@server/lib/errors'
import { logger } from '@server/lib/logger'
import type { Context, ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// Codes for errors thrown by Hono's own middleware (csrf, bodyLimit, ...).
const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
}

function requestId(c: Context): string | undefined {
  return c.get('requestId' as never)
}

export const onError: ErrorHandler = (error, c) => {
  if (error instanceof HttpError) {
    return c.json(
      errorBody(error.code, error.message, error.details),
      error.status as ContentfulStatusCode,
    )
  }

  if (error instanceof HTTPException && error.status < 500) {
    const code = CODE_BY_STATUS[error.status] ?? 'HTTP_ERROR'
    return c.json(errorBody(code, error.message || code), error.status)
  }

  logger.error({ err: error, requestId: requestId(c), path: c.req.path }, 'Unhandled error')
  // The real message stays in the log; when deployed the client only learns that it failed.
  const message = isDeployed ? 'Something went wrong' : error.message
  return c.json(errorBody('INTERNAL_ERROR', message), 500)
}

export const notFound: NotFoundHandler = (c) =>
  c.json(errorBody('NOT_FOUND', `No route for ${c.req.method} ${c.req.path}`), 404)
