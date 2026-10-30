import type {
  JobFunction,
  LearningGoal,
  OrganisationType,
  PathItemKind,
  ProgrammeCode,
  Seniority,
} from '../constants/enums'

/**
 * Learning path definitions and assignment rules (brief §7 path examples, §14 table).
 * The seed loads these into `learning_paths`, `path_versions`, `path_items` and
 * `assignment_rules`; the admin path builder edits the same shapes.
 */

export type PathItemDefinition = {
  kind: PathItemKind
  /** Course code (C01…) when kind is 'course' or 'session'. */
  courseCode?: string
  /** Scenario key when kind is 'ai_practice'. */
  scenarioKey?: string
  title: string
  required: boolean
  /** Level number within the programme (Program A has 2; B and C have 1). */
  level: number
  /** Stage label shown on the learner dashboard. */
  stage: string
  /** Optional context note, e.g. "transport context". */
  note?: string
}

export type PathDefinition = {
  code: string
  programme: ProgrammeCode
  name: string
  description: string
  isDefault: boolean
  items: readonly PathItemDefinition[]
}

const pre: PathItemDefinition = {
  kind: 'assessment_pre',
  title: 'Pre-assessment (baseline)',
  required: true,
  level: 1,
  stage: 'Onboarding',
}

const postB: PathItemDefinition = {
  kind: 'assessment_post',
  title: 'Post-assessment',
  required: true,
  level: 1,
  stage: 'Visitor Service Essentials',
}

function bCourse(courseCode: string, title: string, note?: string): PathItemDefinition {
  return {
    kind: 'course',
    courseCode,
    title,
    required: true,
    level: 1,
    stage: 'Visitor Service Essentials',
    ...(note ? { note } : {}),
  }
}

/**
 * 29 Oct Content Library units, optional extras at the end of every Program A and B path (kept
 * last so existing item ids and the required-unit maths are unchanged). Learners can open either
 * language version; credit counts once per unit.
 */
function libraryItems(level: number, stage: string): PathItemDefinition[] {
  return [
    {
      kind: 'course',
      courseCode: 'C08',
      title: 'Welcoming visitors to Qatar',
      required: false,
      level,
      stage,
      note: 'English and Arabic',
    },
    {
      kind: 'course',
      courseCode: 'C09',
      title: 'Planning a visitor experience',
      required: false,
      level,
      stage,
      note: 'English and Arabic',
    },
  ]
}

