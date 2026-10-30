import type { ContentLanguage } from '@shared/constants'
import type { Cast } from './cast'
import { stableUuid } from './ids'
import type { Calendar } from './reference-date'
import type { SeedRow } from './rows'

type PackageInsert = SeedRow<'contentPackages'>
type XapiInsert = SeedRow<'xapiStatements'>
type MappingInsert = SeedRow<'crmMappings'>
type EventInsert = SeedRow<'crmEvents'>
type SettingInsert = SeedRow<'integrationSettings'>

/**
 * Content Library packages (29 Oct). Lane B authors the real packages and serves them from
 * `client/public/content/<packageId>/index.html`; this seed only reserves the ids and launch URLs.
 * The rows belong to the Content Library units C08 and C09 and are `isCurrent: false`: a unit
 * resolves its language variants by `courseKey`, not through a single current package.
 */
export const CONTENT_ITEMS = [
  {
    courseKey: 'welcoming-visitors-to-qatar',
    title: 'Welcoming visitors to Qatar',
    format: 'scorm_2004',
    course: 'C08',
    variants: {
      en: 'wvq-en-scorm2004',
      ar: 'wvq-ar-scorm2004',
    },
    titles: { en: 'Welcoming visitors to Qatar', ar: 'الترحيب بزوار قطر' },
  },
  {
    courseKey: 'planning-a-visitor-experience',
    title: 'Planning a visitor experience',
    format: 'xapi',
    course: 'C09',
    variants: {
      en: 'pve-en-xapi',
      ar: 'pve-ar-xapi',
    },
    titles: { en: 'Planning a visitor experience', ar: 'تخطيط تجربة الزائر' },
  },
] as const

export const contentLaunchUrl = (packageId: string) => `/content/${packageId}/index.html`

export function buildContentPackages(
  cal: Calendar,
  courseIds: Record<string, string>,
): PackageInsert[] {
  const published = cal.ago(14)
  return CONTENT_ITEMS.flatMap((item) =>
    (['en', 'ar'] as const).map((language: ContentLanguage) => {
      const packageId = item.variants[language]
      return {
        id: stableUuid('package', packageId),
        courseId: courseIds[item.course] as string,
        type: item.format,
        version: '1.0',
        title: item.titles[language],
        launchUrl: contentLaunchUrl(packageId),
        formatLabel:
          item.format === 'xapi'
            ? 'xAPI activity (simulated learning record store)'
            : 'SCORM 2004 package',
        isCurrent: false,
        packageId,
        courseKey: item.courseKey,
        language,
        accessGroup: 'assigned-learners',
        publishedAt: published,
        createdAt: published,
        updatedAt: published,
      }
    }),
  )
}

/** A few xAPI statements for Mariam on the English planning activity (simulated LRS). */
export function buildXapiStatements(cal: Calendar, cast: Cast): XapiInsert[] {
  const packageId = 'pve-en-xapi'
  const steps = [
    { verb: 'initialized', ago: 0.9, result: null },
    { verb: 'experienced', ago: 0.89, result: { response: 'Souq Waqif evening walk' } },
    {
      verb: 'completed',
      ago: 0.88,
      result: { completion: true, success: true, score: { scaled: 1 } },
    },
  ]
  return steps.map((step, index) => ({
    id: stableUuid('xapi', `${packageId}:${index}`),
    statementId: stableUuid('xapi-statement', `${packageId}:${index}`),
    actorLearnerId: cast.mariam.userId,
    verb: step.verb,
    activityId: `https://lrs.demo.invalid/activities/${packageId}`,
    packageId,
    timestamp: cal.ago(step.ago),
    result: step.result,
    simulatedLrs: true as const,
  }))
}

/** Field mapping rows (SPEC §8), illustrative. */
export function buildCrmMappings(cal: Calendar, cast: Cast): MappingInsert[] {
  const created = cal.ago(30)
  const field = (
    key: string,
    crmField: string,
    lmsField: string,
    dataType: string,
    direction: MappingInsert['direction'],
    transformation: string,
    required: boolean,
    authoritative: 'crm' | 'lms',
  ): MappingInsert => ({
    id: stableUuid('crm-mapping', key),
    kind: 'field',
    crmField,
    lmsField,
    dataType,
    direction,
    transformation,
    required,
    authoritative,
    createdAt: created,
    updatedAt: created,
  })
  return [
    field(
      'learner-id',
      'external_learner_id',
      'learnerId',
      'string',
      'both',
      'Match on stable id',
      true,
      'crm',
    ),
    field(
      'organisation',
      'organisation',
      'organisation',
      'string',
      'crm_to_lms',
      'Trim and match by name',
      false,
      'crm',
    ),
    field(
      'programme',
      'programme_code',
      'enrolment.programme',
      'code',
      'crm_to_lms',
      'Value map: QT-B to Program B, QT-C to Program C (QT-A has no mapping yet)',
      true,
      'crm',
    ),
    field(
      'exam',
      'exam_score',
      'assessmentResult.score',
      'number',
      'lms_to_crm',
      'Percent, rounded',
      false,
      'lms',
    ),
    field(
      'certificate',
      'certificate_id',
      'credential.code',
      'string',
      'lms_to_crm',
      'Copy',
      false,
      'lms',
    ),
    field(
      'licence',
      'licence_status',
      'licenceStatus.status',
      'enum',
      'crm_to_lms',
      'Lower-case',
      false,
      'crm',
    ),
    {
      id: stableUuid('crm-mapping', `learner:${cast.mariam.code}`),
      kind: 'learner',
      direction: 'both',
      required: true,
      authoritative: 'crm',
      learnerId: cast.mariam.userId,
      externalLearnerId: 'CRM-0042',
      matchState: 'matched',
      createdAt: created,
      updatedAt: created,
    },
    {
      id: stableUuid('crm-mapping', 'learner:review'),
      kind: 'learner',
      direction: 'crm_to_lms',
      required: true,
      authoritative: 'crm',
      learnerId: null,
      externalLearnerId: 'CRM-7001',
      matchState: 'review',
      createdAt: created,
      updatedAt: created,
    },
  ]
}

