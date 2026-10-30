import { accountStatusOf, learnerDisplayId } from '@shared/utils/identity'
import { commit, db } from '../../api'
import { cpdSummary } from '../../credentials/cpd'
import { toEventView } from '../../crm/views'
import { unmappedCodes } from '../../crm.service'
import { settleOffers } from '../../rsvps/offers'
import { waitlistEntries } from '../../rsvps-waitlist.service'
import type { ReportDefinition, ReportRow } from '../types'

/**
 * Reports added for the 29 Oct update (SPEC §9 "Reports and AI Analytics"): approvals and
 * external review, waitlist, account status, CPD progress, content language and format, and CRM
 * sync status. Each is a plain table over the same records the dashboard counts read, so a
 * dashboard count and its report always reconcile. The label maps are exported for the tests.
 */

const profileOf = (userId: string) => db.profiles.find((p) => p.userId === userId)
const userName = (userId: string | null) =>
  userId ? (db.users.find((u) => u.id === userId)?.name ?? null) : null

const learnerCells = (userId: string) => {
  const profile = profileOf(userId)
  return {
    learnerId: userId,
    learnerCode: profile ? learnerDisplayId(profile.learnerCode) : null,
    name: profile?.fullName ?? null,
  }
}

const LEARNER_COLUMNS = [
  { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
  { key: 'name', header: 'Learner', type: 'text', field: 'displayName' },
] as const

export const APPROVAL_STATUS_LABEL = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  info_requested: 'Information requested',
} as const

/** Pending approvals: enrolment and external-certificate requests (the dashboard count). */
export const approvalsReport: ReportDefinition = {
  key: 'approvals',
  title: 'Approvals',
  description:
    'Enrolment and external-certificate requests with reviewer and status. The dashboard Pending approvals count is the Pending review filter of this table.',
  filterScope: 'none',
  columns: [
    { key: 'code', header: 'Request ID', type: 'code' },
    { key: 'type', header: 'Type', type: 'text' },
    ...LEARNER_COLUMNS,
    { key: 'subject', header: 'Programme or credential', type: 'text' },
    { key: 'submittedAt', header: 'Submitted', type: 'date' },
    { key: 'reviewer', header: 'Reviewer', type: 'text' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'decidedAt', header: 'Decided', type: 'date' },
    { key: 'session', header: 'Session', type: 'code', detailOnly: true },
    { key: 'reason', header: 'Reason', type: 'text', detailOnly: true },
    { key: 'evidence', header: 'Evidence', type: 'text', detailOnly: true },
  ],
  statusKey: 'status',
  statusOptions: Object.values(APPROVAL_STATUS_LABEL).map((label) => ({
    value: label,
    label,
  })),
  defaultSort: { key: 'submittedAt', direction: 'desc' },
  searchKeys: ['code', 'type', 'learnerCode', 'name', 'subject'],
  load() {
    return db.approvalRequests.map((request): ReportRow => {
      const programme = db.programmes.find((p) => p.id === request.programmeId)
      const cert = db.externalCertificates.find((c) => c.id === request.externalCertificateId)
      const session = db.sessions.find((s) => s.id === request.sessionId)
      return {
        id: request.id,
        code: request.code,
        type: request.type === 'enrolment' ? 'Enrolment' : 'External certificate',
        ...learnerCells(request.learnerId),
        subject:
          request.type === 'enrolment'
            ? `Program ${programme?.code ?? '?'}`
            : (cert?.title ?? null),
        submittedAt: request.submittedAt,
        reviewer: userName(request.reviewerId),
        status: APPROVAL_STATUS_LABEL[request.status],
        decidedAt: request.decidedAt,
        session: session?.code ?? null,
        reason: request.reason,
        evidence: request.evidence.fileName
          ? `${request.evidence.note} (${request.evidence.fileName})`
          : request.evidence.note,
      }
    })
  },
  summarise(rows) {
    const count = (label: string) => rows.filter((r) => r.status === label).length
    return [
      { label: 'Requests', value: String(rows.length) },
      { label: 'Pending review', value: String(count('Pending review')) },
      { label: 'Rejected', value: String(count('Rejected')) },
    ]
  },
}

export const EXTERNAL_STATUS_LABEL = {
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
  info_requested: 'Information requested',
} as const

