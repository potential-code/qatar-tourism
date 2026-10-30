import type { LicenceStatus } from '@shared/constants'
import { learnerDisplayId } from '@shared/utils/identity'
import {
  ApiError,
  commit,
  db,
  delay,
  insertRow,
  nowIso,
  out,
  requireCapability,
  requireRole,
} from './api'
import { audit } from './audit.service'
import { fieldRows, findEvent, learnerLinks } from './crm/common'
import { processEvent } from './crm/events'
import {
  formatValueMap,
  type MappingPreview,
  type ProgrammeLetter,
  parseValueMap,
  previewMapping,
} from './crm/mapping'
import { unmappedCodes } from './crm.service'

/**
 * CRM field mapping, mapping resolution, reconciliation and the identity review queue
 * (SPEC §8, §9). Changes need `integration.configure` and are audited.
 */

const SAMPLE_INPUT: Record<string, string> = {
  external_learner_id: 'CRM-0042',
  organisation: '  Gulf Hospitality Group  ',
  programme_code: 'QT-A',
  exam_score: '0.82',
  certificate_id: 'QTA-DEMO-A-000121',
  licence_status: 'ACTIVE',
}

export type MappingRowView = {
  id: string
  crmField: string
  lmsField: string
  dataType: string
  direction: 'crm_to_lms' | 'lms_to_crm' | 'both'
  transformation: string
  required: boolean
  authoritative: 'crm' | 'lms'
  sample: string
}

const toRowView = (r: ReturnType<typeof fieldRows>[number]): MappingRowView => ({
  id: r.id,
  crmField: r.crmField ?? '',
  lmsField: r.lmsField ?? '',
  dataType: r.dataType ?? 'string',
  direction: r.direction,
  transformation: r.transformation ?? 'Copy',
  required: r.required,
  authoritative: r.authoritative,
  sample: SAMPLE_INPUT[r.crmField ?? ''] ?? '',
})

export async function listCrmMappings() {
  await delay()
  requireRole('admin')
  return out({
    fields: fieldRows().map(toRowView),
    unmappedCodes: [...unmappedCodes()],
  })
}

export type MappingPatch = Partial<
  Pick<
    MappingRowView,
    'lmsField' | 'dataType' | 'direction' | 'transformation' | 'required' | 'authoritative'
  >
>

function validatePatch(patch: MappingPatch): void {
  const issues: { path: string; message: string }[] = []
  if (patch.direction && !['crm_to_lms', 'lms_to_crm', 'both'].includes(patch.direction)) {
    issues.push({ path: 'direction', message: 'Choose a direction.' })
  }
  if (patch.authoritative && !['crm', 'lms'].includes(patch.authoritative)) {
    issues.push({ path: 'authoritative', message: 'Choose the authoritative system.' })
  }
  if (patch.transformation !== undefined) {
    const t = patch.transformation.trim()
    if (t.length < 2 || t.length > 200) {
      issues.push({
        path: 'transformation',
        message: 'Describe the transformation (2 to 200 characters).',
      })
    }
    if (t.startsWith('Value map') && Object.keys(parseValueMap(t)).length === 0) {
      issues.push({
        path: 'transformation',
        message: 'A value map needs entries like "QT-B to Program B".',
      })
    }
  }
  if (patch.lmsField !== undefined && patch.lmsField.trim().length < 2) {
    issues.push({ path: 'lmsField', message: 'Enter the LMS field.' })
  }
  if (issues.length > 0) throw ApiError.validation('Invalid request', { target: 'json', issues })
}

/** Previews a (possibly edited) row on a synthetic record. Saves nothing. */
export async function previewCrmMapping(
  rowId: string,
  patch: MappingPatch,
  sampleValue: string,
): Promise<MappingPreview> {
  await delay()
  requireRole('admin')
  const row = fieldRows().find((r) => r.id === rowId)
  if (!row) throw ApiError.notFound('Mapping row not found')
  validatePatch(patch)
  return out(previewMapping({ ...row, ...patch }, sampleValue))
}

