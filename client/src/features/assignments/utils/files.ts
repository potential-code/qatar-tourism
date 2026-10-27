import { env } from '@/config/env'

/** The authorised download endpoint: the API checks the viewer's scope on every request. */
export function fileUrl(submissionId: string, inline = false) {
  return `${env.VITE_API_URL}/api/assignments/submissions/${submissionId}/file${inline ? '?inline=1' : ''}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
