/**
 * The one error type the API throws on purpose. The error middleware turns it into
 * `{ error: { code, message, details? } }` with its status. Anything else becomes a 500 with a
 * generic message, so internal details never reach the client.
 */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new HttpError(400, 'BAD_REQUEST', message, details)
  }

  static unauthorized(message = 'Authentication required') {
    return new HttpError(401, 'UNAUTHORIZED', message)
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new HttpError(403, 'FORBIDDEN', message)
  }

  static notFound(message = 'Not found') {
    return new HttpError(404, 'NOT_FOUND', message)
  }
}

export type ErrorBody = {
  error: { code: string; message: string; details?: unknown }
}

export function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } }
}
