import { type UploadKind, uploadKindOf, uploadProblem } from '@shared/schemas/assignment-marking'
import { getUpload, putUpload } from '@/mocks/persist'
import { ApiError, newId } from '../api'

/**
 * Assignment upload storage (brief §6), formerly assignments.storage.ts. The file Blob is kept
 * in the browser's upload store (IndexedDB) under a generated key; the submission row holds the
 * key and the file details. Uploads happen in one step (no chunking), with the same checks the
 * server made: MIME type, extension, size and magic bytes, so a renamed executable is rejected.
 * Stored keys are generated ids; the learner's file name is display metadata only.
 */

/** Keys of files this demo stored. Seeded submissions carry other paths (details only). */
const STORED_PREFIX = 'submissions/'

export type UploadMeta = {
  id: string
  ownerId: string
  assignmentId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  kind: UploadKind
  /** Upload-store key of the Blob. */
  key: string
}

/**
 * Uploads that are stored but not yet part of a submission, for this page's lifetime (the old
 * server's tmp folder). After a reload the learner chooses the file again.
 */
const pending = new Map<string, UploadMeta>()

/** Display-safe file name: no directories, no control characters. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file'
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters on purpose
  const cleaned = base.replace(/[\u0000-\u001f"<>|:*?]/g, '').trim()
  return cleaned.slice(-120) || 'file'
}

/** Does the start of the file match its declared type? */
export function matchesMagic(kind: UploadKind, mimeType: string, head: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to))
  if (kind === 'video') return head.length >= 12 && ascii(4, 8) === 'ftyp'
  if (mimeType === 'application/pdf') return ascii(0, 5) === '%PDF-'
  // DOCX is a ZIP container.
  return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04
}

const TYPE_MESSAGE: Record<string, string> = {
  'application/pdf': 'This file does not look like a valid PDF. Export it again and retry.',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'This file does not look like a valid DOCX document. Save it again from your editor and retry.',
  'video/mp4': 'This file does not look like a valid MP4 video. Export it again as MP4 and retry.',
}

/** True when `path` is a key this demo stored a file under (not a seeded details-only record). */
export function isStoredPath(path: string | null): boolean {
  return Boolean(path?.startsWith(STORED_PREFIX))
}

/**
 * Checks and stores a chosen file. Type and size are checked from the file's details, then the
 * first bytes against the declared type. Returns the pending upload's metadata.
 */
export async function storeUpload(
  ownerId: string,
  assignmentId: string,
  file: Blob & { name: string },
): Promise<UploadMeta> {
  const problem = uploadProblem({ name: file.name, type: file.type, size: file.size })
  const kind = uploadKindOf(file.name, file.type)
  if (problem || !kind) throw ApiError.badRequest(problem ?? 'Unsupported file type')
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!matchesMagic(kind, file.type, head)) {
    throw new ApiError(400, 'UPLOAD_TYPE', TYPE_MESSAGE[file.type] ?? 'Unsupported file type')
  }
  const fileName = safeFileName(file.name)
  const id = newId()
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : ''
  const meta: UploadMeta = {
    id,
    ownerId,
    assignmentId,
    fileName,
    mimeType: file.type,
    sizeBytes: file.size,
    kind,
    key: `${STORED_PREFIX}${id}/file${ext}`,
  }
  await putUpload(meta.key, file)
  pending.set(id, meta)
  return meta
}

/** A pending upload, for its owner only. */
export function readUpload(id: string, ownerId: string): UploadMeta {
  const meta = pending.get(id)
  if (!meta || meta.ownerId !== ownerId) {
    throw ApiError.notFound('Upload not found. Choose the file again.')
  }
  return meta
}

/** Marks a pending upload as used by a submission (it is no longer pending). */
export function claimUpload(id: string): void {
  pending.delete(id)
}

/** Forgets a pending upload the learner removed. */
export function discardUpload(id: string): void {
  pending.delete(id)
}

/** The stored Blob for a key, or null when nothing is stored (seeded records, cleared storage). */
export async function storedFile(path: string | null): Promise<Blob | null> {
  if (!path || !isStoredPath(path)) return null
  return getUpload(path)
}
