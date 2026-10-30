import { can } from '@shared/permissions'
import { learnerDisplayId } from '@shared/utils/identity'
import { commit, db, delay, out, requireCapability, requireRole } from '../api'
import { audit } from '../audit.service'
import { hostingConfig } from './settings'

/**
 * Access previews and the access audit trail (SPEC §2). A preview is an in-page SIMULATED state:
 * it evaluates the Academy's access rule for a chosen persona and writes a labelled demo audit
 * row. It never switches the real session.
 */

export type PreviewPersona = 'learner' | 'trainer' | 'visitor' | 'unassigned'
export type FlowStep = { label: string; status: 'passed' | 'failed' | 'skipped'; detail: string }
export type ExportRow = { label: string; allowed: boolean; reason: string }

export type AccessPreview = {
  persona: PreviewPersona
  demoUser: string
  outcome: 'launched' | 'denied' | 'sign_in_required'
  headline: string
  steps: FlowStep[]
  content: { packageId: string; title: string; language: string; protectedUrl: string } | null
  cohorts: { code: string; title: string; learners: number }[]
  exports: ExportRow[]
}

const DEFAULT_PACKAGE = 'wvq-en-scorm2004'

/** Course ids a programme's learning paths use. */
function programmeCourses(programmeId: string): Set<string> {
  const versionIds = new Set(
    db.learningPaths.filter((p) => p.programmeId === programmeId).map((p) => p.currentVersionId),
  )
  return new Set(
    db.pathItems
      .filter((i) => versionIds.has(i.pathVersionId) && i.courseId)
      .map((i) => i.courseId as string),
  )
}

const learnerAssigned = (userId: string, courseId: string): boolean =>
  db.enrolments.some((e) => e.learnerId === userId && programmeCourses(e.programmeId).has(courseId))

function findUnassignedLearner(courseId: string) {
  for (const profile of db.profiles) {
    const user = db.users.find((u) => u.id === profile.userId)
    if (user?.role === 'learner' && !learnerAssigned(user.id, courseId)) return profile
  }
  return null
}

const step = (label: string, status: FlowStep['status'], detail: string): FlowStep => ({
  label,
  status,
  detail,
})

const FLOW = ['Sign in', 'Identity check', 'Academy permissions', 'Authorised content launch']

function deniedSteps(failedAt: number, details: string[]): FlowStep[] {
  return FLOW.map((label, i) =>
    step(label, i < failedAt ? 'passed' : i === failedAt ? 'failed' : 'skipped', details[i] ?? ''),
  )
}

