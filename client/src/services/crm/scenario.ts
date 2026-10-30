import type { LicenceStatus } from '@shared/constants'
import { learnerDisplayId } from '@shared/utils/identity'
import { ApiError, db, nowIso } from '../api'
import { type AuditActor, recordAudit } from '../audit.service'
import { certificationKey } from '../credentials/events'
import { enrolmentOf } from '../enrolment/core'
import { findEnrolment, loadEvidence } from '../progress/evidence'
import { evaluate } from '../progress/rules'
import {
  CRM_COPY,
  crmConfig,
  nextEventId,
  patchCrmConfig,
  type ScenarioLogEntry,
  type ScenarioState,
} from './common'
import { type ProcessOutcome, submitEvent } from './events'
import { ackKey, findLmsEvent } from './lms-events'

/**
 * The presenter-driven CRM scenario (SPEC §9, steps 1 to 7) for LRN-0042 / CRM-0042.
 * Real in-app rules decide each step. A step whose gate is unmet is BLOCKED; the presenter may
 * explicitly continue with labelled simulated evidence, which changes no LMS record and never
 * creates a certificate. The licence is only ever changed by the CRM decision in step 7.
 */

export const SCENARIO_LEARNER_CODE = 'L0042'
export const SCENARIO_CRM_ID = 'CRM-0042'
export const SCENARIO_STEPS = [
  { n: 1, title: 'CRM sends Program A enrolment', actor: 'CRM to LMS' },
  { n: 2, title: 'LMS applies approval and capacity rules', actor: 'LMS' },
  { n: 3, title: 'Learner completes required learning', actor: 'LMS' },
  { n: 4, title: 'Assessment passes', actor: 'LMS' },
  { n: 5, title: 'Certification gates are checked and the certificate is issued', actor: 'LMS' },
  { n: 6, title: 'Completion, exam and certificate events appear in the CRM', actor: 'LMS to CRM' },
  { n: 7, title: 'CRM returns a licence-status decision', actor: 'CRM to LMS' },
] as const

export type AdvanceInput = {
  /** Continue past an unmet gate with labelled simulated evidence (demo only). */
  simulateEvidence?: boolean
  /** Step 7 only: the CRM's decision. There is no default; training never grants a licence. */
  licenceDecision?: LicenceStatus
}

export type AdvanceResult = {
  advanced: boolean
  blocked: boolean
  message: string
  events: ProcessOutcome[]
}

export const emptyScenario = (runId: number): ScenarioState => ({
  runId,
  step: 0,
  simulatedEvidence: false,
  eventIds: {},
  log: [],
})

export const scenarioState = (): ScenarioState => crmConfig().scenario ?? emptyScenario(1)

function learner() {
  const profile = db.profiles.find((p) => p.learnerCode === SCENARIO_LEARNER_CODE)
  if (!profile) throw ApiError.notFound('The scenario learner LRN-0042 was not found')
  return {
    userId: profile.userId,
    name: profile.fullName,
    display: learnerDisplayId(profile.learnerCode),
  }
}

type StepOutcome = {
  ok: boolean
  message: string
  simulated?: boolean
  events?: ProcessOutcome[]
}

export function advanceScenario(actor: AuditActor, input: AdvanceInput): AdvanceResult {
  let state = scenarioState()
  if (state.step >= SCENARIO_STEPS.length) state = emptyScenario(state.runId + 1)
  const n = state.step + 1
  const step = SCENARIO_STEPS[n - 1]
  if (!step) throw ApiError.notFound('Scenario step not found')
  if (input.simulateEvidence) state = { ...state, simulatedEvidence: true }

  const who = learner()
  const outcome = runStep(n, state, who, actor, input)
  const entry: ScenarioLogEntry = {
    step: n,
    title: step.title,
    at: nowIso(),
    result: outcome.message,
    simulated: Boolean(outcome.simulated),
  }
  const next: ScenarioState = {
    ...state,
    step: outcome.ok ? n : state.step,
    log: [...state.log, entry],
  }
  patchCrmConfig({ scenario: next })
  recordAudit(actor, {
    action: outcome.ok ? 'crm.scenario.step' : 'crm.scenario.blocked',
    objectType: 'crm_scenario',
    objectId: `run-${state.runId}`,
    after: { step: n, simulated: Boolean(outcome.simulated) },
    reason: outcome.message,
    outcome: outcome.ok ? 'allowed' : 'denied',
  })
  return {
    advanced: outcome.ok,
    blocked: !outcome.ok,
    message: outcome.message,
    events: outcome.events ?? [],
  }
}

type Who = ReturnType<typeof learner>

/**
 * Submits an event once per key for the run (the stored id is reused on every retry). With a
 * `dedupeKey` it first looks for the event the LMS already reported for the same fact (an
 * approval, a result, a credential), so the sync log shows that fact once, not twice.
 */
