/** Saves `data` as a file in the browser (CSV exports, certificate PDFs). */
export function downloadBlob(data: Blob, fileName: string): void {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Revoke after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/** A CSV download. Build `csv` with shared/utils/csv.ts `buildCsv` (it adds Excel's BOM). */
export function downloadCsv(csv: string, fileName: string): void {
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName)
}
