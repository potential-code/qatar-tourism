import type { CertificateRow } from '@shared/types/db'
import { ApiError, commit, db, delay, insertRow, nowIso, out, requireRole, updateRow } from '../api'
import { recordAudit } from '../audit.service'
import { nextCertificateCode } from '../certificates/issue'
import { notify } from '../notifications.service'
import { cpdSummary } from './cpd'
import { emitCertificationEvent } from './events'
import { lifecycleOf, renewalOf } from './lifecycle'
import {
  REFRESHER_CPD_HOURS,
  RENEWAL_CHECK_PASS_PERCENT,
  RENEWAL_CHECK_QUESTIONS,
  scoreRenewalCheck,
} from './renewal-check'
import { addCredentialCpdLine, newCredentialTerms } from './rules'

/**
 * Renewal (SPEC §7). A credential that is Expiring soon or Expired can start a renewal
 * checklist: short retraining path (when expired or after a failed check), refresher course,
 * renewal knowledge check and the remaining CPD. Completing it issues a NEW credential that
 * points back at the old one (`supersedesId`); the old row is kept, shown as Superseded, and its
 * own expiry is never changed. State lives on the old credential's `evidence.renewal`.
 */

interface CheckAttempt {
  at: string
  correct: number
  total: number
  percent: number
  passed: boolean
}

interface RenewalState {
  startedAt: string
  startedBy: string
  retrainingRequired: boolean
  retrainingDoneAt: string | null
  refresherDoneAt: string | null
  checkAttempts: CheckAttempt[]
  checkPassedAt: string | null
  completedAt: string | null
  newCredentialCode: string | null
}

export type RenewalStepKey = 'retraining' | 'refresher' | 'assessment' | 'cpd'

export interface RenewalStep {
  key: RenewalStepKey
  done: boolean
  /** Whether the learner can act on it now (earlier steps are done). */
  available: boolean
}

function stateOf(cert: CertificateRow): RenewalState | null {
  const raw = renewalOf(cert)
  return raw ? (raw as unknown as RenewalState) : null
}

function setState(cert: CertificateRow, state: RenewalState) {
  updateRow(cert, { evidence: { ...cert.evidence, renewal: state } })
}

function ownCredential(code: string): CertificateRow {
  const learner = requireRole('learner')
  const cert = db.certificates.find((c) => c.code === code && c.learnerId === learner.id)
  if (!cert) throw ApiError.notFound('Certificate not found')
  return cert
}

function viewOf(cert: CertificateRow) {
  const state = stateOf(cert)
  const lifecycle = lifecycleOf(cert)
  const cpd = cpdSummary(cert.learnerId)
  const programme = db.programmes.find((p) => p.id === cert.programmeId)
  const retraining = state?.retrainingRequired ?? lifecycle === 'expired'
  const retrainingDone = !retraining || Boolean(state?.retrainingDoneAt)
  const refresherDone = Boolean(state?.refresherDoneAt)
  const checkDone = Boolean(state?.checkPassedAt)
  const cpdDone = cpd.remaining <= 0
  const steps: RenewalStep[] = [
    ...(retraining ? [{ key: 'retraining' as const, done: retrainingDone, available: true }] : []),
    { key: 'refresher', done: refresherDone, available: retrainingDone },
    { key: 'assessment', done: checkDone, available: retrainingDone && refresherDone },
    { key: 'cpd', done: cpdDone, available: true },
  ]
  const eligible = lifecycle === 'expiring_soon' || lifecycle === 'expired'
  return {
    credentialCode: cert.code,
    programmeTitle: programme?.title ?? '',
    lifecycle,
    expiresAt: cert.expiresAt,
    eligible,
    started: Boolean(state),
    completed: Boolean(state?.completedAt),
    newCredentialCode: state?.newCredentialCode ?? null,
    steps,
    canComplete: eligible && Boolean(state) && steps.every((s) => s.done),
    check: {
      passPercent: RENEWAL_CHECK_PASS_PERCENT,
      questionIds: RENEWAL_CHECK_QUESTIONS.map((q) => q.id),
      attempts: state?.checkAttempts ?? [],
    },
    refresherCpdHours: REFRESHER_CPD_HOURS,
    cpd: { unit: cpd.unit, target: cpd.target, earned: cpd.earned, remaining: cpd.remaining },
    retrainingReason: !retraining
      ? null
      : ((state?.checkAttempts.some((a) => !a.passed) ? 'failed_check' : 'expired') as
          | 'failed_check'
          | 'expired'),
  }
}