export async function updateCrmMapping(rowId: string, patch: MappingPatch) {
  await delay()
  requireCapability('integration.configure')
  const row = fieldRows().find((r) => r.id === rowId)
  if (!row) throw ApiError.notFound('Mapping row not found')
  validatePatch(patch)
  const before = toRowView(row)
  Object.assign(row, {
    ...patch,
    ...(patch.transformation !== undefined ? { transformation: patch.transformation.trim() } : {}),
    updatedAt: nowIso(),
  })
  audit({
    action: 'integration.mapping_update',
    objectType: 'crm_mapping',
    objectId: row.crmField,
    before: {
      direction: before.direction,
      authoritative: before.authoritative,
      transformation: before.transformation,
    },
    after: {
      direction: row.direction,
      authoritative: row.authoritative,
      transformation: row.transformation,
    },
    reason: 'Field mapping changed (demo configuration).',
  })
  commit()
  return out(toRowView(row))
}

export type ResolvePreview = {
  eventId: string
  crmCode: string
  programme: ProgrammeLetter
  before: string
  after: string
  effect: string
  alsoFixes: string[]
}

function programmeRow() {
  const row = fieldRows().find((r) => r.crmField === 'programme_code')
  if (!row) throw ApiError.notFound('The programme code mapping row was not found')
  return row
}

function resolution(eventId: string, programme: ProgrammeLetter) {
  const event = findEvent(eventId)
  const code = event?.payload.programmeCode
  if (!event || typeof code !== 'string' || !unmappedCodes().has(code)) {
    throw new ApiError(409, 'NOT_A_MAPPING_GAP', 'This event does not need a programme mapping.')
  }
  if (!['A', 'B', 'C'].includes(programme))
    throw ApiError.validation('Invalid request', {
      target: 'json',
      issues: [{ path: 'programme', message: 'Choose a programme.' }],
    })
  const row = programmeRow()
  const map = { ...parseValueMap(row.transformation), [code]: programme }
  const stillUnmapped = [...unmappedCodes()].filter((c) => c !== code)
  return { event, code, row, after: formatValueMap(map, stillUnmapped), map }
}

/** Previews a mapping fix for a failed event. Saves nothing. */
export async function previewResolveMapping(
  eventId: string,
  programme: ProgrammeLetter,
): Promise<ResolvePreview> {
  await delay()
  requireRole('admin')
  const { event, code, row, after } = resolution(eventId, programme)
  const learner = event.learnerId
    ? db.profiles.find((p) => p.userId === event.learnerId)
    : undefined
  const hasEnrolment = db.enrolments.some(
    (e) =>
      e.learnerId === event.learnerId &&
      e.programmeId === db.programmes.find((p) => p.code === programme)?.id,
  )
  const hasRequest = db.approvalRequests.some(
    (r) => r.type === 'enrolment' && r.learnerId === event.learnerId && r.status === 'pending',
  )
  const who = learner
    ? `${learner.fullName} (${learnerDisplayId(learner.learnerCode)})`
    : 'The learner'
  return {
    eventId,
    crmCode: code,
    programme,
    before: row.transformation ?? '',
    after,
    effect: hasEnrolment
      ? `${who} already has a Program ${programme} enrolment: it would be updated; no duplicate record is created.`
      : hasRequest
        ? `${who} already has a pending Program ${programme} request: it would be updated; no duplicate record is created.`
        : `${who} has no Program ${programme} record: an enrolment request would be created for approval.`,
    alsoFixes: db.crmEvents
      .filter(
        (e) => e.status === 'failed' && e.payload.programmeCode === code && e.eventId !== eventId,
      )
      .map((e) => e.eventId),
  }
}

