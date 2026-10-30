import { ApiError, commit, db, delay, nowIso, out, requireCapability, requireRole } from './api'
import { audit } from './audit.service'
import { getCrmCard } from './crm.service'
import {
  type ApiConfig,
  apiConfig,
  CONNECTION_TYPES,
  DEMO_URL_MESSAGE,
  DOWNLOAD_PERMISSIONS,
  EVENT_CATEGORIES,
  type HostingConfig,
  hostingConfig,
  isDemoUrl,
  READ_SCOPES,
  RESIDENCY_STATUSES,
  type ResidencyRow,
  residencyRows,
  type SsoConfig,
  settingRow,
  ssoConfig,
  WRITE_SCOPES,
} from './integrations/settings'

/**
 * Integrations and Security (SPEC §2): SSO, API access, content hosting and data residency.
 * Everything is illustrative configuration; reads are admin only, saves need
 * `integration.configure` and are audited. No real secret is ever stored or shown.
 */

export type AreaState = { state: string; lastTestAt: string | null }
const stateOf = (area: Parameters<typeof settingRow>[0]): AreaState => {
  const row = settingRow(area)
  return { state: row.state, lastTestAt: row.lastTestAt }
}

function invalid(errors: Record<string, string>): never {
  throw ApiError.validation('Invalid request', {
    target: 'json',
    issues: Object.entries(errors).map(([path, message]) => ({ path, message })),
  })
}

const subset = (values: readonly string[], allowed: readonly string[]) =>
  values.every((v) => allowed.includes(v))

export type IntegrationsSnapshot = {
  sso: SsoConfig & AreaState
  api: ApiConfig & AreaState
  hosting: HostingConfig & AreaState
  residency: { rows: ResidencyRow[]; state: string }
}

export async function getIntegrationsSnapshot(): Promise<IntegrationsSnapshot> {
  await delay()
  requireRole('admin')
  return out({
    sso: { ...ssoConfig(), ...stateOf('sso') },
    api: { ...apiConfig(), ...stateOf('api') },
    hosting: { ...hostingConfig(), ...stateOf('contentHosting') },
    residency: { rows: residencyRows(), state: settingRow('dataResidency').state },
  })
}

function saved(area: string, before: unknown, after: unknown): void {
  audit({
    action: 'integration.config_save',
    objectType: 'integration',
    objectId: area,
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
    reason: 'Demo configuration saved (illustrative; nothing is connected).',
  })
}

export type SsoInput = Pick<SsoConfig, 'providerName' | 'protocol' | 'entityId' | 'roleMapping'>

export function validateSso(input: SsoInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.providerName.trim().length < 2) errors.providerName = 'Enter a provider display name.'
  if (input.protocol !== 'saml' && input.protocol !== 'oidc')
    errors.protocol = 'Choose SAML or OpenID Connect.'
  if (!isDemoUrl(input.entityId)) errors.entityId = DEMO_URL_MESSAGE
  if (!input.roleMapping.learner.trim())
    errors.learnerRole = 'Enter the group that maps to the learner role.'
  if (!input.roleMapping.trainer.trim())
    errors.trainerRole = 'Enter the group that maps to the trainer role.'
  return errors
}

export async function saveSsoConfig(input: SsoInput) {
  await delay()
  requireCapability('integration.configure')
  const errors = validateSso(input)
  if (Object.keys(errors).length > 0) invalid(errors)
  const row = settingRow('sso')
  const before = ssoConfig()
  row.config = {
    ...row.config,
    providerName: input.providerName.trim(),
    protocol: input.protocol,
    entityId: input.entityId.trim(),
    roleMapping: {
      learner: input.roleMapping.learner.trim(),
      trainer: input.roleMapping.trainer.trim(),
    },
  }
  row.state = 'Not configured'
  row.updatedAt = nowIso()
  saved(
    'sso',
    { protocol: before.protocol, provider: before.providerName },
    { protocol: input.protocol, provider: input.providerName.trim() },
  )
  commit()
  return out({ ...ssoConfig(), ...stateOf('sso') })
}

export type ApiInput = Pick<ApiConfig, 'baseUrl' | 'connectionType' | 'eventCategories' | 'scopes'>

export function validateApi(input: ApiInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!isDemoUrl(input.baseUrl)) errors.baseUrl = DEMO_URL_MESSAGE
  if (!(CONNECTION_TYPES as readonly string[]).includes(input.connectionType))
    errors.connectionType = 'Choose a connection type.'
  if (input.eventCategories.length === 0 || !subset(input.eventCategories, EVENT_CATEGORIES)) {
    errors.eventCategories = 'Choose at least one permitted event category.'
  }
  if (!subset(input.scopes.read, READ_SCOPES) || !subset(input.scopes.write, WRITE_SCOPES)) {
    errors.scopes = 'Choose scopes from the lists.'
  }
  return errors
}

export async function saveApiConfig(input: ApiInput) {
  await delay()
  requireCapability('integration.configure')
  const errors = validateApi(input)
  if (Object.keys(errors).length > 0) invalid(errors)
  const row = settingRow('api')
  const before = apiConfig()
  row.config = {
    ...row.config,
    baseUrl: input.baseUrl.trim(),
    connectionType: input.connectionType,
    eventCategories: input.eventCategories,
    scopes: input.scopes,
  }
  row.updatedAt = nowIso()
  saved(
    'api',
    { scopes: before.scopes },
    { scopes: input.scopes, categories: input.eventCategories },
  )
  commit()
  return out({ ...apiConfig(), ...stateOf('api') })
}