/** External certificates and the CPD a reviewer recognised (SPEC §7). */
export const externalReviewReport: ReportDefinition = {
  key: 'external-review',
  title: 'External certificate review',
  description:
    'External certificates submitted by learners, with claimed and recognised CPD. Only verified certificates add approved CPD; they stay separate from Academy-issued credentials.',
  filterScope: 'none',
  columns: [
    ...LEARNER_COLUMNS,
    { key: 'title', header: 'Certificate', type: 'text' },
    { key: 'issuer', header: 'Issuer', type: 'text' },
    { key: 'claimed', header: 'Claimed CPD', type: 'number' },
    { key: 'unit', header: 'Unit', type: 'text' },
    { key: 'recognised', header: 'Recognised CPD', type: 'number' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'submittedAt', header: 'Submitted', type: 'date' },
    { key: 'reviewedAt', header: 'Reviewed', type: 'date' },
    { key: 'reviewer', header: 'Reviewer', type: 'text', detailOnly: true },
    { key: 'externalRef', header: 'External reference', type: 'code', detailOnly: true },
    { key: 'evidence', header: 'Evidence file', type: 'text', detailOnly: true },
    { key: 'reason', header: 'Reason', type: 'text', detailOnly: true },
  ],
  statusKey: 'status',
  statusOptions: Object.values(EXTERNAL_STATUS_LABEL).map((label) => ({ value: label, label })),
  defaultSort: { key: 'submittedAt', direction: 'desc' },
  searchKeys: ['learnerCode', 'name', 'title', 'issuer', 'externalRef'],
  load() {
    return db.externalCertificates.map(
      (cert): ReportRow => ({
        id: cert.id,
        ...learnerCells(cert.learnerId),
        title: cert.title,
        issuer: cert.issuer,
        claimed: cert.claimedAmount,
        unit: cert.unit,
        recognised: cert.recognisedAmount,
        status: EXTERNAL_STATUS_LABEL[cert.status],
        submittedAt: cert.submittedAt,
        reviewedAt: cert.reviewedAt,
        reviewer: userName(cert.reviewerId),
        externalRef: cert.externalRef,
        evidence: cert.evidenceFileName,
        reason: cert.reason,
      }),
    )
  },
  summarise(rows) {
    const recognised = rows.reduce((sum, r) => sum + Number(r.recognised ?? 0), 0)
    return [
      { label: 'Certificates', value: String(rows.length) },
      {
        label: 'Pending review',
        value: String(rows.filter((r) => r.status === 'Pending review').length),
      },
      { label: 'Recognised CPD', value: String(Math.round(recognised * 100) / 100) },
    ]
  },
}

/** Waitlisted and offered seats on upcoming sessions (the dashboard Waitlisted learners count). */
export const waitlistReport: ReportDefinition = {
  key: 'waitlist',
  title: 'Waitlist',
  description:
    'Learners waiting for a seat or holding an offer on upcoming sessions. A waitlisted learner is never recorded as attending. The dashboard count is the number of distinct learners in this table.',
  filterScope: 'none',
  columns: [
    { key: 'sessionCode', header: 'Session', type: 'code' },
    { key: 'sessionTitle', header: 'Title', type: 'text' },
    { key: 'startsAt', header: 'Starts', type: 'datetime' },
    ...LEARNER_COLUMNS,
    { key: 'position', header: 'Position', type: 'number' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'offerExpiresAt', header: 'Offer expires', type: 'datetime' },
  ],
  statusKey: 'status',
  statusOptions: [
    { value: 'Waitlisted', label: 'Waitlisted' },
    { value: 'Offer pending', label: 'Offer pending' },
  ],
  defaultSort: { key: 'startsAt', direction: 'asc' },
  searchKeys: ['sessionCode', 'sessionTitle', 'learnerCode', 'name'],
  load() {
    if (settleOffers()) commit()
    return waitlistEntries().map(
      (entry): ReportRow => ({
        id: entry.rsvpId,
        learnerId: entry.learnerId,
        sessionCode: entry.sessionCode,
        sessionTitle: entry.sessionTitle,
        startsAt: entry.startsAt,
        learnerCode: entry.learnerDisplayId,
        name: entry.name,
        position: entry.position,
        status: entry.status === 'offered' ? 'Offer pending' : 'Waitlisted',
        offerExpiresAt: entry.offerExpiresAt,
      }),
    )
  },
  summarise(rows) {
    return [
      { label: 'Waitlist entries', value: String(rows.length) },
      { label: 'Learners waiting', value: String(new Set(rows.map((r) => r.learnerId)).size) },
      {
        label: 'Offers pending',
        value: String(rows.filter((r) => r.status === 'Offer pending').length),
      },
    ]
  },
}

