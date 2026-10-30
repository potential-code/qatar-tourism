import type { CrmEventType } from '@shared/constants'
import { ApiError, commit, db, delay, nowIso, out, requireCapability, requireRole } from './api'
import { audit } from './audit.service'
import {
  CRM_CATEGORIES,
  type CrmConfig,
  crmConfig,
  crmSettingRow,
  fieldRows,
  findEvent,
  patchCrmConfig,
  type SyncDirection,
  type TriggerMode,
} from './crm/common'
import { drainQueue, type ProcessOutcome, processEvent, submitEvent } from './crm/events'
import { reportLmsEvent } from './crm/lms-events'
import { lookupProgramme } from './crm/mapping'
import { type CrmEventView, toEventView } from './crm/views'

/**
 * CRM connection, event log and sync (SPEC §8, §9). Everything is simulated: no network call is
 * made. Reads are admin only; changes need `integration.configure` and are audited.
 */

export { CRM_COPY } from './crm/common'

const DIRECTIONS: SyncDirection[] = ['both', 'crm_to_lms', 'lms_to_crm']
const TRIGGERS: TriggerMode[] = ['event-driven', 'scheduled', 'manual']

export type CrmConnection = CrmConfig & { state: string; lastTestAt: string | null }

export const unmappedCodes = (): Set<string> => {
  const codes = new Set<string>()
  const rows = fieldRows()
  for (const e of db.crmEvents) {
    const code = e.payload.programmeCode
    if (typeof code === 'string' && !lookupProgramme(rows, code)) codes.add(code)
  }
  return codes
}

function connection(): CrmConnection {
  const row = crmSettingRow()
  return { ...crmConfig(), state: row.state, lastTestAt: row.lastTestAt }
}

export async function getCrmConnection(): Promise<CrmConnection> {
  await delay()
  requireRole('admin')
  return out(connection())
}

export type CrmConnectionInput = {
  name: string
  environment: string
  endpoint: string
  authMethod: string
  syncDirection: SyncDirection
  triggerMode: TriggerMode
  enabledCategories: CrmEventType[]
}

/** Validates the demo connection. Real endpoints and real secrets are refused. */
export function validateConnection(input: CrmConnectionInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.name.trim().length < 2) errors.name = 'Enter a CRM name.'
  if (!input.environment.trim()) errors.environment = 'Enter an environment, for example Sandbox.'
  if (!input.authMethod.trim()) errors.authMethod = 'Enter an authentication method.'
  try {
    const url = new URL(input.endpoint.trim())
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.invalid')) {
      errors.endpoint =
        'Use a demo endpoint such as https://crm.demo.invalid/api. A real CRM endpoint cannot be saved in this demonstration.'
    }
  } catch {
    errors.endpoint = 'Enter a valid https address ending in .invalid.'
  }
  if (!DIRECTIONS.includes(input.syncDirection)) errors.syncDirection = 'Choose a sync direction.'
  if (!TRIGGERS.includes(input.triggerMode)) errors.triggerMode = 'Choose a trigger mode.'
  const categories = input.enabledCategories.filter((c) => CRM_CATEGORIES.includes(c))
  if (categories.length === 0) errors.enabledCategories = 'Enable at least one event category.'
  return errors
}

export async function saveCrmConnection(input: CrmConnectionInput) {
  await delay()
  requireCapability('integration.configure')
  const errors = validateConnection(input)
  if (Object.keys(errors).length > 0) {
    throw ApiError.validation('Invalid request', {
      target: 'json',
      issues: Object.entries(errors).map(([path, message]) => ({ path, message })),
    })
  }
  const before = crmConfig()
  patchCrmConfig({
    name: input.name.trim(),
    environment: input.environment.trim(),
    endpoint: input.endpoint.trim(),
    authMethod: input.authMethod.trim(),
    syncDirection: input.syncDirection,
    triggerMode: input.triggerMode,
    enabledCategories: input.enabledCategories,
  })
  audit({
    action: 'integration.config_save',
    objectType: 'integration',
    objectId: 'crm',
    before: { direction: before.syncDirection, trigger: before.triggerMode },
    after: { direction: input.syncDirection, trigger: input.triggerMode },
    reason: 'Demo configuration saved (illustrative; nothing is connected).',
  })
  commit()
  return out(connection())
}

/** A simulated connection test: no network call; an outage makes it fail. */
export async function testCrmConnection() {
  await delay()
  requireCapability('integration.configure')
  const config = crmConfig()
  const failed = config.simulateOutage
  const row = crmSettingRow()
  row.lastTestAt = nowIso()
  row.state = failed ? 'Test failed' : 'Connected demo'
  audit({
    action: 'integration.crm_test',
    objectType: 'integration',
    objectId: 'crm',
    reason: failed ? 'Simulated outage: the demo CRM did not respond.' : 'Simulated test passed.',
    outcome: failed ? 'denied' : 'allowed',
  })
  commit()
  return {
    ok: !failed,
    message: failed
      ? 'Test failed: the demo CRM did not respond (simulated outage). No network call was made.'
      : 'Test passed: the demo CRM responded (simulated). No network call was made.',
    connection: out(connection()),
  }
}

