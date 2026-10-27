import { ApiError } from '@/lib/api'

/** Saves a fetch Response (a CSV from the API) as a file, keeping the server's filename. */
export async function downloadResponse(res: Response, fallbackName: string) {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code: string; message: string }
    } | null
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'EXPORT_FAILED',
      body?.error?.message ?? 'The export failed',
    )
  }
  const blob = await res.blob()
  const disposition = res.headers.get('content-disposition') ?? ''
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return name
}
