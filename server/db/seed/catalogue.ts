import type { ProgrammeCode } from '@shared/constants'
import { ASSESSMENT_VERSION } from '@shared/content/assessments'
import { C01_VIDEO_SCRIPT, COURSES, PROGRAMMES_CONTENT } from '@shared/content/curriculum'
import { ASSIGNMENT_RULES, PATH_DEFINITIONS } from '@shared/content/paths'
import type {
  assessments as assessmentsTable,
  assignments as assignmentsTable,
  courses as coursesTable,
  pathItems as itemsTable,
  contentPackages as packagesTable,
  learningPaths as pathsTable,
  programmes as programmesTable,
  assignmentRules as rulesTable,
  pathVersions as versionsTable,
} from '../schema'
import { stableUuid } from './ids'
import type { Calendar } from './reference-date'

type ProgrammeInsert = typeof programmesTable.$inferInsert
type CourseInsert = typeof coursesTable.$inferInsert
type PackageInsert = typeof packagesTable.$inferInsert
type PathInsert = typeof pathsTable.$inferInsert
type VersionInsert = typeof versionsTable.$inferInsert
type ItemInsert = typeof itemsTable.$inferInsert
type RuleInsert = typeof rulesTable.$inferInsert
type AssessmentInsert = typeof assessmentsTable.$inferInsert
type AssignmentInsert = typeof assignmentsTable.$inferInsert

const CARD_IMAGES: Record<ProgrammeCode, string> = {
  A: '/images/official/doha-skyline-min.jpg',
  B: '/images/official/city-view.jpg',
  C: '/images/official/dhow-boat-min.jpg',
}

const PACKAGE_LABEL: Record<string, string> = {
  video: 'Captioned video with transcript',
  scorm_2004: 'SCORM 2004 sample package',
  scorm_12: 'SCORM 1.2 sample package',
  html_preview: 'Branching HTML preview (not a verified SCORM package)',
  resource: 'Resource and exercise',
}

const PACKAGE_LAUNCH: Record<string, string | null> = {
  C01: '/videos/c01-welcoming-every-visitor.mp4',
  C02: '/previews/c02-understanding-visitor-needs/index.html',
  C03: '/videos/c03-clear-and-inclusive-communication.mp4',
  C04: '/scorm/qta-sample-c04/index.html',
  C05: null,
  C06: null,
  C07: null,
}

export const ASSIGNMENT_BRIEFS = {
  A: 'Prepare a 300–500 word response plan for a visitor whose booked experience has changed. Include discovery questions, two feasible options, an escalation path and a follow-up message. Alternatively upload a two-minute fictional role-play.',
  B: 'Write a 100–150 word response to a fictional visitor whose plans have changed. Acknowledge the change, ask one useful question and offer a clear next step.',
} as const

export type Catalogue = {
  programmes: ProgrammeInsert[]
  courses: CourseInsert[]
  packages: PackageInsert[]
  paths: PathInsert[]
  versions: VersionInsert[]
  items: ItemInsert[]
  rules: RuleInsert[]
  assessments: AssessmentInsert[]
  assignments: AssignmentInsert[]
  ids: {
    programme: Record<ProgrammeCode, string>
    course: Record<string, string>
    path: Record<string, string>
    pathVersion: Record<string, string>
    pathItems: Record<string, { id: string; kind: string; courseCode?: string; position: number }[]>
    assessment: { pre: string; post: string; formative: string }
    assignment: { A: string; B: string }
  }
}

