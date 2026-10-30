import type { CrmEventType } from '@shared/constants'
import type { CrmEventRow, CrmMappingRow, IntegrationSettingRow } from '@shared/types/db'
import { ApiError, db, insertRow, nowIso } from '../api'

/**
 * Shared CRM plumbing: the typed connection settings, event ids and learner matching.
 * Everything here is simulated; no network call is ever made.
 */

export const CRM_COPY = {
  banner:
    'Customisable two-way integration. Data and events can flow from CRM to LMS and from LMS to CRM. Fields, triggers, direction, approvals and source-of-truth rules can be configured to match your workflows. This demonstration uses simulated data.',
  unmapped:
    'Sync paused: CRM programme code QT-A does not have an LMS mapping. Select Program A, preview the change and retry.',
  retried: 'Event processed. Existing enrolment updated; no duplicate record created.',
  outage: 'CRM unreachable (simulated outage). The event is kept in the queue and will be retried.',
  paused: 'Sync is paused. The event is kept in the queue until sync is resumed.',
} as const

export type SyncDirection = 'both' | 'crm_to_lms' | 'lms_to_crm'
export type TriggerMode = 'event-driven' | 'scheduled' | 'manual'

export type ScenarioLogEntry = {
  step: number
  title: string
  at: string
  result: string
  simulated: boolean
}

export type ScenarioState = {
  runId: number
  /** Steps completed so far, 0 to 7. */
  step: number
  simulatedEvidence: boolean
  /** Event ids this run created, by key, so advancing again never creates a second event. */
  eventIds: Record<string, string>
  log: ScenarioLogEntry[]
}

export type CrmConfig = {
  name: string
  environment: string
  endpoint: string
  authMethod: string
  maskedCredential: string
  syncDirection: SyncDirection
  triggerMode: TriggerMode
  enabledCategories: CrmEventType[]
  paused: boolean
  /** Presenter switch: while on, delivery to the CRM fails and events stay queued. */
  simulateOutage: boolean
  lastSyncAt: string | null
  scenario: ScenarioState | null
}

export const CRM_CATEGORIES: CrmEventType[] = [
  'enrolment',
  'completion',
  'examination',
  'certification',
  'licence',
]

export function crmSettingRow(): IntegrationSettingRow {
  const row = db.integrationSettings.find((r) => r.area === 'crm')
  if (!row) throw ApiError.notFound('CRM integration settings not found')
  return row
}

export function crmConfig(): CrmConfig {
  const c = crmSettingRow().config as Partial<CrmConfig>
  return {
    name: c.name ?? 'Demo CRM (illustrative)',
    environment: c.environment ?? 'Sandbox',
    endpoint: c.endpoint ?? 'https://crm.demo.invalid/api',
    authMethod: c.authMethod ?? 'OAuth 2.0 client credentials (simulated)',
    maskedCredential: c.maskedCredential ?? 'crm_demo_••••••••',
    syncDirection: c.syncDirection ?? 'both',
    triggerMode: c.triggerMode ?? 'event-driven',
    enabledCategories: c.enabledCategories ?? CRM_CATEGORIES,
    paused: c.paused ?? false,
    simulateOutage: c.simulateOutage ?? false,
    lastSyncAt: c.lastSyncAt ?? null,
    scenario: c.scenario ?? null,
  }
}

/** Writes part of the CRM settings back (merging, so unknown keys survive). */
export function patchCrmConfig(patch: Partial<CrmConfig>, state?: string): void {
  const row = crmSettingRow()
  row.config = { ...row.config, ...patch }
  if (state) row.state = state
  row.updatedAt = nowIso()
}

/** The next immutable event id: EVT-0005 after EVT-0004. */
export function nextEventId(): string {
  const last = db.crmEvents.reduce((max, e) => Math.max(max, Number(e.eventId.slice(4)) || 0), 0)
  return `EVT-${String(last + 1).padStart(4, '0')}`
}

export const findEvent = (eventId: string): CrmEventRow | undefined =>
  db.crmEvents.find((e) => e.eventId === eventId)

export const learnerLinks = (): CrmMappingRow[] =>
  db.crmMappings.filter((m) => m.kind === 'learner')
export const fieldRows = (): CrmMappingRow[] => db.crmMappings.filter((m) => m.kind === 'field')

export type LearnerMatch =
  | { state: 'matched'; learnerId: string }
  | { state: 'review'; reason: string }

/**
 * Stable external learner id matching (SPEC §9). A resolved LMS learner on the event is linked to
 * its external id once; an id already linked to a different learner, an unresolved review link, or
 * an unknown id with no learner goes to the identity review queue. A learner is never created.
 */
export function matchLearner(event: CrmEventRow): LearnerMatch {
  const link = learnerLinks().find((m) => m.externalLearnerId === event.externalLearnerId)
  if (link) {
    if (link.matchState === 'review' || !link.learnerId) {
      return { state: 'review', reason: 'This CRM record is waiting in the identity review queue.' }
    }
    if (event.learnerId && event.learnerId !== link.learnerId) {
      return {
        state: 'review',
        reason: `CRM id ${event.externalLearnerId} is already linked to a different learner. Review the match.`,
      }
    }
    return { state: 'matched', learnerId: link.learnerId }
  }
  if (!event.learnerId) {
    return {
      state: 'review',
      reason: `No LMS learner matches CRM id ${event.externalLearnerId}. Review the match; no account is created.`,
    }
  }
  insertRow('crmMappings', {
    kind: 'learner',
    crmField: null,
    lmsField: null,
    dataType: null,
    direction: 'both',
    transformation: null,
    required: true,
    authoritative: 'crm',
    learnerId: event.learnerId,
    externalLearnerId: event.externalLearnerId,
    matchState: 'matched',
  })
  return { state: 'matched', learnerId: event.learnerId }
}
