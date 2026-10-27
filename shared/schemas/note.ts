import { z } from 'zod'

/**
 * Request and response shapes for the example `notes` domain.
 *
 * One schema, two consumers: the server validates the request body with it, the client
 * validates the form with it. Replace this domain with your own, keeping the pattern.
 *
 * Custom messages are i18n keys (client/src/i18n/locales), so the form shows them translated.
 * API callers receive the key in the error details.
 */
export const noteInput = z.object({
  title: z.string().trim().min(1, 'validation.titleRequired').max(200),
  body: z.string().trim().max(10_000).default(''),
})

export type NoteInput = z.infer<typeof noteInput>

// PATCH body. Not `noteInput.partial()`: that keeps body's `.default('')`, so a PATCH with
// only a title would silently wipe the body.
export const notePatch = z.object({
  title: noteInput.shape.title.optional(),
  body: noteInput.shape.body.unwrap().optional(),
})

export type NotePatch = z.infer<typeof notePatch>

export const noteIdParam = z.object({
  id: z.uuid(),
})

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListQuery = z.infer<typeof listQuery>
