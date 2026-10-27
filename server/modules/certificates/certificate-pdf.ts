import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  degrees,
  PDFDocument,
  type PDFFont,
  type PDFPage,
  type RGB,
  rgb,
  StandardFonts,
} from 'pdf-lib'

/**
 * The watermarked demo certificate (brief §6), drawn with pdf-lib (ported from the
 * learning-module template). "DEMONSTRATION ONLY" runs across the design, and the wording
 * describes a training completion record, never a guide licence.
 */

export type CertificatePdfInput = {
  learnerName: string
  programmeTitle: string
  code: string
  completedOnLabel: string
  status: 'issued' | 'revoked'
  verifyUrl: string
}

const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28

const hex = (value: string): RGB => {
  const n = Number.parseInt(value.replace('#', ''), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const TEAL = hex('#00627b')
const TEAL_DEEP = hex('#035367')
const TEAL_MIST = hex('#e6f0f2')
const MAROON = hex('#7d002a')
const SAND = hex('#faf8f4')
const INK = hex('#1a1919')
const MUTED = hex('#575654')
const STONE = hex('#e2e0dc')

/** The pointed arch used across qatartourism.com, in a 0..1 box (same shape as ArchFrame). */
const ARCH_PATH =
  'M0,1 V0.34 C0,0.25 0.2,0.17 0.36,0.1 C0.43,0.07 0.47,0.04 0.5,0 C0.53,0.04 0.57,0.07 0.64,0.1 C0.8,0.17 1,0.25 1,0.34 V1 Z'

function scalePath(path: string, width: number, height: number): string {
  return path
    .replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x: string, y: string) => {
      return `${(Number(x) * width).toFixed(2)},${(Number(y) * height).toFixed(2)}`
    })
    .replace(/V(-?\d*\.?\d+)/g, (_, y: string) => `V${(Number(y) * height).toFixed(2)}`)
}

function centred(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  maxWidth = PAGE_WIDTH - 260,
) {
  let fitted = size
  while (fitted > 9 && font.widthOfTextAtSize(text, fitted) > maxWidth) fitted -= 1
  const width = font.widthOfTextAtSize(text, fitted)
  page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y, size: fitted, font, color })
}

type LogoShape = { d: string; fill: RGB }
let logoCache: { shapes: LogoShape[]; width: number; height: number } | null = null

