import * as noteController from '@server/controller/note.controller'
import { type AuthEnv, requireAuth } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { listQuery, noteIdParam, noteInput, notePatch } from '@shared/schemas'
import { Hono } from 'hono'

export const noteRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/', validate('query', listQuery), async (c) =>
    c.json(await noteController.listNotes(c.var.viewer, c.req.valid('query')), 200),
  )
  // Declared before '/:id' so "stats" is never read as an id.
  .get('/stats', async (c) => c.json(await noteController.noteStats(c.var.viewer), 200))
  .post('/', validate('json', noteInput), async (c) =>
    c.json(await noteController.createNote(c.var.viewer, c.req.valid('json')), 201),
  )
  .get('/:id', validate('param', noteIdParam), async (c) =>
    c.json(await noteController.getNote(c.var.viewer, c.req.valid('param').id), 200),
  )
  .patch('/:id', validate('param', noteIdParam), validate('json', notePatch), async (c) =>
    c.json(
      await noteController.updateNote(c.var.viewer, c.req.valid('param').id, c.req.valid('json')),
      200,
    ),
  )
  .delete('/:id', validate('param', noteIdParam), async (c) =>
    c.json(await noteController.deleteNote(c.var.viewer, c.req.valid('param').id), 200),
  )
