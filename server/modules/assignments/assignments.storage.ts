import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '@server/config/env'
import { HttpError } from '@server/lib/errors'
import { UPLOAD_LIMITS } from '@shared/constants'
import { type UploadKind, uploadKindOf } from '@shared/schemas/assignment-marking'

/**
 * Assignment upload storage (brief §6). Files live under the repository's gitignored
 * `uploads/` directory, never under the client's public folder, and are only ever read back
 * through the authorised download endpoint.
 *
 * Security decisions:
 * - Stored names are server-generated ids; the learner's file name is display metadata only,
 *   so a crafted name cannot traverse paths or overwrite another file.
 * - Size is enforced on every chunk and again at the end; type is checked by MIME, extension
 *   AND magic bytes, so a renamed executable is rejected.
 * - Uploads are chunked because the API caps request bodies at 1 MB.
 */

const ROOT = path.resolve(process.cwd(), env.NODE_ENV === 'test' ? 'uploads/.test' : 'uploads')
const TMP = path.join(ROOT, 'tmp')
const STALE_MS = 24 * 60 * 60 * 1000

export type UploadMeta = {
  id: string
  ownerId: string
  assignmentId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  kind: UploadKind
}

const metaPath = (id: string) => path.join(TMP, `${id}.json`)
const partPath = (id: string) => path.join(TMP, `${id}.part`)

/** Upload ids are UUIDs; anything else never reaches the file system. */
function assertId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw HttpError.notFound('Upload not found')
}

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

async function removeStale() {
  const entries = await readdir(TMP).catch(() => [] as string[])
  const cutoff = Date.now() - STALE_MS
  await Promise.all(
    entries.map(async (name) => {
      const full = path.join(TMP, name)
      const info = await stat(full).catch(() => null)
      if (info && info.mtimeMs < cutoff) await rm(full, { force: true })
    }),
  )
}

export async function startUpload(input: Omit<UploadMeta, 'id' | 'kind'>): Promise<UploadMeta> {
  const kind = uploadKindOf(input.fileName, input.mimeType)
  if (!kind) throw HttpError.badRequest('Upload a PDF or DOCX document, or an MP4 video.')
  if (input.sizeBytes <= 0 || input.sizeBytes > UPLOAD_LIMITS[kind].maxBytes) {
    throw HttpError.badRequest('This file is larger than the upload limit.')
  }
  await mkdir(TMP, { recursive: true })
  await removeStale()
  const meta: UploadMeta = {
    ...input,
    fileName: safeFileName(input.fileName),
    id: randomUUID(),
    kind,
  }
  await writeFile(metaPath(meta.id), JSON.stringify(meta))
  await writeFile(partPath(meta.id), new Uint8Array())
  return meta
}

/** The upload's metadata, for its owner only. */
export async function readUpload(id: string, ownerId: string): Promise<UploadMeta> {
  assertId(id)
  const raw = await readFile(metaPath(id), 'utf8').catch(() => null)
  if (!raw) throw HttpError.notFound('Upload not found. Choose the file again.')
  const meta = JSON.parse(raw) as UploadMeta
  if (meta.ownerId !== ownerId) throw HttpError.notFound('Upload not found. Choose the file again.')
  return meta
}

async function receivedBytes(id: string): Promise<number> {
  const info = await stat(partPath(id)).catch(() => null)
  return info?.size ?? 0
}

/** Appends one chunk. Chunks must arrive in order and may not exceed the declared size. */
export async function appendChunk(id: string, ownerId: string, offset: number, chunk: Uint8Array) {
  const meta = await readUpload(id, ownerId)
  const received = await receivedBytes(id)
  if (offset !== received) {
    throw new HttpError(409, 'UPLOAD_OFFSET', 'Upload interrupted. Resume from the last chunk.', {
      received,
    })
  }
  if (chunk.byteLength === 0) throw HttpError.badRequest('Empty upload chunk')
  if (received + chunk.byteLength > meta.sizeBytes) {
    throw HttpError.badRequest('The file is larger than declared. Choose the file again.')
  }
  if (offset === 0 && !matchesMagic(meta.kind, meta.mimeType, chunk.slice(0, 16))) {
    await discardUpload(id)
    throw new HttpError(400, 'UPLOAD_TYPE', TYPE_MESSAGE[meta.mimeType] ?? 'Unsupported file type')
  }
  await appendFile(partPath(id), chunk)
  return {
    received: received + chunk.byteLength,
    complete: received + chunk.byteLength === meta.sizeBytes,
  }
}

/**
 * Moves a complete upload into permanent storage for a submission. Returns the stored path,
 * relative to the uploads root.
 */
export async function commitUpload(meta: UploadMeta, submissionId: string): Promise<string> {
  const received = await receivedBytes(meta.id)
  if (received !== meta.sizeBytes) {
    throw new HttpError(
      400,
      'UPLOAD_INCOMPLETE',
      'The upload did not finish. Attach the file again.',
    )
  }
  const ext = path.extname(meta.fileName).toLowerCase()
  const relative = path.join('submissions', submissionId, `file${ext}`)
  await mkdir(path.join(ROOT, 'submissions', submissionId), { recursive: true })
  await rename(partPath(meta.id), path.join(ROOT, relative))
  await rm(metaPath(meta.id), { force: true })
  return relative
}

export async function discardUpload(id: string) {
  assertId(id)
  await Promise.all([rm(metaPath(id), { force: true }), rm(partPath(id), { force: true })])
}

/**
 * Absolute path of a stored file, or null when nothing is stored there (seeded submissions
 * carry file details only). Paths that resolve outside the uploads root are refused.
 */
export async function storedFile(relative: string | null): Promise<string | null> {
  if (!relative) return null
  const full = path.resolve(ROOT, relative)
  if (!full.startsWith(`${ROOT}${path.sep}`)) return null
  const info = await stat(full).catch(() => null)
  return info?.isFile() ? full : null
}

export const UPLOAD_ROOT = ROOT