/** Paths of the official Qatar Tourism logo, read once from the client's brand folder. */
async function loadLogo() {
  if (logoCache) return logoCache
  try {
    const svg = await readFile(
      join(import.meta.dir, '../../../client/public/brand/qatar-tourism-logo.svg'),
      'utf8',
    )
    const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
    const shapes: LogoShape[] = []
    for (const match of svg.matchAll(/<path d="([^"]+)"[^>]*style="fill:(#[0-9a-fA-F]{6})"/g)) {
      shapes.push({ d: match[1] as string, fill: hex(match[2] as string) })
    }
    for (const match of svg.matchAll(
      /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" style="fill:(#[0-9a-fA-F]{6})"/g,
    )) {
      const [x, y, w, h] = [match[1], match[2], match[3], match[4]].map(Number) as [
        number,
        number,
        number,
        number,
      ]
      shapes.push({ d: `M${x},${y} h${w} v${h} h${-w} Z`, fill: hex(match[5] as string) })
    }
    logoCache = {
      shapes,
      width: Number(viewBox?.[1] ?? 330),
      height: Number(viewBox?.[2] ?? 282),
    }
  } catch {
    // A missing logo must never block a certificate.
    logoCache = { shapes: [], width: 330, height: 282 }
  }
  return logoCache
}

export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Demonstration certificate ${input.code}`)
  pdf.setSubject('Qatar Tourism Academy demonstration certificate. Not a licence.')
  pdf.setProducer('Qatar Tourism Academy demo')

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const sans = await pdf.embedFont(StandardFonts.Helvetica)
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Ground and frame.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: SAND })
  page.drawRectangle({ x: 0, y: 0, width: 14, height: PAGE_HEIGHT, color: TEAL })
  page.drawRectangle({
    x: 34,
    y: 30,
    width: PAGE_WIDTH - 64,
    height: PAGE_HEIGHT - 60,
    borderColor: STONE,
    borderWidth: 1,
  })

  // Arch motif (the one accent on this view), framing the logo.
  const archW = 150
  const archH = 196
  const archX = (PAGE_WIDTH - archW) / 2
  const archTop = PAGE_HEIGHT - 52
  page.drawSvgPath(scalePath(ARCH_PATH, archW, archH), {
    x: archX,
    y: archTop,
    color: TEAL_MIST,
    borderColor: TEAL,
    borderWidth: 0.8,
  })

  const logo = await loadLogo()
  if (logo.shapes.length > 0) {
    const scale = 82 / logo.width
    const logoX = (PAGE_WIDTH - logo.width * scale) / 2
    const logoTop = archTop - 52
    for (const shape of logo.shapes) {
      page.drawSvgPath(shape.d, { x: logoX, y: logoTop, scale, color: shape.fill })
    }
  }

  // Watermark across the design (brief §6), centred on the page.
  const mark = 'DEMONSTRATION ONLY'
  const markSize = 50
  const markWidth = sansBold.widthOfTextAtSize(mark, markSize)
  const angle = 22
  const rad = (angle * Math.PI) / 180
  for (const offset of [-95, 95]) {
    const cx = PAGE_WIDTH / 2 - Math.sin(rad) * offset
    const cy = PAGE_HEIGHT / 2 + Math.cos(rad) * offset - 40
    page.drawText(mark, {
      x: cx - (Math.cos(rad) * markWidth) / 2,
      y: cy - (Math.sin(rad) * markWidth) / 2,
      size: markSize,
      font: sansBold,
      color: MAROON,
      opacity: 0.075,
      rotate: degrees(angle),
    })
  }

  let y = PAGE_HEIGHT - 290
  centred(page, 'QATAR TOURISM ACADEMY', y, sans, 10, TEAL_DEEP)
  y -= 36
  centred(page, 'Certificate of training completion', y, serif, 30, INK)
  y -= 34
  centred(page, 'This demonstration record confirms that', y, serifItalic, 13, MUTED)
  y -= 40
  centred(page, input.learnerName, y, serif, 34, TEAL_DEEP)
  page.drawRectangle({
    x: (PAGE_WIDTH - 280) / 2,
    y: y - 12,
    width: 280,
    height: 0.8,
    color: STONE,
  })
  y -= 38
  centred(page, 'completed every requirement of', y, serifItalic, 13, MUTED)
  y -= 28
  centred(page, `Program A: ${input.programmeTitle}`, y, sansBold, 16, INK)

  // Footer facts.
  const facts: [string, string][] = [
    ['Completion date', input.completedOnLabel],
    ['Demo certificate ID', input.code],
    ['Status', input.status === 'issued' ? 'Issued (demo record)' : 'Revoked'],
  ]
  const colW = 200
  const startX = (PAGE_WIDTH - colW * facts.length) / 2
  facts.forEach(([label, value], index) => {
    const x = startX + index * colW
    const lw = sans.widthOfTextAtSize(label.toUpperCase(), 7.5)
    page.drawText(label.toUpperCase(), {
      x: x + (colW - lw) / 2,
      y: 104,
      size: 7.5,
      font: sans,
      color: MUTED,
    })
    const vw = sansBold.widthOfTextAtSize(value, 11)
    page.drawText(value, { x: x + (colW - vw) / 2, y: 88, size: 11, font: sansBold, color: INK })
  })

  centred(
    page,
    'Training completion certificate for a fictional demonstration. It is not a guide licence, permit or official qualification.',
    58,
    sans,
    8,
    MAROON,
    PAGE_WIDTH - 140,
  )
  centred(
    page,
    `Verify this demo record at ${input.verifyUrl}`,
    44,
    sans,
    7.5,
    MUTED,
    PAGE_WIDTH - 140,
  )

  return pdf.save()
}