export async function setCrmPaused(paused: boolean) {
  await delay()
  requireCapability('integration.configure')
  patchCrmConfig({ paused })
  audit({
    action: paused ? 'integration.crm_pause' : 'integration.crm_resume',
    objectType: 'integration',
    objectId: 'crm',
    reason: paused ? 'Sync paused by the presenter.' : 'Sync resumed.',
  })
  commit()
  return out(connection())
}

export async function setCrmOutage(on: boolean) {
  await delay()
  requireCapability('integration.configure')
  patchCrmConfig({ simulateOutage: on })
  audit({
    action: 'integration.crm_outage',
    objectType: 'integration',
    objectId: 'crm',
    reason: on ? 'Simulated CRM outage started.' : 'Simulated CRM outage ended.',
  })
  commit()
  return out(connection())
}

/** Delivers the queued events. Failed and conflict events stay until someone acts on them. */
export async function runCrmDemoSync() {
  await delay()
  const user = requireCapability('integration.configure')
  const config = crmConfig()
  if (config.paused) {
    throw new ApiError(
      409,
      'SYNC_PAUSED',
      'Sync is paused. Resume sync before running a demo sync.',
    )
  }
  const results = drainQueue({ id: user.id, role: user.role, name: user.name })
  audit({
    action: 'integration.crm_sync',
    objectType: 'integration',
    objectId: 'crm',
    after: {
      processed: results.filter((r) => r.status === 'processed').length,
      stillQueued: results.filter((r) => r.status === 'queued').length,
    },
    reason: config.simulateOutage
      ? 'Demo sync ran during a simulated outage; events stayed queued.'
      : 'Demo sync ran.',
  })
  commit()
  return { results: out(results), connection: out(connection()) }
}

export async function listCrmEvents(): Promise<CrmEventView[]> {
  await delay()
  requireRole('admin')
  const codes = unmappedCodes()
  return [...db.crmEvents]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.eventId.localeCompare(a.eventId))
    .map((e) => toEventView(e, codes))
}

/** Retries one event. A processed event is a no-op; no learner, enrolment or certificate is added. */
export async function retryCrmEvent(eventId: string): Promise<ProcessOutcome> {
  await delay()
  const user = requireCapability('integration.configure')
  const row = findEvent(eventId)
  if (!row) throw ApiError.notFound('Event not found')
  const result = processEvent({ id: user.id, role: user.role, name: user.name }, row)
  commit()
  return out(result)
}

/**
 * For other services (approvals, assessments, certificates): report an LMS event to the CRM.
 * Idempotent by `dedupeKey` (or event id); a no-op for learners without a CRM link.
 */
export function reportLmsEventToCrm(input: {
  type: CrmEventType
  learnerId: string
  entityId?: string | null
  payload: Record<string, unknown>
  dedupeKey?: string
  eventId?: string
}): ProcessOutcome | null {
  if (input.eventId) {
    const link = db.crmMappings.find((m) => m.kind === 'learner' && m.learnerId === input.learnerId)
    if (!link?.externalLearnerId) return null
    const user = db.users.find((u) => u.id === db.session?.userId)
    return submitEvent(user ? { id: user.id, role: user.role, name: user.name } : null, {
      ...input,
      direction: 'lms_to_crm',
      externalLearnerId: link.externalLearnerId,
    })
  }
  return reportLmsEvent({
    ...input,
    dedupeKey:
      input.dedupeKey ??
      `lms:${input.type}:${input.learnerId}:${input.entityId ?? ''}:${JSON.stringify(input.payload)}`,
  })
}

export type CrmCard = {
  mode: string
  paused: boolean
  outage: boolean
  lastSyncAt: string | null
  pending: number
  failed: number
}

/** The compact dashboard card: connection mode, last demo sync, pending and failed events. */
export async function getCrmCard(): Promise<CrmCard> {
  await delay()
  requireRole('admin')
  const config = crmConfig()
  const mode = config.paused
    ? 'Sync paused'
    : config.simulateOutage
      ? 'Simulated outage'
      : `${{ both: 'Two-way', crm_to_lms: 'CRM to LMS', lms_to_crm: 'LMS to CRM' }[config.syncDirection]}, simulated`
  const lastEvent = db.crmEvents
    .filter((e) => e.processedAt)
    .map((e) => e.processedAt as string)
    .sort()
    .at(-1)
  return {
    mode,
    paused: config.paused,
    outage: config.simulateOutage,
    lastSyncAt: config.lastSyncAt ?? lastEvent ?? null,
    pending: db.crmEvents.filter((e) => e.status === 'queued').length,
    failed: db.crmEvents.filter((e) => e.status === 'failed' || e.status === 'conflict').length,
  }
}