function emit(
  state: ScenarioState,
  actor: AuditActor,
  key: string,
  event: Parameters<typeof submitEvent>[1],
  dedupeKey?: string,
): ProcessOutcome {
  const known = dedupeKey ? findLmsEvent(dedupeKey) : undefined
  if (known) {
    state.eventIds[key] = known.eventId
    return submitEvent(actor, { ...event, eventId: known.eventId })
  }
  const eventId = state.eventIds[key] ?? nextEventId()
  state.eventIds[key] = eventId
  const payload = dedupeKey ? { ...event.payload, dedupeKey } : event.payload
  return submitEvent(actor, { ...event, payload, eventId })
}

function requiredItems(who: Who, pick: (kind: string) => boolean) {
  const enrolment = findEnrolment(who.userId, 'A')
  if (!enrolment) return { enrolment: null, items: [], complete: false, eligible: false }
  const evaluation = evaluate(loadEvidence(enrolment))
  return {
    enrolment,
    items: evaluation.items.filter((i) => i.required && pick(i.kind)),
    complete: evaluation.complete,
    eligible: evaluation.certificateEligible,
  }
}

function gateCheck(
  state: ScenarioState,
  who: Who,
  label: string,
  pick: (kind: string) => boolean,
): StepOutcome {
  const { enrolment, items } = requiredItems(who, pick)
  if (!enrolment) return { ok: false, message: 'Program A has no enrolment for this learner.' }
  const unmet = items.filter((i) => i.state !== 'completed')
  if (unmet.length === 0) {
    return {
      ok: true,
      message: `${label}: every required item is complete in the LMS (${items.length} checked).`,
    }
  }
  const list = unmet.map((i) => i.title).join('; ')
  if (state.simulatedEvidence) {
    return {
      ok: true,
      simulated: true,
      message: `${label}: ${unmet.length} required item${unmet.length === 1 ? ' is' : 's are'} not complete in the LMS (${list}). Continuing with simulated evidence; no LMS record was changed.`,
    }
  }
  return {
    ok: false,
    message: `Gate not met. ${label} is not complete: ${list}. Finish it in the learner portal or trainer workspace and press Advance again, or continue with simulated evidence (demo only).`,
  }
}

const SIMULATED_CERTIFICATE = 'SIMULATED-QTA-0042'

function runStep(
  n: number,
  state: ScenarioState,
  who: Who,
  actor: AuditActor,
  input: AdvanceInput,
): StepOutcome {
  switch (n) {
    case 1: {
      const result = emit(state, actor, 'enrol', {
        type: 'enrolment',
        direction: 'crm_to_lms',
        learnerId: who.userId,
        externalLearnerId: SCENARIO_CRM_ID,
        payload: { programmeCode: 'QT-A', action: 'enrol', sessionCode: 'SES-T01-2' },
      })
      const ok = result.status === 'processed'
      return { ok, message: result.message, events: [result] }
    }
    case 2:
      return approvalAndCapacity(state, who, actor)
    case 3:
      return gateCheck(state, who, 'Required learning', (k) => k !== 'assessment_post')
    case 4:
      return gateCheck(
        state,
        who,
        'Post-assessment (80 percent to pass)',
        (k) => k === 'assessment_post',
      )
    case 5:
      return certificationGate(state, who)
    case 6:
      return reportToCrm(state, who, actor)
    default:
      return licenceDecision(state, who, actor, input)
  }
}

function approvalAndCapacity(state: ScenarioState, who: Who, actor: AuditActor): StepOutcome {
  const enrolment = enrolmentOf(who.userId, 'A')
  const programme = db.programmes.find((p) => p.code === 'A')
  const pending = db.approvalRequests.find(
    (r) =>
      r.type === 'enrolment' &&
      r.learnerId === who.userId &&
      r.programmeId === programme?.id &&
      (r.status === 'pending' || r.status === 'info_requested'),
  )
  if (!enrolment) {
    return {
      ok: false,
      message: `Approval is required first${pending ? ` (${pending.code} is pending)` : ''}. Approve it in Enrolments and Approvals; approval does not bypass capacity.`,
    }
  }
  const session = db.sessions.find((s) => s.code === 'SES-T01-2')
  const seats = session
    ? db.rsvps.filter(
        (r) => r.sessionId === session.id && (r.status === 'confirmed' || r.status === 'offered'),
      ).length
    : 0
  const holds = Boolean(
    session &&
      db.rsvps.some(
        (r) => r.sessionId === session.id && r.learnerId === who.userId && r.status === 'confirmed',
      ),
  )
  const decision = holds || !session || seats < session.capacity ? 'approved' : 'waitlisted'
  const ack = emit(
    state,
    actor,
    'ack',
    {
      type: 'enrolment',
      direction: 'lms_to_crm',
      learnerId: who.userId,
      externalLearnerId: SCENARIO_CRM_ID,
      entityId: enrolment.id,
      payload: { acknowledgement: decision, programmeCode: 'QT-A' },
    },
    ackKey(who.userId, 'A', decision),
  )
  const capacity = session
    ? `${session.code} has ${seats} of ${session.capacity} seats taken${holds ? ' and the learner holds a confirmed seat' : ''}.`
    : 'No session is attached to this enrolment.'
  return {
    ok: true,
    events: [ack],
    message: `Enrolment ${decision}: the learner is approved for Program A. ${capacity} Acknowledgement ${ack.eventId} is ${ack.status}.`,
  }
}

