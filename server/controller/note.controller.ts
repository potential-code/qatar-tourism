import type { NoteRow } from '@server/db/schema'
import type { Viewer } from '@server/middleware/auth.middleware'
import * as noteService from '@server/services/note.service'
import type { ListQuery, NoteInput } from '@shared/schemas'

/** A note as the API returns it: no owner id, dates as ISO strings. */
export type Note = {
  id: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listNotes(viewer: Viewer, query: ListQuery) {
  const { items, total } = await noteService.listNotes(viewer.id, query)
  return { items: items.map(toNote), total, page: query.page, pageSize: query.pageSize }
}

export async function noteStats(viewer: Viewer) {
  return { perDay: await noteService.notesPerDay(viewer.id) }
}

export async function createNote(viewer: Viewer, input: NoteInput) {
  return toNote(await noteService.createNote(viewer.id, input))
}

export async function getNote(viewer: Viewer, id: string) {
  return toNote(await noteService.getNote(viewer.id, id))
}

export async function updateNote(viewer: Viewer, id: string, patch: noteService.NotePatch) {
  return toNote(await noteService.updateNote(viewer.id, id, patch))
}

export async function deleteNote(viewer: Viewer, id: string) {
  await noteService.deleteNote(viewer.id, id)
  return { ok: true as const }
}