/** Accounts that are locked or disabled (the dashboard Locked accounts count). */
export const accountStatusReport: ReportDefinition = {
  key: 'account-status',
  title: 'Locked accounts',
  description:
    'Learner accounts that are locked or disabled. Locking blocks sign-in but keeps history, results and credentials. Account status is separate from approval, certificate validity and licence status.',
  filterScope: 'none',
  columns: [
    ...LEARNER_COLUMNS,
    { key: 'status', header: 'Account status', type: 'status' },
    { key: 'lockedAt', header: 'Locked', type: 'date' },
    { key: 'lockedBy', header: 'Locked by', type: 'text' },
    { key: 'reason', header: 'Reason', type: 'text' },
  ],
  statusKey: 'status',
  statusOptions: [
    { value: 'Locked', label: 'Locked' },
    { value: 'Disabled', label: 'Disabled' },
  ],
  defaultSort: { key: 'lockedAt', direction: 'desc' },
  searchKeys: ['learnerCode', 'name', 'reason'],
  load() {
    return db.profiles.flatMap((profile): ReportRow[] => {
      const status = accountStatusOf(profile)
      if (status === 'active') return []
      return [
        {
          id: profile.id,
          ...learnerCells(profile.userId),
          status: status === 'locked' ? 'Locked' : 'Disabled',
          lockedAt: profile.lockedAt,
          lockedBy: userName(profile.lockedBy),
          reason: profile.lockReason,
        },
      ]
    })
  },
  summarise(rows) {
    return [
      { label: 'Locked', value: String(rows.filter((r) => r.status === 'Locked').length) },
      { label: 'Disabled', value: String(rows.filter((r) => r.status === 'Disabled').length) },
    ]
  },
}