function certificateFor(who: Who) {
  const enrolment = enrolmentOf(who.userId, 'A')
  if (!enrolment) return undefined
  return db.certificates.find((c) => c.enrolmentId === enrolment.id && c.status === 'issued')
}

function certificationGate(state: ScenarioState, who: Who): StepOutcome {
  const { enrolment, complete, eligible } = requiredItems(who, () => true)
  if (!enrolment) return { ok: false, message: 'Program A has no enrolment for this learner.' }
  const real = certificateFor(who)
  if (real && complete && eligible) {
    return {
      ok: true,
      message: `Every certification gate is met and credential ${real.code} is issued in the LMS.`,
    }
  }
  if (state.simulatedEvidence) {
    return {
      ok: true,
      simulated: true,
      message: `Certification gates are not all met in the LMS. With simulated evidence the run continues using ${SIMULATED_CERTIFICATE}; no certificate record was created.`,
    }
  }
  return {
    ok: false,
    message:
      'Gate not met. No certificate is issued while any gate is unmet: required learning, attendance, assignment and a post-assessment pass. Continue with simulated evidence (demo only) or complete the gates.',
  }
}

function reportToCrm(state: ScenarioState, who: Who, actor: AuditActor): StepOutcome {
  const enrolment = enrolmentOf(who.userId, 'A')
  const real = certificateFor(who)
  const simulated = state.simulatedEvidence && !real
  const post = db.assessmentAttempts
    .filter((a) => a.enrolmentId === enrolment?.id && a.status === 'submitted' && a.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  const base = {
    learnerId: who.userId,
    externalLearnerId: SCENARIO_CRM_ID,
    direction: 'lms_to_crm' as const,
  }
  const events = [
    emit(
      state,
      actor,
      'completion',
      {
        ...base,
        type: 'completion',
        entityId: enrolment?.id ?? null,
        payload: { programmeCode: 'QT-A', status: 'completed', scope: 'programme', simulated },
      },
      enrolment && !simulated ? `completion:${enrolment.id}` : undefined,
    ),
    emit(
      state,
      actor,
      'exam',
      {
        ...base,
        type: 'examination',
        entityId: post?.id ?? null,
        payload: {
          attemptId: post?.id ?? 'simulated',
          scorePercent: post?.score ?? null,
          result: post ? 'pass' : 'simulated pass',
          simulated,
        },
      },
      post && !simulated ? `exam:${post.id}` : undefined,
    ),
    emit(
      state,
      actor,
      'cert',
      {
        ...base,
        type: 'certification',
        entityId: real?.id ?? SIMULATED_CERTIFICATE,
        payload: {
          action: 'issued',
          credentialId: real?.code ?? SIMULATED_CERTIFICATE,
          credentialCode: real?.code ?? SIMULATED_CERTIFICATE,
          expiresAt: real?.expiresAt ?? null,
          simulated,
        },
      },
      real ? certificationKey(real.code, 'issued') : undefined,
    ),
  ]
  const queued = events.filter((e) => e.status !== 'processed').length
  return {
    ok: true,
    simulated,
    events,
    message:
      queued === 0
        ? `Completion, examination and certification events were delivered to the CRM (${events.map((e) => e.eventId).join(', ')}).`
        : `${queued} of 3 events are queued for retry (${CRM_COPY.outage.split('.')[0]} or sync paused). They are kept and will be delivered on the next sync.`,
  }
}

function licenceDecision(
  state: ScenarioState,
  who: Who,
  actor: AuditActor,
  input: AdvanceInput,
): StepOutcome {
  if (!input.licenceDecision) {
    return {
      ok: false,
      message:
        'Choose the CRM decision first. Completing training does not grant a licence; only the CRM decides.',
    }
  }
  const result = emit(state, actor, 'licence', {
    type: 'licence',
    direction: 'crm_to_lms',
    learnerId: who.userId,
    externalLearnerId: SCENARIO_CRM_ID,
    payload: {
      licenceStatus: input.licenceDecision,
      crmUpdatedAt: nowIso(),
      decidedBy: 'CRM (simulated)',
    },
  })
  if (result.status !== 'processed') return { ok: false, events: [result], message: result.message }
  return {
    ok: true,
    events: [result],
    message: `CRM decision received: licence ${input.licenceDecision}. It is shown on the learner profile as the CRM's decision; training results did not grant it.`,
  }
}
