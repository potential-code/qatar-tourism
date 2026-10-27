import { useMutation } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api'

type ExportKind = 'marks' | 'personal'

/** Calls an export endpoint and hands the CSV to the browser. Errors keep the API's message. */
async function downloadExport(sessionId: string, kind: ExportKind) {
  const endpoint = api.exports.sessions[':sessionId'][kind]
  const res = await endpoint.$get({ param: { sessionId } })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code: string; message: string }
    } | null
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'The export failed. Try again.',
    )
  }
  const blob = await res.blob()
  const name =
    /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `${kind}.csv`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  return { rows: Number(res.headers.get('X-Export-Rows') ?? 0), name }
}

export function useSessionExport() {
  return useMutation({
    mutationFn: ({ sessionId, kind }: { sessionId: string; kind: ExportKind }) =>
      downloadExport(sessionId, kind),
  })
}