export type RenewalView = ReturnType<typeof viewOf>

export async function getRenewal(code: string) {
  await delay()
  return out(viewOf(ownCredential(code)))
}

export async function startRenewal(code: string) {
  await delay()
  const learner = requireRole('learner')
  const cert = ownCredential(code)
  const lifecycle = lifecycleOf(cert)
  if (lifecycle !== 'expiring_soon' && lifecycle !== 'expired') {
    throw ApiError.badRequest('Renewal opens when a certificate is expiring soon or has expired')
  }
  if (!stateOf(cert)) {
    const expired = lifecycle === 'expired'
    setState(cert, {
      startedAt: nowIso(),
      startedBy: learner.id,
      retrainingRequired: expired,
      retrainingDoneAt: null,
      refresherDoneAt: null,
      checkAttempts: [],
      checkPassedAt: null,
      completedAt: null,
      newCredentialCode: null,
    })
    recordAudit(learner, {
      action: 'certificate.renewal.start',
      objectType: 'certificate',
      objectId: cert.code,
      before: { lifecycle },
      after: { renewal: 'started', retrainingAssigned: expired },
      reason: expired
        ? 'Certificate expired: a short retraining path is assigned before renewal'
        : 'Learner started renewal before expiry',
    })
    if (expired) {
      notify({
        eventId: `cert-retraining:${cert.code}:start`,
        kind: 'certificate.retraining',
        recipientIds: [cert.learnerId],
        subject: 'Short retraining path assigned',
        body: `Certificate ${cert.code} has expired. Complete the short retraining path, then the refresher and the renewal check.`,
      })
    }
    commit()
  }
  return out(viewOf(cert))
}

function activeState(cert: CertificateRow): RenewalState {
  const state = stateOf(cert)
  if (!state) throw ApiError.badRequest('Start the renewal first')
  if (state.completedAt) throw ApiError.badRequest('This renewal is already complete')
  return state
}

export async function completeRetraining(code: string) {
  await delay()
  const learner = requireRole('learner')
  const cert = ownCredential(code)
  const state = activeState(cert)
  if (!state.retrainingRequired) throw ApiError.badRequest('No retraining path is assigned')
  if (!state.retrainingDoneAt) {
    setState(cert, { ...state, retrainingDoneAt: nowIso() })
    recordAudit(learner, {
      action: 'certificate.renewal.retraining',
      objectType: 'certificate',
      objectId: cert.code,
      after: { retraining: 'completed' },
      reason: 'Short retraining path completed',
    })
    commit()
  }
  return out(viewOf(cert))
}

export async function completeRefresher(code: string) {
  await delay()
  const learner = requireRole('learner')
  const cert = ownCredential(code)
  const state = activeState(cert)
  if (state.retrainingRequired && !state.retrainingDoneAt) {
    throw ApiError.badRequest('Complete the short retraining path first')
  }
  if (!state.refresherDoneAt) {
    const at = nowIso()
    setState(cert, { ...state, refresherDoneAt: at })
    insertRow('cpdLedger', {
      learnerId: cert.learnerId,
      source: 'academy',
      hours: REFRESHER_CPD_HOURS,
      unit: 'hours',
      status: 'earned',
      title: 'Renewal refresher course',
      earnedOn: at.slice(0, 10),
    })
    recordAudit(learner, {
      action: 'certificate.renewal.refresher',
      objectType: 'certificate',
      objectId: cert.code,
      after: { refresher: 'completed', cpdHours: REFRESHER_CPD_HOURS },
      reason: 'Refresher course completed',
    })
    commit()
  }
  return out(viewOf(cert))
}