export function buildCatalogue(cal: Calendar): Catalogue {
  const published = cal.ago(100)
  const ids: Catalogue['ids'] = {
    programme: {
      A: stableUuid('programme', 'A'),
      B: stableUuid('programme', 'B'),
      C: stableUuid('programme', 'C'),
    },
    course: Object.fromEntries(COURSES.map((c) => [c.code, stableUuid('course', c.code)])),
    path: {},
    pathVersion: {},
    pathItems: {},
    assessment: {
      pre: stableUuid('assessment', 'PRE-V1'),
      post: stableUuid('assessment', 'POST-V1'),
      formative: stableUuid('assessment', 'FOUNDATION-V1'),
    },
    assignment: { A: stableUuid('assignment', 'A'), B: stableUuid('assignment', 'B') },
  }

  const programmes: ProgrammeInsert[] = (['A', 'B', 'C'] as const).map((code) => {
    const content = PROGRAMMES_CONTENT[code]
    return {
      id: ids.programme[code],
      code,
      title: content.title,
      audience: content.audience,
      summary: content.summary,
      formatLabel: content.formatLabel,
      durationLabel: content.durationLabel,
      levels: content.levels,
      // Enforced: B and C never issue certificates (brief §14).
      certificationEnabled: code === 'A',
      isIllustrative: content.illustrative,
      status: 'published',
      cardImagePath: CARD_IMAGES[code],
      completionRules:
        code === 'A'
          ? { foundationQuiz: 80, session: 70, assignment: 70, finalAssessment: 80 }
          : code === 'B'
            ? {
                requireAllCoreUnits: true,
                rolePlayRequired: 1,
                shortResponseApproval: true,
                postScoreBlocks: false,
                reviewSuggestedBelow: 80,
              }
            : { sampleOnly: true },
      createdAt: published,
      updatedAt: published,
    }
  })

  const courses: CourseInsert[] = COURSES.map((c) => ({
    id: ids.course[c.code] as string,
    code: c.code,
    title: c.title,
    format: c.format,
    durationMinutes: c.durationMinutes,
    summary: c.summary,
    completionRule: c.completionRule as unknown as Record<string, unknown>,
    completionText: c.completionText,
    transcript: c.code === 'C01' ? C01_VIDEO_SCRIPT : null,
    isActive: true,
    createdAt: published,
    updatedAt: published,
  }))

  const packages: PackageInsert[] = COURSES.map((c) => ({
    id: stableUuid('package', `${c.code}:1.0`),
    courseId: ids.course[c.code] as string,
    type: c.packageType,
    version: '1.0',
    title: c.title,
    launchUrl: PACKAGE_LAUNCH[c.code] ?? null,
    formatLabel: PACKAGE_LABEL[c.packageType] as string,
    isCurrent: true,
    createdAt: published,
    updatedAt: published,
  }))

  const paths: PathInsert[] = []
  const versions: VersionInsert[] = []
  const items: ItemInsert[] = []
  for (const def of PATH_DEFINITIONS) {
    const pathId = stableUuid('path', def.code)
    const versionId = stableUuid('pathversion', `${def.code}:1`)
    ids.path[def.code] = pathId
    ids.pathVersion[def.code] = versionId
    paths.push({
      id: pathId,
      code: def.code,
      programmeId: ids.programme[def.programme],
      name: def.name,
      description: def.description,
      isDefault: def.isDefault,
      currentVersionId: versionId,
      createdAt: published,
      updatedAt: published,
    })
    versions.push({
      id: versionId,
      pathId,
      version: 1,
      status: 'published',
      changeNote: 'Initial published version',
      publishedAt: published,
      createdAt: published,
      updatedAt: published,
    })
    ids.pathItems[def.code] = []
    def.items.forEach((item, index) => {
      const id = stableUuid('pathitem', `${def.code}:${index + 1}`)
      ids.pathItems[def.code]?.push({
        id,
        kind: item.kind,
        ...(item.courseCode ? { courseCode: item.courseCode } : {}),
        position: index + 1,
      })
      items.push({
        id,
        pathVersionId: versionId,
        position: index + 1,
        kind: item.kind,
        courseId: item.courseCode ? (ids.course[item.courseCode] as string) : null,
        scenarioKey: item.scenarioKey ?? null,
        title: item.title,
        required: item.required,
        level: item.level,
        stage: item.stage,
        note: item.note ?? null,
        createdAt: published,
        updatedAt: published,
      })
    })
  }

  const rules: RuleInsert[] = ASSIGNMENT_RULES.map((rule) => ({
    id: stableUuid('rule', rule.code),
    code: rule.code,
    programmeId: ids.programme[rule.programme],
    pathId: ids.path[rule.pathCode] as string,
    name: rule.name,
    summary: rule.summary,
    conditions: rule.conditions,
    priority: rule.priority,
    isDefault: rule.isDefault,
    status: 'published',
    createdAt: published,
    updatedAt: published,
  }))

  const assessments: AssessmentInsert[] = (
    [
      {
        id: ids.assessment.pre,
        code: 'PRE-V1',
        kind: 'pre',
        version: ASSESSMENT_VERSION,
        title: 'Baseline assessment',
        passPercent: null,
      },
      {
        id: ids.assessment.post,
        code: 'POST-V1',
        kind: 'post',
        version: ASSESSMENT_VERSION,
        title: 'Post-assessment',
        passPercent: 80,
      },
      {
        id: ids.assessment.formative,
        code: 'FOUNDATION-V1',
        kind: 'formative',
        version: ASSESSMENT_VERSION,
        title: 'Foundation quiz',
        passPercent: 80,
      },
    ] as const
  ).map((a) => ({ ...a, createdAt: published, updatedAt: published }))

  const assignments: AssignmentInsert[] = [
    {
      id: ids.assignment.A,
      code: 'A-ASSIGN-1',
      programmeId: ids.programme.A,
      title: 'Visitor service response plan',
      brief: ASSIGNMENT_BRIEFS.A,
      wordMin: 300,
      wordMax: 500,
      allowsUpload: true,
      passPercent: 70,
      createdAt: published,
      updatedAt: published,
    },
    {
      id: ids.assignment.B,
      code: 'B-SHORT-1',
      programmeId: ids.programme.B,
      title: 'Short visitor response',
      brief: ASSIGNMENT_BRIEFS.B,
      wordMin: 100,
      wordMax: 150,
      allowsUpload: false,
      passPercent: 70,
      createdAt: published,
      updatedAt: published,
    },
  ]

  return {
    programmes,
    courses,
    packages,
    paths,
    versions,
    items,
    rules,
    assessments,
    assignments,
    ids,
  }
}
