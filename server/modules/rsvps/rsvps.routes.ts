import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import {
  bookingCancelInput,
  bookingChangeRequestInput,
  bookingCreateInput,
  bookingMoveInput,
} from '@shared/schemas/booking-rsvp'
import { idParam } from '@shared/schemas/common'
import { Hono } from 'hono'
import { actorOf } from '../sessions/actor'
import * as rsvpsController from './rsvps.controller'
import { BOOKING_ROLES, rsvpsPingRoles } from './rsvps.policy'

/** Mounted at /api/rsvps: the learner booking experience (brief §6). */
export const rsvpsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...rsvpsPingRoles), (c) => c.json(rsvpsController.ping(), 200))
  .get('/catalogue', requireRole(...BOOKING_ROLES), async (c) =>
    c.json(await rsvpsController.catalogue(actorOf(c)), 200),
  )
  .get('/mine', requireRole(...BOOKING_ROLES), async (c) =>
    c.json(await rsvpsController.mine(actorOf(c)), 200),
  )
  .post('/', requireRole(...BOOKING_ROLES), validate('json', bookingCreateInput), async (c) =>
    c.json(await rsvpsController.book(actorOf(c), c.req.valid('json')), 201),
  )
  .post('/move', requireRole(...BOOKING_ROLES), validate('json', bookingMoveInput), async (c) =>
    c.json(await rsvpsController.move(actorOf(c), c.req.valid('json')), 200),
  )
  .post(
    '/:id/cancel',
    requireRole(...BOOKING_ROLES),
    validate('param', idParam),
    validate('json', bookingCancelInput),
    async (c) =>
      c.json(
        await rsvpsController.cancel(
          actorOf(c),
          c.req.valid('param').id,
          c.req.valid('json').reason,
        ),
        200,
      ),
  )
  .post(
    '/:id/request-change',
    requireRole(...BOOKING_ROLES),
    validate('param', idParam),
    validate('json', bookingChangeRequestInput),
    async (c) =>
      c.json(
        await rsvpsController.requestChange(
          actorOf(c),
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
        200,
      ),
  )
