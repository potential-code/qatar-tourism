import './helpers/env'

import { describe, expect, test } from 'bun:test'
import { toNote } from '@server/controller/note.controller'
import type { NoteRow } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { assertOwnership, fillDays } from '@server/services/note.service'

const row: NoteRow = {
  id: '6f1c1f1e-8f5b-4b8e-9b53-2a7f3f7d1a10',
  userId: 'owner',
  title: 'Title',
  body: 'Body',
  createdAt: new Date('2026-01-02T03:04:05.000Z'),
  updatedAt: new Date('2026-01-03T03:04:05.000Z'),
}

describe('assertOwnership', () => {
  test('returns the note to its owner', () => {
    expect(assertOwnership(row, 'owner')).toBe(row)
  })

  test("reports someone else's note as not found", () => {
    try {
      assertOwnership(row, 'intruder')
      throw new Error('expected a throw')
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(404)
    }
  })

  test('reports a missing note as not found', () => {
    expect(() => assertOwnership(undefined, 'owner')).toThrow('Note not found')
  })
})

describe('toNote', () => {
  test('hides the owner and serialises dates', () => {
    expect(toNote(row)).toEqual({
      id: row.id,
      title: 'Title',
      body: 'Body',
      createdAt: '2026-01-02T03:04:05.000Z',
      updatedAt: '2026-01-03T03:04:05.000Z',
    })
  })
})

describe('fillDays', () => {
  test('returns 30 zero-filled days ending today, oldest first', () => {
    const today = new Date('2026-03-01T22:00:00.000Z')
    const days = fillDays([{ date: '2026-02-28', count: 3 }], today)
    expect(days).toHaveLength(30)
    expect(days[0]).toEqual({ date: '2026-01-31', count: 0 })
    expect(days.at(-2)).toEqual({ date: '2026-02-28', count: 3 })
    expect(days.at(-1)).toEqual({ date: '2026-03-01', count: 0 })
  })
})
