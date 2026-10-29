import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { submissionFileQuery } from '../queries/assignments.queries'

/**
 * An object URL for a stored submission file, for previews and downloads. Only fetched when
 * `enabled` (a seeded record has file details only). The URL is revoked when it is replaced or
 * the component unmounts.
 */
export function useSubmissionFileUrl(submissionId: string, enabled: boolean) {
  const file = useQuery({ ...submissionFileQuery(submissionId), enabled })
  const blob = file.data?.blob
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return { url, fileName: file.data?.fileName ?? null, isError: file.isError, error: file.error }
}