/** Saves the programme mapping. It does not retry; the presenter retries as a separate step. */
export async function resolveCrmMapping(eventId: string, programme: ProgrammeLetter) {
  await delay()
  requireCapability('integration.configure')
  const { code, row, after } = resolution(eventId, programme)
  const before = row.transformation
  Object.assign(row, { transformation: after, updatedAt: nowIso() })
  audit({
    action: 'integration.mapping_resolve',
    objectType: 'crm_mapping',
    objectId: 'programme_code',
    before: { transformation: before },
    after: { transformation: after },
    reason: `Mapped CRM programme code ${code} to Program ${programme} for ${eventId}.`,
  })
  commit()
  return out(toRowView(row))
}

export type ReconcileChoice = 'keep_lms' | 'apply_crm'

/** Settles a conflict event: keep the newer LMS value, or deliberately apply the CRM value. */
export async function reconcileCrmEvent(eventId: string, choice: ReconcileChoice, reason: string) {
  await delay()
  requireCapability('integration.configure')
  const row = findEvent(eventId)
  if (!row) throw ApiError.notFound('Event not found')
  if (row.status !== 'conflict')
    throw new ApiError(409, 'NOT_A_CONFLICT', 'Only conflict events can be reconciled.')
  if (row.payload.identityReview === true) {
    throw new ApiError(409, 'IDENTITY_REVIEW', 'Resolve this in the identity review queue.')
  }
  if (reason.trim().length < 5) {
    throw ApiError.validation('Invalid request', {
      target: 'json',
      issues: [{ path: 'reason', message: 'Give a reason of at least 5 characters.' }],
    })
  }
  const before = row.status
  if (choice === 'apply_crm' && row.type === 'licence' && row.learnerId) {
    const status = row.payload.licenceStatus as LicenceStatus
    const current = db.licenceStatus.find((l) => l.learnerId === row.learnerId)
    if (current) Object.assign(current, { status, pendingRequest: null, updatedAt: nowIso() })
    else
      insertRow('licenceStatus', {
        learnerId: row.learnerId,
        status,
        source: 'crm',
        pendingRequest: null,
      })
  }
  Object.assign(row, {
    status: 'processed',
    error: null,
    processedAt: nowIso(),
    updatedAt: nowIso(),
    payload: {
      ...row.payload,
      reconciled: choice === 'keep_lms' ? 'Kept the newer LMS value' : 'Applied the CRM value',
    },
  })
  audit({
    action: 'crm.event.reconcile',
    objectType: 'crm_event',
    objectId: eventId,
    before: { status: before },
    after: { status: 'processed', choice },
    reason: reason.trim(),
  })
  commit()
  return { eventId, status: 'processed' as const }
}

// --- Identity review queue ---------------------------------------------------------------------

const CRM_RECORD_HINTS: Record<string, { name: string; email: string }> = {
  'CRM-7001': { name: 'Maryam Al Nuaimi', email: 'mariam.alnuaimi@example.com' },
}

export type IdentityCandidate = {
  userId: string
  display: string
  name: string
  email: string
  basis: string
  linkedTo: string | null
}

export type IdentityReviewItem = {
  mappingId: string
  externalLearnerId: string
  crmRecord: { name: string; email: string } | null
  waitingEvents: string[]
  candidates: IdentityCandidate[]
}

function candidate(userId: string, basis: string): IdentityCandidate | null {
  const profile = db.profiles.find((p) => p.userId === userId)
  const user = db.users.find((u) => u.id === userId)
  if (!profile || !user) return null
  const link = learnerLinks().find((m) => m.learnerId === userId && m.matchState === 'matched')
  return {
    userId,
    display: learnerDisplayId(profile.learnerCode),
    name: profile.fullName,
    email: user.email,
    basis,
    linkedTo: link?.externalLearnerId ?? null,
  }
}