export const PATH_DEFINITIONS: readonly PathDefinition[] = [
  {
    code: 'B-HOTEL',
    programme: 'B',
    name: 'B Hotel guest services',
    description: 'C01, C02, C03 and C05 with a complaint role-play, then the post-assessment.',
    isDefault: false,
    items: [
      pre,
      bCourse('C01', 'Welcoming every visitor'),
      bCourse('C02', 'Understanding visitor needs'),
      bCourse('C03', 'Clear and inclusive communication'),
      bCourse('C05', 'Planning a helpful visitor response'),
      {
        kind: 'ai_practice',
        scenarioKey: 'changed-booking',
        title: 'AI complaint scenario: Changed booking',
        required: true,
        level: 1,
        stage: 'Visitor Service Essentials',
      },
      postB,
      ...libraryItems(1, 'Visitor Service Essentials'),
    ],
  },
  {
    code: 'B-TRANSPORT',
    programme: 'B',
    name: 'B Transport services',
    description:
      'C01, C03, C02 with a transport context and C05, with a directions role-play, then the post-assessment.',
    isDefault: false,
    items: [
      pre,
      bCourse('C01', 'Welcoming every visitor'),
      bCourse('C03', 'Clear and inclusive communication'),
      bCourse('C02', 'Understanding visitor needs', 'Transport scenario'),
      bCourse('C05', 'Planning a helpful visitor response'),
      {
        kind: 'ai_practice',
        scenarioKey: 'unclear-directions',
        title: 'AI directions scenario: Unclear directions',
        required: true,
        level: 1,
        stage: 'Visitor Service Essentials',
      },
      postB,
      ...libraryItems(1, 'Visitor Service Essentials'),
    ],
  },
  {
    code: 'B-GENERAL',
    programme: 'B',
    name: 'B General visitor service',
    description:
      'General C01–C03 and C05 with a practice scenario of the learner’s choice, then the post-assessment.',
    isDefault: true,
    items: [
      pre,
      bCourse('C01', 'Welcoming every visitor'),
      bCourse('C02', 'Understanding visitor needs'),
      bCourse('C03', 'Clear and inclusive communication'),
      bCourse('C05', 'Planning a helpful visitor response'),
      {
        kind: 'ai_practice',
        title: 'AI practice: chosen scenario',
        required: true,
        level: 1,
        stage: 'Visitor Service Essentials',
      },
      postB,
      ...libraryItems(1, 'Visitor Service Essentials'),
    ],
  },
  {
    code: 'A-PRO',
    programme: 'A',
    name: 'A Professional pathway',
    description:
      'Foundation units, practice, trainer session, assignment and post-assessment (C01–C06 plus all A assessments and the practical assignment).',
    isDefault: true,
    items: [
      { ...pre, stage: 'Onboarding' },
      {
        kind: 'course',
        courseCode: 'C01',
        title: 'Welcoming every visitor',
        required: true,
        level: 1,
        stage: 'Foundation learning',
      },
      {
        kind: 'course',
        courseCode: 'C03',
        title: 'Clear and inclusive communication',
        required: true,
        level: 1,
        stage: 'Foundation learning',
      },
      {
        kind: 'course',
        courseCode: 'C04',
        title: 'Recovering a difficult service moment',
        required: true,
        level: 1,
        stage: 'Foundation learning',
      },
      {
        kind: 'course',
        courseCode: 'C02',
        title: 'Understanding visitor needs',
        required: true,
        level: 1,
        stage: 'Foundation learning',
      },
      {
        kind: 'assessment_formative',
        title: 'Foundation quiz',
        required: true,
        level: 1,
        stage: 'Foundation learning',
      },
      {
        kind: 'ai_practice',
        title: 'AI practice: text or voice',
        required: true,
        level: 1,
        stage: 'AI practice',
      },
      {
        kind: 'course',
        courseCode: 'C05',
        title: 'Planning a helpful visitor response',
        required: true,
        level: 2,
        stage: 'Practical assignment',
      },
      {
        kind: 'session',
        courseCode: 'C06',
        title: 'Delivering service in practice',
        required: true,
        level: 2,
        stage: 'Trainer-led application',
      },
      {
        kind: 'assignment',
        title: 'Practical assignment',
        required: true,
        level: 2,
        stage: 'Practical assignment',
      },
      {
        kind: 'assessment_post',
        title: 'Final assessment',
        required: true,
        level: 2,
        stage: 'Final assessment',
      },
      ...libraryItems(1, 'Foundation learning'),
    ],
  },
  {
    code: 'C-PREVIEW',
    programme: 'C',
    name: 'C Destination storytelling preview',
    description: 'Illustrative sample: the C07 preview and story-planning worksheet.',
    isDefault: true,
    items: [
      {
        kind: 'course',
        courseCode: 'C07',
        title: 'Telling a concise destination story',
        required: true,
        level: 1,
        stage: 'Sample overview',
      },
    ],
  },
]

// ---------------------------------------------------------------------------------------------
// Assignment rules (brief §14)
// ---------------------------------------------------------------------------------------------

/** Profile fields a rule can test (brief §14 "Rule controls"). */
export type RuleField =
  | 'organisationType'
  | 'organisation'
  | 'jobFunction'
  | 'jobTitle'
  | 'seniority'
  | 'experience'
  | 'goals'
  | 'baselineWeakCompetency'

export type RuleOperator = 'eq' | 'in' | 'includes_any' | 'contains'

export type RuleCondition = {
  field: RuleField
  operator: RuleOperator
  value: string | readonly string[]
}

/** Nested AND/OR tree. `conditions` may contain further groups. */
export type RuleGroup = {
  op: 'AND' | 'OR'
  conditions: readonly (RuleCondition | RuleGroup)[]
}

export type RuleDefinition = {
  code: string
  name: string
  programme: ProgrammeCode
  pathCode: string
  /** Higher priority wins when several rules match (brief §14: explicit priority). */
  priority: number
  isDefault: boolean
  conditions: RuleGroup
  /** Brief wording of the rule. */
  summary: string
  variation: string
}