/** Scores the renewal check. A fail assigns the short retraining path and resets the refresher gate. */
export async function submitRenewalCheck(code: string, answers: Record<string, string>) {
  await delay()
  const learner = requireRole('learner')
  const cert = ownCredential(code)
  const state = activeState(cert)
  if (!state.refresherDoneAt || (state.retrainingRequired && !state.retrainingDoneAt)) {
    throw ApiError.badRequest('Complete the earlier steps before the renewal check')
  }
  if (state.checkPassedAt) throw ApiError.badRequest('The renewal check is already passed')
  if (RENEWAL_CHECK_QUESTIONS.some((q) => !answers[q.id])) {
    throw ApiError.badRequest('Answer every question before submitting')
  }
  const score = scoreRenewalCheck(answers)
  const attempt: CheckAttempt = {
    at: nowIso(),
    correct: score.correct,
    total: score.total,
    percent: score.percent,
    passed: score.passed,
  }
  const next: RenewalState = {
    ...state,
    checkAttempts: [...state.checkAttempts, attempt],
    checkPassedAt: score.passed ? attempt.at : null,
    ...(score.passed ? {} : { retrainingRequired: true, retrainingDoneAt: null }),
  }
  setState(cert, next)
  recordAudit(learner, {
    action: 'certificate.renewal.check',
    objectType: 'certificate',
    objectId: cert.code,
    after: { percent: score.percent, passed: score.passed },
    reason: score.passed
      ? 'Renewal check passed'
      : 'Renewal check not passed: a short retraining path is assigned',
  })
  if (!score.passed) {
    notify({
      eventId: `cert-retraining:${cert.code}:check-${next.checkAttempts.length}`,
      kind: 'certificate.retraining',
      recipientIds: [cert.learnerId],
      subject: 'Short retraining path assigned',
      body: `The renewal check for ${cert.code} was not passed (${score.percent}%). Complete the short retraining path, then try again.`,
    })
  }
  commit()
  return out({ attempt, view: viewOf(cert) })
}

/** Issues the new credential. The old one is kept untouched and reads as Superseded. */
export async function completeRenewal(code: string) {
  await delay()
  const learner = requireRole('learner')
  const cert = ownCredential(code)
  const state = activeState(cert)
  const view = viewOf(cert)
  if (!view.canComplete) throw ApiError.badRequest('Finish every checklist step before renewing')
  if (db.certificates.some((c) => c.supersedesId === cert.id)) {
    throw ApiError.badRequest('This certificate has already been renewed')
  }
  const issued = insertRow('certificates', {
    ...newCredentialTerms(),
    code: nextCertificateCode(),
    enrolmentId: cert.enrolmentId,
    learnerId: cert.learnerId,
    programmeId: cert.programmeId,
    learnerName: cert.learnerName,
    status: 'issued',
    issuedAt: nowIso(),
    supersedesId: cert.id,
    evidence: {
      renewalOf: cert.code,
      refresherDoneAt: state.refresherDoneAt,
      checkPassedAt: state.checkPassedAt,
      retrainingAssigned: state.retrainingRequired,
      checkedBy: 'system',
    },
  })
  addCredentialCpdLine(issued)
  setState(cert, { ...state, completedAt: issued.issuedAt, newCredentialCode: issued.code })
  recordAudit(learner, {
    action: 'certificate.renew',
    objectType: 'certificate',
    objectId: issued.code,
    before: { supersedes: cert.code, expiresAt: cert.expiresAt },
    after: { code: issued.code, supersedes: cert.code, expiresAt: issued.expiresAt },
    reason: 'Renewal checklist complete; the earlier credential is kept as superseded',
  })
  emitCertificationEvent('renewed', issued)
  notify({
    eventId: `cert-renewed:${issued.code}`,
    kind: 'certificate.renewed',
    recipientIds: [cert.learnerId],
    subject: 'Your certificate has been renewed',
    body: `New credential ${issued.code} was issued. The earlier credential ${cert.code} is kept in your record as superseded.`,
  })
  commit()
  return out({ code: issued.code, supersedes: cert.code })
}
