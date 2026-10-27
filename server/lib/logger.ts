import { env } from '@server/config/env'
import pino from 'pino'

// Plain JSON lines on stdout; the container platform collects and formats them.
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
})
