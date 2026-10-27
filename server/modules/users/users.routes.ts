import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import {
  adminEnrolInput,
  adminReasonInput,
  adminRoleInput,
  adminUserCreateInput,
  adminUserListQuery,
  adminUserUpdateInput,
  userIdParam,
} from '@shared/schemas/admin-users'
import { Hono } from 'hono'
import * as usersController from './users.controller'
import { USER_ADMIN_ROLES } from './users.policy'

const rid = (c: { get: (key: never) => unknown }) =>
  c.get('requestId' as never) as string | undefined

/** Mounted at /api/admin/users. Admin only (brief §14 User management, §11 permissions). */
export const adminUserRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...USER_ADMIN_ROLES))
  .get('/', validate('query', adminUserListQuery), async (c) =>
    c.json(await usersController.listUsers(c.req.valid('query')), 200),
  )
  .get('/options', async (c) => c.json(await usersController.listOptions(), 200))
  .post('/', validate('json', adminUserCreateInput), async (c) =>
    c.json(await usersController.createLearner(c.var.viewer, c.req.valid('json'), rid(c)), 201),
  )
  .get('/:userId', validate('param', userIdParam), async (c) =>
    c.json(await usersController.getUser(c.req.valid('param').userId), 200),
  )
  .patch(
    '/:userId',
    validate('param', userIdParam),
    validate('json', adminUserUpdateInput),
    async (c) =>
      c.json(
        await usersController.updateLearner(
          c.var.viewer,
          c.req.valid('param').userId,
          c.req.valid('json'),
          rid(c),
        ),
        200,
      ),
  )
  .post('/:userId/invite', validate('param', userIdParam), async (c) =>
    c.json(
      await usersController.resendInvite(c.var.viewer, c.req.valid('param').userId, rid(c)),
      200,
    ),
  )
  .post(
    '/:userId/enrolments',
    validate('param', userIdParam),
    validate('json', adminEnrolInput),
    async (c) =>
      c.json(
        await usersController.enrol(
          c.var.viewer,
          c.req.valid('param').userId,
          c.req.valid('json').programme,
          rid(c),
        ),
        201,
      ),
  )
  .post(
    '/:userId/suspend',
    validate('param', userIdParam),
    validate('json', adminReasonInput),
    async (c) =>
      c.json(
        await usersController.suspend(
          c.var.viewer,
          c.req.valid('param').userId,
          c.req.valid('json').reason,
          rid(c),
        ),
        200,
      ),
  )
  .post(
    '/:userId/reactivate',
    validate('param', userIdParam),
    validate('json', adminReasonInput),
    async (c) =>
      c.json(
        await usersController.reactivate(
          c.var.viewer,
          c.req.valid('param').userId,
          c.req.valid('json').reason,
          rid(c),
        ),
        200,
      ),
  )
  .patch(
    '/:userId/role',
    validate('param', userIdParam),
    validate('json', adminRoleInput),
    async (c) =>
      c.json(
        await usersController.changeRole(
          c.var.viewer,
          c.req.valid('param').userId,
          c.req.valid('json').role,
          c.req.valid('json').reason,
          rid(c),
        ),
        200,
      ),
  )