/** A simulated API test: no request leaves the browser. */
export async function testApiConnection() {
  await delay()
  requireCapability('integration.configure')
  const row = settingRow('api')
  row.state = 'Connected demo'
  row.lastTestAt = nowIso()
  audit({
    action: 'integration.api_test',
    objectType: 'integration',
    objectId: 'api',
    reason: 'Simulated test passed. No request was sent.',
  })
  commit()
  return out({ ...apiConfig(), ...stateOf('api') })
}

/** A fictional request and response for the configured base URL. */
export async function getApiSample() {
  await delay()
  requireRole('admin')
  const c = apiConfig()
  return out({
    request: {
      method: 'POST',
      url: `${c.baseUrl}/events`,
      headers: {
        Authorization: `Bearer ${c.maskedCredential}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'EVT-0005',
      },
      body: {
        eventId: 'EVT-0005',
        type: 'completion',
        learnerId: 'LRN-0042',
        externalLearnerId: 'CRM-0042',
        programmeCode: 'QT-A',
        status: 'completed',
      },
    },
    response: { status: 202, body: { received: true, eventId: 'EVT-0005', duplicate: false } },
    note: 'Illustrative sample. It was not sent anywhere and the credential shown is a placeholder.',
  })
}

export type HostingInput = Pick<HostingConfig, 'authenticatedLaunch' | 'downloadPermission'>

export async function saveHostingConfig(input: HostingInput) {
  await delay()
  requireCapability('integration.configure')
  if (!(DOWNLOAD_PERMISSIONS as readonly string[]).includes(input.downloadPermission)) {
    invalid({ downloadPermission: 'Choose who may download packages.' })
  }
  const row = settingRow('contentHosting')
  const before = hostingConfig()
  row.config = { ...row.config, ...input }
  row.updatedAt = nowIso()
  saved(
    'contentHosting',
    { launch: before.authenticatedLaunch, download: before.downloadPermission },
    { launch: input.authenticatedLaunch, download: input.downloadPermission },
  )
  commit()
  return out({ ...hostingConfig(), ...stateOf('contentHosting') })
}

export async function saveDataResidency(rows: ResidencyRow[]) {
  await delay()
  requireCapability('integration.configure')
  const current = residencyRows()
  const errors: Record<string, string> = {}
  if (rows.length !== current.length) errors.rows = 'Keep all six data residency rows.'
  for (const [index, row] of rows.entries()) {
    if (!(RESIDENCY_STATUSES as readonly string[]).includes(row.status)) {
      errors[`rows.${index}.status`] = 'Choose a status from the list.'
    }
    if (row.proposedRegion.trim().length < 2 || row.provider.trim().length < 2) {
      errors[`rows.${index}`] = 'Enter a proposed region and provider, or leave "To be confirmed".'
    }
  }
  if (Object.keys(errors).length > 0) invalid(errors)
  const next = current.map((c, i) => ({
    item: c.item,
    proposedRegion: (rows[i]?.proposedRegion ?? c.proposedRegion).trim(),
    provider: (rows[i]?.provider ?? c.provider).trim(),
    status: rows[i]?.status ?? c.status,
  }))
  const row = settingRow('dataResidency')
  row.config = { ...row.config, rows: next }
  row.state = next.every((r) => r.status === 'To be confirmed') ? 'To be confirmed' : 'Proposed'
  row.updatedAt = nowIso()
  saved(
    'dataResidency',
    { confirmed: current.filter((r) => r.status !== 'To be confirmed').length },
    { confirmed: next.filter((r) => r.status !== 'To be confirmed').length },
  )
  commit()
  return out({ rows: residencyRows(), state: row.state })
}

/** Packages in the library with their access group and an example protected address. */
export async function listHostedPackages() {
  await delay()
  requireRole('admin')
  const base = hostingConfig().exampleProtectedUrl.replace(/\/protected\/.*$/, '/protected')
  return out(
    db.contentPackages
      .filter((p) => p.packageId)
      .map((p) => ({
        packageId: p.packageId as string,
        title: p.title,
        courseKey: p.courseKey,
        language: p.language,
        format: p.type === 'xapi' ? 'xAPI' : 'SCORM 2004',
        version: p.version,
        accessGroup: p.accessGroup ?? 'assigned-learners',
        protectedUrl: `${base}/${p.packageId}/index.html`,
      })),
  )
}

/** Overview numbers for the Secure access and integrations summary on the dashboard. */
export async function getIntegrationsSummary() {
  await delay()
  requireRole('admin')
  const crm = await getCrmCard()
  return out({
    sso: stateOf('sso').state,
    api: stateOf('api').state,
    hosting: hostingConfig().authenticatedLaunch
      ? 'Authenticated launch on'
      : 'Authenticated launch off',
    residencyToConfirm: residencyRows().filter((r) => r.status === 'To be confirmed').length,
    crmMode: crm.mode,
  })
}
