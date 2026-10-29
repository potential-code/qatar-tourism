import type { ExportKind } from '@shared/schemas/trainer-ops'
import { useMutation } from '@tanstack/react-query'
import { downloadCsv } from '@/lib/download'
import * as exportsService from '@/services/exports.service'

/**
 * Builds a session export and hands the CSV to the browser. A refusal (e.g. the trainer's
 * personal-data export, brief §11) is an `ApiError` with the service's message.
 */
async function downloadExport(sessionId: string, kind: ExportKind) {
  const file =
    kind === 'marks'
      ? await exportsService.exportSessionMarks(sessionId)
      : await exportsService.exportSessionPersonal(sessionId)
  downloadCsv(file.csv, file.filename)
  return { rows: file.rows, name: file.filename }
}

export function useSessionExport() {
  return useMutation({
    mutationFn: ({ sessionId, kind }: { sessionId: string; kind: ExportKind }) =>
      downloadExport(sessionId, kind),
  })
}
