import type { ProgrammeCode } from '@shared/constants'
import {
  type AdminProgrammeUpdate,
  adminProgrammeUpdate,
  programmeIdParam,
} from '@shared/schemas/admin-programmes'
import {
  ApiError,
  commit,
  db,
  delay,
  findOr404,
  indexBy,
  out,
  parseInput,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'

/**
 * Programme management (brief §14), formerly /api/admin/programmes. Admin only
 * (shared/permissions.ts 'path.change'). Every figure is counted from the demo records.
 */

/**
 * Only Program A certifies (brief §3, §14: "Enforce Program B certification off"). Program C is
 * an illustrative sample and never certifies either. Enforced here, not in the UI.
 */
export const canCertify = (code: ProgrammeCode) => code === 'A'

/** Enrolment mode is a fixed demo rule per programme (brief §1, §3), shown read-only. */
export const ENROLMENT_MODE: Record<ProgrammeCode, { label: string; detail: string }> = {
  A: {
    label: 'Explicit choice with demo approval',
    detail:
      'Learners choose Program A explicitly; a demo approval rule confirms the enrolment. Existing accounts keep their other enrolments.',
  },
  B: {
    label: 'Open visitor registration (default)',
    detail: 'Public visitor registration enrols in Program B by default.',
  },
  C: {
    label: 'Illustrative sample',
    detail: 'Seeded historical demo activity only. Not an actual Qatar Tourism programme.',
  },
}

function summaries() {
  return [...db.programmes]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => {
      const mine = db.enrolments.filter((e) => e.programmeId === row.id)
      const of = (status: string) => mine.filter((e) => e.status === status).length
      return {
        id: row.id,
        code: row.code,
        title: row.title,
        audience: row.audience,
        summary: row.summary,
        formatLabel: row.formatLabel,
        durationLabel: row.durationLabel,
        levels: row.levels,
        certificationEnabled: row.certificationEnabled,
        canCertify: canCertify(row.code),
        isIllustrative: row.isIllustrative,
        status: row.status,
        cardImagePath: row.cardImagePath,
        enrolmentMode: ENROLMENT_MODE[row.code],
        enrolments: mine.length,
        completed: of('completed'),
        inProgress: of('in_progress') + of('awaiting_review'),
        notStarted: of('not_started'),
        learners: new Set(mine.map((e) => e.learnerId)).size,
        paths: db.learningPaths.filter((p) => p.programmeId === row.id).length,
        certificates: db.certificates.filter(
          (c) => c.programmeId === row.id && c.status === 'issued',
        ).length,
        updatedAt: row.updatedAt,
      }
    })
}

/** Every programme with its live enrolment, path and certificate counts. */
export async function listProgrammes() {
  await delay()
  requireRole('admin')
  return out(summaries())
}

/** One programme: counts, completion rules, paths, default-path structure and catalogue. */
export async function getProgramme(programmeId: string) {
  await delay()
  requireRole('admin')
  parseInput(programmeIdParam, { programmeId }, 'param')
  const programme = findOr404(summaries(), (p) => p.id === programmeId, 'Programme not found')
  const row = db.programmes.find((p) => p.id === programmeId)
  const courses = indexBy(db.courses, (c) => c.id)

  const paths = db.learningPaths
    .filter((p) => p.programmeId === programmeId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const defaultPath = paths.find((p) => p.isDefault) ?? paths[0]
  const versionIds = new Set(paths.map((p) => p.currentVersionId).filter(Boolean))
  const items = db.pathItems
    .filter((i) => versionIds.has(i.pathVersionId))
    .sort((a, b) => a.position - b.position)
    .map((i) => {
      const course = i.courseId ? courses.get(i.courseId) : undefined
      return { ...i, course }
    })

  const stages: {
    level: number
    stage: string
    items: { title: string; kind: string; required: boolean }[]
  }[] = []
  for (const item of items.filter((i) => i.pathVersionId === defaultPath?.currentVersionId)) {
    let group = stages.find((s) => s.level === item.level && s.stage === item.stage)
    if (!group) {
      group = { level: item.level, stage: item.stage, items: [] }
      stages.push(group)
    }
    group.items.push({ title: item.title, kind: item.kind, required: item.required })
  }

  const catalogue = new Map<string, { code: string; title: string; format: string }>()
  for (const { course } of items) {
    if (course)
      catalogue.set(course.code, { code: course.code, title: course.title, format: course.format })
  }

  const kinds = new Set(items.map((i) => i.kind))
  const usedAssessments = [...db.assessments]
    .sort((a, b) => a.code.localeCompare(b.code))
    .filter(
      (a) =>
        (a.kind === 'pre' && kinds.has('assessment_pre')) ||
        (a.kind === 'post' && kinds.has('assessment_post')) ||
        (a.kind === 'formative' && kinds.has('assessment_formative')),
    )
    .map((a) => ({
      code: a.code,
      title: a.title,
      kind: a.kind,
      version: a.version,
      passPercent: a.passPercent,
    }))

  return out({
    ...programme,
    completionRules: (row?.completionRules ?? {}) as Record<string, unknown>,
    defaultPath: defaultPath
      ? { id: defaultPath.id, code: defaultPath.code, name: defaultPath.name }
      : null,
    paths: paths.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      isDefault: p.isDefault,
      published: Boolean(p.currentVersionId),
    })),
    structure: stages,
    catalogue: [...catalogue.values()].sort((a, b) => a.code.localeCompare(b.code)),
    assessments: usedAssessments,
    assignments: db.assignments
      .filter((a) => a.programmeId === programmeId)
      .map((a) => ({ code: a.code, title: a.title, passPercent: a.passPercent })),
  })
}

/** Updates a programme. Certification can be switched on for Program A only. Audited. */
export async function updateProgramme(programmeId: string, input: AdminProgrammeUpdate) {
  await delay()
  requireRole('admin')
  parseInput(programmeIdParam, { programmeId }, 'param')
  const data = parseInput(adminProgrammeUpdate, input)
  const current = findOr404(db.programmes, (p) => p.id === programmeId, 'Programme not found')
  if (data.certificationEnabled === true && !canCertify(current.code)) {
    throw new ApiError(
      422,
      'CERTIFICATION_NOT_ALLOWED',
      `Program ${current.code} does not issue certificates. Certification stays off.`,
    )
  }

  const changes = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) => value !== undefined && current[key as keyof typeof current] !== value,
    ),
  ) as AdminProgrammeUpdate
  if (Object.keys(changes).length === 0) return { id: programmeId, changed: [] as string[] }

  const before = Object.fromEntries(
    Object.keys(changes).map((key) => [key, current[key as keyof typeof current]]),
  )
  updateRow(current, changes)
  audit({
    action: 'programme.update',
    objectType: 'programme',
    objectId: current.code,
    before,
    after: changes,
  })
  commit()
  return { id: programmeId, changed: Object.keys(changes) }
}

export type ProgrammeSummary = Awaited<ReturnType<typeof listProgrammes>>[number]
export type ProgrammeDetail = Awaited<ReturnType<typeof getProgramme>>
