import '../../__tests__/helpers/env'

import { describe, expect, test } from 'bun:test'
import { uploadKindOf, uploadProblem } from '@shared/schemas/assignment-marking'
import { matchesMagic, safeFileName, storedFile } from './assignments.storage'

const MB = 1024 * 1024
const bytes = (text: string) => new TextEncoder().encode(text)

describe('upload validation (brief §6)', () => {
  test('accepts PDF and DOCX up to 10 MB and MP4 up to 50 MB', () => {
    expect(uploadProblem({ name: 'plan.pdf', type: 'application/pdf', size: 10 * MB })).toBeNull()
    expect(
      uploadProblem({
        name: 'plan.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2 * MB,
      }),
    ).toBeNull()
    expect(uploadProblem({ name: 'roleplay.mp4', type: 'video/mp4', size: 50 * MB })).toBeNull()
  })

  test('explains each rejection', () => {
    expect(
      uploadProblem({ name: 'plan.pdf', type: 'application/pdf', size: 10 * MB + 1 }),
    ).toContain('up to 10 MB')
    expect(uploadProblem({ name: 'clip.mp4', type: 'video/mp4', size: 51 * MB })).toContain(
      'up to 50 MB',
    )
    expect(uploadProblem({ name: 'notes.txt', type: 'text/plain', size: 10 })).toContain(
      'PDF or DOCX',
    )
    expect(uploadProblem({ name: 'plan.pdf', type: 'application/pdf', size: 0 })).toContain('empty')
  })

  test('the MIME type and the extension must agree', () => {
    expect(uploadKindOf('plan.mp4', 'application/pdf')).toBeNull()
    expect(uploadKindOf('PLAN.PDF', 'application/pdf')).toBe('document')
  })

  test('content must match the declared type (magic bytes)', () => {
    expect(matchesMagic('document', 'application/pdf', bytes('%PDF-1.7'))).toBe(true)
    expect(matchesMagic('document', 'application/pdf', bytes('MZ\x90\x00'))).toBe(false)
    expect(
      matchesMagic(
        'document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]),
      ),
    ).toBe(true)
    expect(matchesMagic('video', 'video/mp4', bytes('\x00\x00\x00\x18ftypmp42'))).toBe(true)
    expect(matchesMagic('video', 'video/mp4', bytes('not a video at all'))).toBe(false)
  })

  test('file names cannot traverse directories', async () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('C:\\Users\\me\\plan.pdf')).toBe('plan.pdf')
    expect(await storedFile('../../package.json')).toBeNull()
  })
})