/**
 * Four CRM events (SPEC §9): processed, queued, failed (programme code QT-A unmapped) and a
 * mapping conflict. Event ids are immutable (EVT-0001 …) and used for dedup.
 */
export function buildCrmEvents(cal: Calendar, cast: Cast): EventInsert[] {
  const event = (
    n: number,
    fields: Omit<EventInsert, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>,
  ): EventInsert => {
    const eventId = `EVT-${String(n).padStart(4, '0')}`
    const at = fields.occurredAt as Date
    return {
      id: stableUuid('crm-event', eventId),
      eventId,
      createdAt: at,
      updatedAt: at,
      ...fields,
    }
  }
  return [
    event(1, {
      type: 'enrolment',
      direction: 'crm_to_lms',
      learnerId: cast.mariam.userId,
      externalLearnerId: 'CRM-0042',
      entityId: cast.mariamA.id,
      status: 'processed',
      attempts: 1,
      payload: { programmeCode: 'QT-A', action: 'enrol' },
      occurredAt: cal.ago(40),
      processedAt: cal.ago(40),
    }),
    event(2, {
      type: 'examination',
      direction: 'lms_to_crm',
      learnerId: cast.mariam.userId,
      externalLearnerId: 'CRM-0042',
      entityId: null,
      status: 'queued',
      attempts: 0,
      payload: { assessment: 'pre', scorePercent: 60, result: 'baseline' },
      occurredAt: cal.ago(0.3),
    }),
    event(3, {
      type: 'enrolment',
      direction: 'crm_to_lms',
      learnerId: cast.enrolPending[1]?.userId ?? null,
      externalLearnerId: 'CRM-7002',
      entityId: null,
      status: 'failed',
      attempts: 2,
      error:
        'Sync paused: CRM programme code QT-A does not have an LMS mapping. Select Program A, preview the change and retry.',
      payload: { programmeCode: 'QT-A', action: 'enrol' },
      occurredAt: cal.ago(1.1),
    }),
    event(4, {
      type: 'licence',
      direction: 'crm_to_lms',
      learnerId: cast.expired.learner.userId,
      externalLearnerId: 'CRM-7003',
      entityId: null,
      status: 'conflict',
      attempts: 1,
      error:
        'Mapping conflict: the CRM licence status is older than the status already held in the LMS. Review and reconcile.',
      payload: { licenceStatus: 'active', crmUpdatedAt: cal.ago(60).toISOString() },
      occurredAt: cal.ago(0.8),
    }),
  ]
}

const PLACEHOLDER = 'To be confirmed'

/** Illustrative configuration per integration area. No real endpoints, secrets or claims. */
export function buildIntegrationSettings(cal: Calendar): SettingInsert[] {
  const created = cal.ago(30)
  const row = (
    area: SettingInsert['area'],
    state: string,
    config: Record<string, unknown>,
    tested = false,
  ): SettingInsert => ({
    id: stableUuid('integration-setting', area),
    area,
    state,
    config,
    lastTestAt: tested ? cal.ago(2) : null,
    createdAt: created,
    updatedAt: created,
  })
  return [
    row('sso', 'Not configured', {
      providerName: 'Demo Identity Provider (illustrative)',
      protocol: 'saml',
      entityId: 'https://idp.demo.invalid/metadata',
      maskedSecret: '••••••••',
      roleMapping: { learner: 'academy-learner', trainer: 'academy-trainer' },
    }),
    row(
      'api',
      'Connected demo',
      {
        baseUrl: 'https://api.demo.invalid/qta/v1',
        connectionType: 'REST with webhooks',
        eventCategories: ['enrolment', 'completion', 'examination', 'certification', 'licence'],
        scopes: { read: ['learners', 'enrolments', 'results'], write: ['enrolments', 'licence'] },
        maskedCredential: 'qta_demo_••••••••',
      },
      true,
    ),
    row('contentHosting', 'Connected demo', {
      authenticatedLaunch: true,
      downloadPermission: 'admin_only',
      exampleProtectedUrl: 'https://content.demo.invalid/protected/wvq-en-scorm2004/index.html',
    }),
    row('dataResidency', PLACEHOLDER, {
      rows: [
        'LMS records',
        'Uploaded content',
        'Backups',
        'Logs',
        'Learning record store',
        'AI and voice processing',
      ].map((item) => ({
        item,
        proposedRegion: PLACEHOLDER,
        provider: PLACEHOLDER,
        status: PLACEHOLDER,
      })),
    }),
    row(
      'crm',
      'Connected demo',
      {
        name: 'Demo CRM (illustrative)',
        environment: 'Sandbox',
        endpoint: 'https://crm.demo.invalid/api',
        authMethod: 'OAuth 2.0 client credentials (simulated)',
        maskedCredential: 'crm_demo_••••••••',
        syncDirection: 'both',
        triggerMode: 'event-driven',
        enabledCategories: ['enrolment', 'completion', 'examination', 'certification', 'licence'],
        paused: false,
      },
      true,
    ),
  ]
}
