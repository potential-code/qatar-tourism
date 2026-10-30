import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/** Id and name of the seeded sample file every seeded external certificate points at. */
export const SAMPLE_EVIDENCE_ID = 'sample-evidence-demo-1'
export const SAMPLE_EVIDENCE_NAME = 'sample-certificate-evidence.pdf'

/**
 * A harmless one-page demo PDF used as external-certificate evidence: dummy text, a visible
 * "SAMPLE — NOT VALID" mark, no real learner or issuer data.
 */
export async function buildSampleEvidencePdf(
  heading = 'External course certificate',
): Promise<Blob> {
  const pdf = await PDFDocument.create()
  pdf.setTitle('Sample external certificate evidence')
  pdf.setProducer('Qatar Tourism Academy demo')
  const page = pdf.addPage([595.28, 841.89])
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  page.drawText(heading, { x: 56, y: 760, size: 22, font: bold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText('Issued by a fictional training provider (dummy data).', {
    x: 56,
    y: 730,
    size: 12,
    font: regular,
    color: rgb(0.34, 0.33, 0.32),
  })
  page.drawText('SAMPLE — NOT VALID', {
    x: 70,
    y: 380,
    size: 54,
    font: bold,
    color: rgb(0.49, 0, 0.16),
    opacity: 0.18,
  })
  page.drawText(
    'Demonstration file for the Qatar Tourism Academy mockup. Not a real certificate.',
    {
      x: 56,
      y: 60,
      size: 9,
      font: regular,
      color: rgb(0.34, 0.33, 0.32),
    },
  )
  const bytes = await pdf.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}