export const ASSIGNMENT_RULES: readonly RuleDefinition[] = [
  {
    code: 'RULE-B-HOTEL',
    name: 'B Hotel guest services',
    programme: 'B',
    pathCode: 'B-HOTEL',
    priority: 20,
    isDefault: false,
    conditions: {
      op: 'AND',
      conditions: [
        { field: 'organisationType', operator: 'eq', value: 'hotel_accommodation' },
        { field: 'jobFunction', operator: 'in', value: ['guest_services', 'front_office'] },
      ],
    },
    summary: 'Organisation type = hotel AND job function = guest services/front office',
    variation: 'C01, C02, C03 and C05; complaint role-play.',
  },
  {
    code: 'RULE-B-TRANSPORT',
    name: 'B Transport services',
    programme: 'B',
    pathCode: 'B-TRANSPORT',
    priority: 10,
    isDefault: false,
    conditions: {
      op: 'OR',
      conditions: [
        { field: 'organisationType', operator: 'eq', value: 'transport' },
        { field: 'jobFunction', operator: 'eq', value: 'transport' },
      ],
    },
    summary: 'Organisation type = transport OR function = driver/transport',
    variation: 'C01, C03, C02 transport scenario and C05; directions role-play.',
  },
  {
    code: 'RULE-B-GENERAL',
    name: 'B General visitor service',
    programme: 'B',
    pathCode: 'B-GENERAL',
    priority: 0,
    isDefault: true,
    conditions: { op: 'AND', conditions: [] },
    summary: 'Default when no more specific rule matches',
    variation: 'General C01–C03 and C05; chosen practice scenario.',
  },
  {
    code: 'RULE-A-PRO',
    name: 'A Professional pathway',
    programme: 'A',
    pathCode: 'A-PRO',
    priority: 0,
    isDefault: true,
    conditions: { op: 'AND', conditions: [] },
    summary: 'Explicit A enrolment; relevant professional goal',
    variation: 'Foundation units, practice, trainer session, assignment and post-assessment.',
  },
  {
    code: 'RULE-C-PREVIEW',
    name: 'C Destination storytelling preview',
    programme: 'C',
    pathCode: 'C-PREVIEW',
    priority: 0,
    isDefault: true,
    conditions: { op: 'AND', conditions: [] },
    summary: 'Default for the illustrative Program C sample',
    variation: 'C07 preview and story-planning worksheet.',
  },
]

// ---------------------------------------------------------------------------------------------
// Rule evaluation (pure; used by the seed, the path preview and the enrolment service)
// ---------------------------------------------------------------------------------------------

export type RuleProfile = {
  organisationType?: OrganisationType | null
  organisation?: string | null
  jobFunction?: JobFunction | null
  jobTitle?: string | null
  seniority?: Seniority | null
  experience?: string | null
  goals?: readonly LearningGoal[] | null
  baselineWeakCompetency?: string | null
  /** A draft profile has missing fields: the default path applies (brief §4). */
  complete: boolean
}

function isGroup(node: RuleCondition | RuleGroup): node is RuleGroup {
  return 'op' in node
}

function fieldValues(profile: RuleProfile, field: RuleField): string[] {
  const raw = profile[field]
  if (raw === null || raw === undefined) return []
  return Array.isArray(raw) ? [...raw] : [String(raw)]
}

function matchesCondition(condition: RuleCondition, profile: RuleProfile): boolean {
  const have = fieldValues(profile, condition.field)
  const want = Array.isArray(condition.value) ? condition.value : [condition.value as string]
  switch (condition.operator) {
    case 'eq':
      return have.length > 0 && have[0] === want[0]
    case 'in':
    case 'includes_any':
      return have.some((value) => want.includes(value))
    case 'contains':
      return have.some((value) => want.some((w) => value.toLowerCase().includes(w.toLowerCase())))
  }
}

export function matchesGroup(group: RuleGroup, profile: RuleProfile): boolean {
  // An empty group is the "default" rule: it matches anything, but only as a fallback.
  if (group.conditions.length === 0) return true
  const test = (node: RuleCondition | RuleGroup) =>
    isGroup(node) ? matchesGroup(node, profile) : matchesCondition(node, profile)
  return group.op === 'AND' ? group.conditions.every(test) : group.conditions.some(test)
}

export type PathResolution = {
  rule: RuleDefinition
  reason: string
}

/**
 * Picks the path rule for a profile: highest-priority matching specific rule, else the
 * programme default. An incomplete profile always gets the default (brief §4).
 */
export function resolvePathRule(
  programme: ProgrammeCode,
  profile: RuleProfile,
  rules: readonly RuleDefinition[] = ASSIGNMENT_RULES,
): PathResolution {
  const forProgramme = rules.filter((rule) => rule.programme === programme)
  const fallback = forProgramme.find((rule) => rule.isDefault) ?? forProgramme[0]
  if (!fallback) throw new Error(`No assignment rule defined for programme ${programme}`)

  if (!profile.complete) {
    return {
      rule: fallback,
      reason: `Default path (profile incomplete): ${fallback.name}`,
    }
  }

  const specific = forProgramme
    .filter((rule) => !rule.isDefault && matchesGroup(rule.conditions, profile))
    .sort((a, b) => b.priority - a.priority)[0]

  if (specific) {
    return {
      rule: specific,
      reason: `Rule match (priority ${specific.priority}): ${specific.name}`,
    }
  }
  return { rule: fallback, reason: `Default path: ${fallback.name}` }
}