/** CPD progress per learner against the demo target (SPEC §7). Only earned and approved count. */
export const cpdReport: ReportDefinition = {
  key: 'cpd',
  title: 'CPD progress',
  description:
    'Earned, pending and remaining CPD per learner for the demo cycle. Demo settings, subject to Qatar Tourism confirmation. Hours and credits are only combined through the configured conversion.',
  filterScope: 'cohort',
  columns: [
    ...LEARNER_COLUMNS,
    { key: 'programme', header: 'Programme', type: 'programme' },
    { key: 'earned', header: 'Earned and approved', type: 'number' },
    { key: 'pending', header: 'Pending approval', type: 'number' },
    { key: 'target', header: 'Target', type: 'number' },
    { key: 'remaining', header: 'Remaining', type: 'number' },
    { key: 'progress', header: 'Progress', type: 'percent' },
    { key: 'unit', header: 'Unit', type: 'text' },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  statusKey: 'status',
  statusOptions: [
    { value: 'Target met', label: 'Target met' },
    { value: 'In progress', label: 'In progress' },
    { value: 'Pending approval', label: 'Pending approval' },
  ],
  defaultSort: { key: 'progress', direction: 'desc' },
  searchKeys: ['learnerCode', 'name'],
  load({ cohort }) {
    const tracked = new Set(db.cpdLedger.map((l) => l.learnerId))
    const seen = new Set<string>()
    const rows: ReportRow[] = []
    for (const fact of cohort) {
      if (seen.has(fact.learnerId) || !tracked.has(fact.learnerId)) continue
      seen.add(fact.learnerId)
      const cpd = cpdSummary(fact.learnerId)
      const progress =
        cpd.target > 0 ? Math.min(100, Math.round((cpd.earned / cpd.target) * 100)) : 0
      rows.push({
        id: fact.learnerId,
        learnerId: fact.learnerId,
        learnerCode: learnerDisplayId(fact.learnerCode),
        name: fact.learnerName,
        programme: fact.programme,
        earned: cpd.earned,
        pending: cpd.pending,
        target: cpd.target,
        remaining: cpd.remaining,
        progress,
        unit: cpd.unit,
        status:
          cpd.earned >= cpd.target
            ? 'Target met'
            : cpd.pending > 0
              ? 'Pending approval'
              : 'In progress',
      })
    }
    return rows
  },
  summarise(rows) {
    return [
      { label: 'Learners with CPD', value: String(rows.length) },
      { label: 'Target met', value: String(rows.filter((r) => r.status === 'Target met').length) },
      {
        label: 'Pending approval',
        value: String(rows.filter((r) => r.status === 'Pending approval').length),
      },
    ]
  },
}

const LANGUAGE_LABEL = { en: 'English', ar: 'Arabic' } as const

/** Content Library variants by language and format, with launches and completions (SPEC §3). */
export const contentReport: ReportDefinition = {
  key: 'content',
  title: 'Content by language and format',
  description:
    'Each English and Arabic package of the Content Library with its format, version, learner launches and completions. xAPI events come from the simulated learning record store.',
  filterScope: 'none',
  columns: [
    { key: 'packageId', header: 'Package ID', type: 'code' },
    { key: 'title', header: 'Title', type: 'text' },
    { key: 'language', header: 'Language', type: 'status' },
    { key: 'format', header: 'Format', type: 'text' },
    { key: 'version', header: 'Version', type: 'code' },
    { key: 'launched', header: 'Learners launched', type: 'number' },
    { key: 'completed', header: 'Completed', type: 'number' },
    { key: 'statements', header: 'xAPI statements', type: 'number' },
    { key: 'accessGroup', header: 'Access group', type: 'text', detailOnly: true },
    { key: 'courseKey', header: 'Course identity', type: 'code', detailOnly: true },
  ],
  statusKey: 'language',
  statusOptions: [
    { value: 'English', label: 'English' },
    { value: 'Arabic', label: 'Arabic' },
  ],
  defaultSort: { key: 'title', direction: 'asc' },
  searchKeys: ['packageId', 'title', 'format', 'language'],
  load() {
    return db.contentPackages.flatMap((pkg): ReportRow[] => {
      const packageId = pkg.packageId
      if (!packageId) return []
      const launched = db.unitProgress.filter((u) => {
        const extra = u.extra ?? {}
        const bookmarks = extra.bookmarks as Record<string, unknown> | undefined
        return Boolean(bookmarks?.[packageId]) || extra.activePackageId === packageId
      })
      return [
        {
          id: pkg.id,
          packageId,
          title: pkg.title,
          language: LANGUAGE_LABEL[pkg.language],
          format: pkg.formatLabel,
          version: pkg.version,
          launched: launched.length,
          completed: launched.filter((u) => u.extra?.completedPackageId === packageId).length,
          statements: db.xapiStatements.filter((s) => s.packageId === packageId).length,
          accessGroup: pkg.accessGroup,
          courseKey: pkg.courseKey,
        },
      ]
    })
  },
  summarise(rows) {
    return [
      { label: 'Packages', value: String(rows.length) },
      { label: 'Arabic', value: String(rows.filter((r) => r.language === 'Arabic').length) },
      {
        label: 'Learners launched',
        value: String(rows.reduce((s, r) => s + Number(r.launched), 0)),
      },
    ]
  },
}

export const CRM_STATUS_LABEL = {
  processed: 'Processed',
  queued: 'Queued',
  failed: 'Failed',
  conflict: 'Conflict',
} as const

/** The CRM sync log (SPEC §8–9). Queued, Failed and Conflict feed the dashboard CRM card. */
export const crmSyncReport: ReportDefinition = {
  key: 'crm-sync',
  title: 'CRM sync status',
  description:
    'Every simulated CRM event with direction, status, attempts and readable error. The dashboard CRM card pending count is the Queued filter; failed is Failed plus Conflict. No network call is made.',
  filterScope: 'none',
  columns: [
    { key: 'eventId', header: 'Event ID', type: 'code' },
    { key: 'eventType', header: 'Entity', type: 'text' },
    { key: 'direction', header: 'Direction', type: 'text' },
    { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'attempts', header: 'Attempts', type: 'number' },
    { key: 'occurredAt', header: 'Occurred', type: 'datetime' },
    { key: 'error', header: 'Error', type: 'text' },
    { key: 'externalLearnerId', header: 'CRM learner ID', type: 'code', detailOnly: true },
    { key: 'entity', header: 'Linked record', type: 'text', detailOnly: true },
  ],
  statusKey: 'status',
  statusOptions: Object.values(CRM_STATUS_LABEL).map((label) => ({ value: label, label })),
  defaultSort: { key: 'occurredAt', direction: 'desc' },
  searchKeys: ['eventId', 'eventType', 'direction', 'learnerCode', 'error'],
  load() {
    const codes = unmappedCodes()
    return db.crmEvents.map((event): ReportRow => {
      const view = toEventView(event, codes)
      return {
        id: event.id,
        learnerId: event.learnerId,
        eventId: event.eventId,
        eventType: event.type.charAt(0).toUpperCase() + event.type.slice(1),
        direction: event.direction === 'crm_to_lms' ? 'CRM to LMS' : 'LMS to CRM',
        learnerCode: view.learnerDisplayId,
        status: CRM_STATUS_LABEL[event.status],
        attempts: event.attempts,
        occurredAt: event.occurredAt,
        error: event.error,
        externalLearnerId: event.externalLearnerId,
        entity: view.entityLabel,
      }
    })
  },
  summarise(rows) {
    const count = (label: string) => rows.filter((r) => r.status === label).length
    return [
      { label: 'Events', value: String(rows.length) },
      { label: 'Queued', value: String(count('Queued')) },
      { label: 'Failed or conflict', value: String(count('Failed') + count('Conflict')) },
    ]
  },
}
