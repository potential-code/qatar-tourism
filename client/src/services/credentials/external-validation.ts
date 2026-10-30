import { COMPETENCIES, type Competency, CPD_UNITS, type CpdUnit } from '@shared/constants/enums'

/**
 * Validation for a submitted external certificate. Pure and synchronous so the form can run it
 * while the learner types; the service runs it again as the backstop. Errors are CODES, not
 * sentences, so the learner screen can show them in English or Arabic (`record:external.errors.*`).
 */

export type ExternalErrorCode =
  | 'required'
  | 'dateFuture'
  | 'dateOrder'
  | 'dateInvalid'
  | 'amount'
  | 'unit'
  | 'url'
  | 'duplicate'
  | 'fileRequired'
  | 'fileType'
  | 'fileSize'
  | 'fileEmpty'
  | 'fileContent'

export type ExternalField =
  | 'title'
  | 'issuer'
  | 'externalRef'
  | 'issuedOn'
  | 'expiresOn'
  | 'claimedAmount'
  | 'unit'
  | 'competency'
  | 'verificationUrl'
  | 'file'

export type ExternalErrors = Partial<Record<ExternalField, ExternalErrorCode>>

export interface ExternalDraft {
  title: string
  issuer: string
  externalRef: string
  issuedOn: string
  expiresOn: string
  claimedAmount: string | number
  unit: CpdUnit
  competency: Competency | ''
  verificationUrl: string
}

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024
export const MAX_CLAIMED_AMOUNT = 100

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const isDate = (value: string) => ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))

export function validateExternalDraft(draft: ExternalDraft, today: string): ExternalErrors {
  const errors: ExternalErrors = {}
  if (draft.title.trim().length < 3) errors.title = 'required'
  if (draft.issuer.trim().length < 2) errors.issuer = 'required'
  if (draft.externalRef.trim().length < 2) errors.externalRef = 'required'

  if (!draft.issuedOn) errors.issuedOn = 'required'
  else if (!isDate(draft.issuedOn)) errors.issuedOn = 'dateInvalid'
  else if (draft.issuedOn > today) errors.issuedOn = 'dateFuture'

  if (draft.expiresOn) {
    if (!isDate(draft.expiresOn)) errors.expiresOn = 'dateInvalid'
    else if (draft.issuedOn && isDate(draft.issuedOn) && draft.expiresOn <= draft.issuedOn) {
      errors.expiresOn = 'dateOrder'
    }
  }

  const amount = Number(draft.claimedAmount)
  if (draft.claimedAmount === '' || !Number.isFinite(amount)) errors.claimedAmount = 'required'
  else if (amount <= 0 || amount > MAX_CLAIMED_AMOUNT) errors.claimedAmount = 'amount'

  if (!CPD_UNITS.includes(draft.unit)) errors.unit = 'unit'
  if (draft.competency && !COMPETENCIES.includes(draft.competency)) errors.competency = 'required'

  if (draft.verificationUrl.trim()) {
    try {
      const url = new URL(draft.verificationUrl.trim())
      if (url.protocol !== 'https:' && url.protocol !== 'http:') errors.verificationUrl = 'url'
    } catch {
      errors.verificationUrl = 'url'
    }
  }
  return errors
}

/** File checks from the file's details only (type, size). The content check is `fileContentError`. */
export function validateEvidenceFile(
  file: { name: string; type: string; size: number } | null,
): ExternalErrorCode | null {
  if (!file) return 'fileRequired'
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!isPdf || (file.type && file.type !== 'application/pdf')) return 'fileType'
  if (file.size === 0) return 'fileEmpty'
  if (file.size > MAX_EVIDENCE_BYTES) return 'fileSize'
  return null
}

/** A renamed non-PDF fails here: a real PDF starts with "%PDF-". */
export async function fileContentError(file: Blob): Promise<ExternalErrorCode | null> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  return String.fromCharCode(...head) === '%PDF-' ? null : 'fileContent'
}
