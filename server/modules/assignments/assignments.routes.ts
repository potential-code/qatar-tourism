import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { type ScopeEnv, withScope } from '@server/middleware/scope.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { idParam } from '@shared/schemas'
import {
  markingCorrectionInput,
  markingDraftInput,
  markingFinalInput,
  markingQueueQuery,
  submitInput,
  uploadChunkQuery,
  uploadStartInput,
} from '@shared/schemas/assignment-marking'
import { Hono } from 'hono'
import { z } from 'zod'
import * as assignmentsController from './assignments.controller'
import { FILE_ROLES, MARKING_ROLES, SUBMIT_ROLES } from './assignments.policy'

const inlineQuery = z.object({ inline: z.enum(['1']).optional() })

/** RFC 5987 filename for Content-Disposition; the stored name is already sanitised. */
function disposition(kind: 'inline' | 'attachment', fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

function actorOf(c: {
  var: { viewer: ScopeEnv['Variables']['viewer'] }
  get: (key: never) => unknown
}) {
  return { viewer: c.var.viewer, requestId: c.get('requestId' as never) as string | undefined }
}

/** Learner: own assignments, chunked uploads, submissions and revisions. */
const learnerRoutes = new Hono<AuthEnv>()
  .use(requireRole(...SUBMIT_ROLES))
  .get('/mine', async (c) => c.json(await assignmentsController.listMine(c.var.viewer), 200))
  .post('/uploads', validate('json', uploadStartInput), async (c) =>
    c.json(await assignmentsController.startUpload(c.var.viewer, c.req.valid('json')), 201),
  )
  .post(
    '/uploads/:id/chunks',
    validate('param', idParam),
    validate('query', uploadChunkQuery),
    async (c) => {
      const chunk = new Uint8Array(await c.req.arrayBuffer())
      return c.json(
        await assignmentsController.appendChunk(
          c.var.viewer,
          c.req.valid('param').id,
          c.req.valid('query').offset,
          chunk,
        ),
        200,
      )
    },
  )
  .delete('/uploads/:id', validate('param', idParam), async (c) =>
    c.json(await assignmentsController.discardUpload(c.var.viewer, c.req.valid('param').id), 200),
  )
  .post('/:id/submissions', validate('param', idParam), validate('json', submitInput), async (c) =>
    c.json(
      await assignmentsController.submit(
        c.var.viewer,
        c.req.valid('param').id,
        c.req.valid('json'),
      ),
      201,
    ),
  )

/** Trainer and admin marking, always scoped. */
const markingRoutes = new Hono<ScopeEnv>()
  .use(requireRole(...MARKING_ROLES), withScope)
  .get('/', validate('query', markingQueueQuery), async (c) =>
    c.json(await assignmentsController.queue(c.var.viewer, c.var.scope, c.req.valid('query')), 200),
  )
  .get('/:id', validate('param', idParam), async (c) =>
    c.json(
      await assignmentsController.detail(c.var.viewer, c.var.scope, c.req.valid('param').id),
      200,
    ),
  )
  .post('/:id/draft', validate('param', idParam), validate('json', markingDraftInput), async (c) =>
    c.json(
      await assignmentsController.saveDraft(
        actorOf(c),
        c.var.scope,
        c.req.valid('param').id,
        c.req.valid('json'),
      ),
      200,
    ),
  )
  .post(
    '/:id/finalise',
    validate('param', idParam),
    validate('json', markingFinalInput),
    async (c) =>
      c.json(
        await assignmentsController.finalise(
          actorOf(c),
          c.var.scope,
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
        200,
      ),
  )
  .post(
    '/:id/correct',
    validate('param', idParam),
    validate('json', markingCorrectionInput),
    async (c) =>
      c.json(
        await assignmentsController.correct(
          actorOf(c),
          c.var.scope,
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
        200,
      ),
  )

/** Stored files, only through this authorised endpoint (never a static path). */
const fileRoutes = new Hono<ScopeEnv>()
  .use(requireRole(...FILE_ROLES), withScope)
  .get('/:id/file', validate('param', idParam), validate('query', inlineQuery), async (c) => {
    const found = await assignmentsController.file(c.var.scope, c.req.valid('param').id)
    const inline =
      c.req.valid('query').inline === '1' &&
      (found.mimeType === 'application/pdf' || found.mimeType === 'video/mp4')
    return c.body(Bun.file(found.path).stream(), 200, {
      'Content-Type': found.mimeType,
      'Content-Disposition': disposition(inline ? 'inline' : 'attachment', found.fileName),
      'Cache-Control': 'private, no-store',
    })
  })

/** Mounted at /api/assignments. */
export const assignmentsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', (c) => c.json(assignmentsController.ping(), 200))
  .route('/marking', markingRoutes)
  .route('/submissions', fileRoutes)
  .route('/', learnerRoutes)
