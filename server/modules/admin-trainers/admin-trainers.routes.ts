import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import {
  adminTrainerCreateInput,
  adminTrainerProgrammesInput,
  adminTrainerUpdateInput,
  trainerIdParam,
} from '@shared/schemas/admin-trainers'
import { Hono } from 'hono'
import * as controller from './admin-trainers.controller'
import { TRAINER_ADMIN_ROLES } from './admin-trainers.policy'

const rid = (c: { get: (key: never) => unknown }) =>
  c.get('requestId' as never) as string | undefined

/** Mounted at /api/admin/trainers. Admin only (brief §14 Trainer management). */
export const adminTrainersRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...TRAINER_ADMIN_ROLES))
  .get('/ping', (c) => c.json({ module: 'admin-trainers' as const, status: 'ok' as const }, 200))
  .get('/', async (c) => c.json(await controller.list(), 200))
  .post('/', validate('json', adminTrainerCreateInput), async (c) =>
    c.json(await controller.create(c.var.viewer, c.req.valid('json'), rid(c)), 201),
  )
  .get('/:trainerId', validate('param', trainerIdParam), async (c) =>
    c.json(await controller.detail(c.req.valid('param').trainerId), 200),
  )
  .patch(
    '/:trainerId',
    validate('param', trainerIdParam),
    validate('json', adminTrainerUpdateInput),
    async (c) =>
      c.json(
        await controller.update(
          c.var.viewer,
          c.req.valid('param').trainerId,
          c.req.valid('json'),
          rid(c),
        ),
        200,
      ),
  )
  .put(
    '/:trainerId/programmes',
    validate('param', trainerIdParam),
    validate('json', adminTrainerProgrammesInput),
    async (c) => {
      const body = c.req.valid('json')
      return c.json(
        await controller.setProgrammes(
          c.var.viewer,
          c.req.valid('param').trainerId,
          body.programmes,
          body.reason,
          rid(c),
        ),
        200,
      )
    },
  )
