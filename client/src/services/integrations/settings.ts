import type { IntegrationSettingRow } from '@shared/types/db'
import { ApiError, db } from '../api'

/**
 * Typed, illustrative configuration for the SSO, API, content hosting and data residency areas
 * (SPEC §2). Nothing here is a real endpoint or secret: hosts end in `.invalid` and credentials
 * are masked placeholders that the browser never edits.
 */

export type IntegrationArea = 'sso' | 'api' | 'contentHosting' | 'dataResidency'

export const SSO_STATES = ['Connected demo', 'Not configured', 'Test failed'] as const
export const CONNECTION_TYPES = [
  'REST with webhooks',
  'REST polling',
  'Batch file exchange',
] as const
export const DOWNLOAD_PERMISSIONS = ['admin_only', 'assigned_trainers', 'nobody'] as const
export const RESIDENCY_STATUSES = ['To be confirmed', 'Proposed', 'Under technical review'] as const
export const EVENT_CATEGORIES = [
  'enrolment',
  'completion',
  'examination',
  'certification',
  'licence',
] as const
export const READ_SCOPES = ['learners', 'enrolments', 'results', 'credentials'] as const
export const WRITE_SCOPES = ['enrolments', 'licence', 'credentials'] as const

export type SsoConfig = {
  providerName: string
  protocol: 'saml' | 'oidc'
  entityId: string
  maskedSecret: string
  roleMapping: { learner: string; trainer: string }
}

export type ApiConfig = {
  baseUrl: string
  connectionType: (typeof CONNECTION_TYPES)[number]
  eventCategories: string[]
  scopes: { read: string[]; write: string[] }
  maskedCredential: string
}

export type HostingConfig = {
  authenticatedLaunch: boolean
  downloadPermission: (typeof DOWNLOAD_PERMISSIONS)[number]
  exampleProtectedUrl: string
}

export type ResidencyRow = {
  item: string
  proposedRegion: string
  provider: string
  status: string
}

export function settingRow(area: IntegrationArea | 'crm'): IntegrationSettingRow {
  const row = db.integrationSettings.find((r) => r.area === area)
  if (!row) throw ApiError.notFound('Integration settings not found')
  return row
}

export function ssoConfig(): SsoConfig {
  const c = settingRow('sso').config as Partial<SsoConfig> & {
    roleMapping?: Record<string, string>
  }
  return {
    providerName: c.providerName ?? 'Demo Identity Provider (illustrative)',
    protocol: c.protocol === 'oidc' ? 'oidc' : 'saml',
    entityId: c.entityId ?? 'https://idp.demo.invalid/metadata',
    maskedSecret: c.maskedSecret ?? '••••••••',
    roleMapping: {
      learner: c.roleMapping?.learner ?? 'academy-learner',
      trainer: c.roleMapping?.trainer ?? 'academy-trainer',
    },
  }
}

export function apiConfig(): ApiConfig {
  const c = settingRow('api').config as Partial<ApiConfig>
  return {
    baseUrl: c.baseUrl ?? 'https://api.demo.invalid/qta/v1',
    connectionType: c.connectionType ?? 'REST with webhooks',
    eventCategories: c.eventCategories ?? [...EVENT_CATEGORIES],
    scopes: { read: c.scopes?.read ?? [], write: c.scopes?.write ?? [] },
    maskedCredential: c.maskedCredential ?? 'qta_demo_••••••••',
  }
}

export function hostingConfig(): HostingConfig {
  const c = settingRow('contentHosting').config as Partial<HostingConfig>
  return {
    authenticatedLaunch: c.authenticatedLaunch ?? true,
    downloadPermission: c.downloadPermission ?? 'admin_only',
    exampleProtectedUrl:
      c.exampleProtectedUrl ?? 'https://content.demo.invalid/protected/wvq-en-scorm2004/index.html',
  }
}

export function residencyRows(): ResidencyRow[] {
  const c = settingRow('dataResidency').config as { rows?: ResidencyRow[] }
  return (c.rows ?? []).map((r) => ({ ...r }))
}

/** A hostname is demo-safe when it ends in `.invalid`. */
export function isDemoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && url.hostname.endsWith('.invalid')
  } catch {
    return false
  }
}

export const DEMO_URL_MESSAGE =
  'Use a demo address ending in .invalid, for example https://idp.demo.invalid/metadata. Real endpoints cannot be saved in this demonstration.'
