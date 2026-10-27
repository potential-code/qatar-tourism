import { UPLOAD_CHUNK_BYTES, uploadProblem } from '@shared/schemas/assignment-marking'
import { useCallback, useRef, useState } from 'react'
import { env } from '@/config/env'
import { ApiError, api, unwrap } from '@/lib/api'

export type UploadState =
  | { status: 'idle' }
  | { status: 'invalid'; message: string; file: File }
  | { status: 'uploading'; file: File; progress: number }
  | { status: 'ready'; file: File; uploadId: string }
  | { status: 'error'; file: File; message: string }

async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return body?.error?.message ?? 'The upload failed. Try again.'
}

/**
 * Uploads a file in chunks (the API accepts at most 1 MB per request). The file is checked in
 * the browser first for a fast message, and again by the server, which also checks its bytes.
 */
export function useChunkedUpload(assignmentId: string) {
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const cancelled = useRef(false)

  const upload = useCallback(
    async (file: File) => {
      cancelled.current = false
      const problem = uploadProblem({ name: file.name, type: file.type, size: file.size })
      if (problem) {
        setState({ status: 'invalid', message: problem, file })
        return
      }
      setState({ status: 'uploading', file, progress: 0 })
      try {
        const started = await unwrap(
          api.assignments.uploads.$post({
            json: { assignmentId, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
          }),
        )
        for (let offset = 0; offset < file.size; offset += UPLOAD_CHUNK_BYTES) {
          if (cancelled.current) return
          const chunk = file.slice(offset, offset + UPLOAD_CHUNK_BYTES)
          const res = await fetch(
            `${env.VITE_API_URL}/api/assignments/uploads/${started.uploadId}/chunks?offset=${offset}`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: chunk,
            },
          )
          if (!res.ok) {
            setState({ status: 'error', file, message: await errorMessage(res) })
            return
          }
          const progress = Math.min(1, (offset + chunk.size) / file.size)
          setState({ status: 'uploading', file, progress })
        }
        setState({ status: 'ready', file, uploadId: started.uploadId })
      } catch (error) {
        setState({
          status: 'error',
          file,
          message:
            error instanceof ApiError
              ? error.message
              : 'The connection dropped during the upload. Try again.',
        })
      }
    },
    [assignmentId],
  )

  const reset = useCallback(() => {
    cancelled.current = true
    setState({ status: 'idle' })
  }, [])

  return { state, upload, reset }
}