export async function previewAccess(
  persona: PreviewPersona,
  packageId: string = DEFAULT_PACKAGE,
): Promise<AccessPreview> {
  await delay()
  requireCapability('integration.configure')
  const pkg = db.contentPackages.find((p) => p.packageId === packageId)
  if (!pkg) throw new Error('Package not found')
  const base = hostingConfig().exampleProtectedUrl.replace(/\/protected\/.*$/, '/protected')
  const content = {
    packageId,
    title: pkg.title,
    language: pkg.language.toUpperCase(),
    protectedUrl: `${base}/${packageId}/index.html`,
  }
  let result: AccessPreview

  if (persona === 'visitor') {
    result = {
      persona,
      demoUser: 'Signed-out visitor',
      outcome: 'sign_in_required',
      headline: 'Sign in to continue. Protected content does not open for a signed-out visitor.',
      steps: deniedSteps(0, ['No session found. The visitor is asked to sign in.']),
      content: null,
      cohorts: [],
      exports: [],
    }
  } else if (persona === 'trainer') {
    const trainer = db.trainerProfiles.find((t) => db.sessions.some((s) => s.trainerId === t.id))
    const sessions = db.sessions.filter((s) => s.trainerId === trainer?.id)
    const authorised = sessions.some((s) => programmeCourses(s.programmeId).has(pkg.courseId))
    result = {
      persona,
      demoUser: `${trainer?.fullName ?? 'External trainer'} (trainer)`,
      outcome: authorised ? 'launched' : 'denied',
      headline: authorised
        ? 'The trainer sees only assigned cohorts and authorised content, with restricted exports.'
        : 'Access denied: this content is not part of the trainer’s assigned programmes.',
      steps: authorised
        ? FLOW.map((label, i) =>
            step(
              label,
              'passed',
              [
                'Signed in as a trainer.',
                'Identity confirmed (simulated).',
                'Permissions: assigned sessions only.',
                'Content is authorised for assigned cohorts.',
              ][i] ?? '',
            ),
          )
        : deniedSteps(2, [
            'Signed in.',
            'Identity confirmed (simulated).',
            'No assigned session uses this content.',
          ]),
      content: authorised ? content : null,
      cohorts: sessions.slice(0, 4).map((s) => ({
        code: s.code,
        title: s.title,
        learners: db.rsvps.filter((r) => r.sessionId === s.id && r.status === 'confirmed').length,
      })),
      exports: [
        {
          label: 'Marks for assigned sessions (learner ID and score only)',
          allowed: can('trainer', 'export.marks'),
          reason: 'Limited fields, assigned sessions only.',
        },
        {
          label: 'Personal data export',
          allowed: can('trainer', 'export.personal'),
          reason: 'Blocked for trainers.',
        },
        { label: 'Rosters of other trainers', allowed: false, reason: 'No Academy-wide access.' },
      ],
    }
  } else {
    const mariam = db.profiles.find((p) => p.learnerCode === 'L0042')
    const profile = persona === 'learner' ? mariam : findUnassignedLearner(pkg.courseId)
    const assigned = Boolean(profile && learnerAssigned(profile.userId, pkg.courseId))
    const who = profile
      ? `${profile.fullName} (${learnerDisplayId(profile.learnerCode)})`
      : 'Unassigned learner'
    result = {
      persona,
      demoUser: who,
      outcome: assigned ? 'launched' : 'denied',
      headline: assigned
        ? 'Authorised: the assigned lesson opens through an authenticated launch.'
        : 'Access denied: this learner is not assigned to this content. Nothing was opened.',
      steps: assigned
        ? FLOW.map((label, i) =>
            step(
              label,
              'passed',
              [
                'Signed in as a learner.',
                'Identity confirmed (simulated).',
                'Assigned through an active enrolment.',
                'Launched with an authenticated session.',
              ][i] ?? '',
            ),
          )
        : deniedSteps(2, [
            'Signed in as a learner.',
            'Identity confirmed (simulated).',
            'No enrolment assigns this content to the learner.',
          ]),
      content: assigned ? content : null,
      cohorts: [],
      exports: [],
    }
  }

  audit({
    action: result.outcome === 'launched' ? 'content.launch_preview' : 'content.access_denied',
    objectType: 'content_package',
    objectId: packageId,
    after: { demoUser: result.demoUser, persona, simulated: true },
    reason: result.headline,
    outcome: result.outcome === 'launched' ? 'allowed' : 'denied',
  })
  commit()
  return out(result)
}

export type AccessAuditRow = {
  id: string
  at: string
  demoUser: string
  action: string
  result: 'Allowed' | 'Denied'
  reason: string
}

const ACTION_LABELS: Record<string, string> = {
  'sso.test_sign_in': 'SSO test sign in',
  'content.launch_preview': 'Authenticated content launch (preview)',
  'content.access_denied': 'Content access denied (preview)',
  'integration.config_save': 'Configuration saved',
  'integration.api_test': 'API connection test',
  'integration.crm_test': 'CRM connection test',
}

/** The readable audit trail for this page: timestamp, demo user, action, result and reason. */
export async function listAccessAudit(limit = 30): Promise<AccessAuditRow[]> {
  await delay()
  requireRole('admin')
  return out(
    db.auditEvents
      .map((e, index) => ({ e, index }))
      .filter(({ e }) => e.action in ACTION_LABELS)
      .sort((a, b) => b.e.createdAt.localeCompare(a.e.createdAt) || b.index - a.index)
      .slice(0, limit)
      .map(({ e }) => ({
        id: e.id,
        at: e.createdAt,
        demoUser: String(
          (e.after as { demoUser?: string } | null)?.demoUser ?? e.actorLabel ?? 'System',
        ),
        action: ACTION_LABELS[e.action] ?? e.action,
        result: e.outcome === 'denied' ? ('Denied' as const) : ('Allowed' as const),
        reason: e.reason ?? '',
      })),
  )
}
