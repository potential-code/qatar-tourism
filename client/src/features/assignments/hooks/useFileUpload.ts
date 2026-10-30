import { uploadProblem } from '@shared/schemas/assignment-marking'
import { useCallback, useRef, useState } from 'react'
import i18n from '@/i18n'
import { ApiError } from '@/lib/api-error'
import { uploadAssignmentFile } from '../queries/assignments.queries'

export type UploadState =
  | { status: 'idle' }
  | { status: 'invalid'; message: string; file: File }
  | { status: 'uploading'; file: File; progress: number }
  | { status: 'ready'; file: File; uploadId: string }
  | { status: 'error'; file: File; message: string }

/**
 * Stores a chosen file in this browser in one step. The file is checked here first for a fast
 * message, and again by the assignments service, which also checks its first bytes.
 */
export function useFileUpload(assignmentId: string) {
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const attempt = useRef(0)

  const upload = useCallback(
    async (file: File) => {
      const current = ++attempt.current
      const problem = uploadProblem({ name: file.name, type: file.type, size: file.size })
      if (problem) {
        setState({ status: 'invalid', message: problem, file })
        return
      }
      setState({ status: 'uploading', file, progress: 0 })
      try {
        const stored = await uploadAssignmentFile(assignmentId, file)
        if (current !== attempt.current) return
        setState({ status: 'ready', file, uploadId: stored.uploadId })
      } catch (error) {
        if (current !== attempt.current) return
        setState({
          status: 'error',
          file,
          message:
            error instanceof ApiError
              ? error.message
              : i18n.t('assignments.dropzone.saveFailed', { ns: 'learner' }),
        })
      }
    },
    [assignmentId],
  )

  const reset = useCallback(() => {
    attempt.current += 1
    setState({ status: 'idle' })
  }, [])

  return { state, upload, reset }
}
