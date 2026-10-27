import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import {
  createPathInput,
  draftItemsInput,
  experienceQuery,
  matchPreviewInput,
  overrideInput,
  pathIdParam,
  pathUpdateInput,
  publishInput,
  ruleIdParam,
  ruleInput,
} from '@shared/schemas/admin-paths'
import { Hono } from 'hono'
import * as controller from './admin-paths.controller'
import { PATH_ADMIN_ROLES } from './admin-paths.policy'

const rid = (c: { get: (key: never) => unknown }) =>
  c.get('requestId' as never) as string | undefined

/** Mounted at /api/admin/paths. Admin only (brief §14 Learning path builder). */
export const adminPathsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...PATH_ADMIN_ROLES))
  .get('/ping', (c) => c.json({ module: 'admin-paths' as const, status: 'ok' as const }, 200))
  .get('/', async (c) => c.json(await controller.list(), 200))
  .get('/catalogue', async (c) => c.json(await controller.catalogue(), 200))
  .post('/', validate('json', createPathInput), async (c) =>
    c.json(await controller.create(c.var.viewer, c.req.valid('json'), rid(c)), 201),
  )
  .post('/preview', validate('json', matchPreviewInput), async (c) =>
    c.json(await controller.preview(c.req.valid('json')), 200),
  )
  .post('/override', validate('json', overrideInput), async (c) =>
    c.json(await controller.override(c.var.viewer, c.req.valid('json'), rid(c)), 200),
  )
  .post('/rules', validate('json', ruleInput), async (c) =>
    c.json(await controller.createRule(c.var.viewer, c.req.valid('json'), rid(c)), 201),
  )
  .patch('/rules/:ruleId', validate('param', ruleIdParam), validate('json', ruleInput), async (c) =>
    c.json(
      await controller.updateRule(
        c.var.viewer,
        c.req.valid('param').ruleId,
        c.req.valid('json'),
        rid(c),
      ),
      200,
    ),
  )
  .get('/:pathId', validate('param', pathIdParam), async (c) =>
    c.json(await controller.detail(c.req.valid('param').pathId), 200),
  )
  .patch('/:pathId', validate('param', pathIdParam), validate('json', pathUpdateInput), async (c) =>
    c.json(
      await controller.update(
        c.var.viewer,
        c.req.valid('param').pathId,
        c.req.valid('json'),
        rid(c),
      ),
      200,
    ),
  )
  .get(
    '/:pathId/experience',
    validate('param', pathIdParam),
    validate('query', experienceQuery),
    async (c) => {
      const q = c.req.valid('query')
      return c.json(
        await controller.experience(c.req.valid('param').pathId, q.learnerCode, q.versionId),
        200,
      )
    },
  )
  .post('/:pathId/draft', validate('param', pathIdParam), async (c) =>
    c.json(await controller.startDraft(c.var.viewer, c.req.valid('param').pathId, rid(c)), 200),
  )
  .patch(
    '/:pathId/draft',
    validate('param', pathIdParam),
    validate('json', draftItemsInput),
    async (c) =>
      c.json(
        await controller.saveDraft(
          c.var.viewer,
          c.req.valid('param').pathId,
          c.req.valid('json'),
          rid(c),
        ),
        200,
      ),
  )
  .delete('/:pathId/draft', validate('param', pathIdParam), async (c) =>
    c.json(await controller.discardDraft(c.var.viewer, c.req.valid('param').pathId, rid(c)), 200),
  )
  .post(
    '/:pathId/publish',
    validate('param', pathIdParam),
    validate('json', publishInput),
    async (c) =>
      c.json(
        await controller.publish(
          c.var.viewer,
          c.req.valid('param').pathId,
          c.req.valid('json'),
          rid(c),
        ),
        200,
      ),
  )