function proposals(hint: { name: string; email: string }): IdentityCandidate[] {
  const byEmail = db.users.find((u) => u.email.toLowerCase() === hint.email.toLowerCase())
  const found: IdentityCandidate[] = []
  const exact = byEmail ? candidate(byEmail.id, 'Same email address') : null
  if (exact) found.push(exact)
  const surname = hint.name.toLowerCase().split(/\s+/).at(-1) ?? ''
  for (const p of db.profiles) {
    if (found.length >= 3) break
    if (found.some((c) => c.userId === p.userId)) continue
    if (surname.length > 3 && p.fullName.toLowerCase().includes(surname)) {
      const c = candidate(p.userId, 'Similar surname')
      if (c) found.push(c)
    }
  }
  return found
}

export async function listIdentityReview(): Promise<IdentityReviewItem[]> {
  await delay()
  requireRole('admin')
  return out(
    learnerLinks()
      .filter((m) => m.matchState === 'review')
      .map((m) => {
        const ext = m.externalLearnerId ?? ''
        const hint = CRM_RECORD_HINTS[ext] ?? null
        return {
          mappingId: m.id,
          externalLearnerId: ext,
          crmRecord: hint,
          waitingEvents: db.crmEvents
            .filter((e) => e.externalLearnerId === ext && e.status !== 'processed')
            .map((e) => e.eventId),
          candidates: hint ? proposals(hint) : [],
        }
      }),
  )
}

export async function searchLearners(query: string): Promise<IdentityCandidate[]> {
  await delay()
  requireRole('admin')
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const matches: IdentityCandidate[] = []
  for (const p of db.profiles) {
    if (matches.length >= 8) break
    const email = db.users.find((u) => u.id === p.userId)?.email ?? ''
    if (
      p.fullName.toLowerCase().includes(q) ||
      learnerDisplayId(p.learnerCode).toLowerCase().includes(q) ||
      email.toLowerCase().includes(q)
    ) {
      const c = candidate(p.userId, 'Search result')
      if (c) matches.push(c)
    }
  }
  return out(matches)
}

/** Links a CRM record to an EXISTING learner. A learner is never created, or linked twice. */
export async function linkCrmIdentity(mappingId: string, learnerUserId: string, reason: string) {
  await delay()
  const user = requireCapability('integration.configure')
  const link = learnerLinks().find((m) => m.id === mappingId)
  if (link?.matchState !== 'review') throw ApiError.notFound('Review item not found')
  if (reason.trim().length < 5) {
    throw ApiError.validation('Invalid request', {
      target: 'json',
      issues: [{ path: 'reason', message: 'Give a reason of at least 5 characters.' }],
    })
  }
  const profile = db.profiles.find((p) => p.userId === learnerUserId)
  if (!profile) throw ApiError.notFound('Learner not found')
  const other = learnerLinks().find(
    (m) => m.id !== mappingId && m.learnerId === learnerUserId && m.matchState === 'matched',
  )
  if (other) {
    throw new ApiError(
      409,
      'ALREADY_LINKED',
      `${learnerDisplayId(profile.learnerCode)} is already linked to ${other.externalLearnerId}. No duplicate profile is created; resolve the duplicate in the CRM.`,
    )
  }
  Object.assign(link, { learnerId: learnerUserId, matchState: 'matched', updatedAt: nowIso() })
  const external = link.externalLearnerId
  const released = db.crmEvents.filter(
    (e) =>
      e.externalLearnerId === external &&
      e.status === 'conflict' &&
      e.payload.identityReview === true,
  )
  for (const e of released) {
    e.learnerId = learnerUserId
    e.status = 'queued'
    const { identityReview: _drop, ...rest } = e.payload
    e.payload = rest
    processEvent({ id: user.id, role: user.role, name: user.name }, e)
  }
  audit({
    action: 'crm.identity.link',
    objectType: 'crm_mapping',
    objectId: external,
    after: { learner: learnerDisplayId(profile.learnerCode), external },
    reason: reason.trim(),
  })
  commit()
  return { linked: true, released: released.map((e) => e.eventId) }
}
