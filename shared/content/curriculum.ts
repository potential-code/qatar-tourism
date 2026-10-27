import type { CourseFormat, PackageType, ProgrammeCode } from '../constants/enums'

/**
 * Sample curriculum C01–C07 (brief §7). Original fictional demonstration content: do not
 * present any of it as official Qatar Tourism guidance.
 */

export type CompletionRule =
  | { type: 'video_watched'; percent: number }
  | { type: 'package_reports_completion' }
  | { type: 'module_quiz'; minPercent: number }
  | { type: 'formative_questions'; questions: number }
  | { type: 'resource_and_exercise'; wordsMin?: number; wordsMax?: number }
  | { type: 'session_attended_and_scored'; minScore: number }
  | { type: 'preview_viewed' }

export type CourseDefinition = {
  code: string
  title: string
  format: CourseFormat
  formatLabel: string
  durationMinutes: number
  summary: string
  completionRule: CompletionRule
  completionText: string
  packageType: PackageType
  /** Programmes that include this course in at least one of their paths. */
  programmes: readonly ProgrammeCode[]
}

export const COURSES: readonly CourseDefinition[] = [
  {
    code: 'C01',
    title: 'Welcoming every visitor',
    format: 'video',
    formatLabel: 'Video',
    durationMinutes: 3,
    summary: 'Greet, ask a useful question, listen and offer a clear next step.',
    completionRule: { type: 'video_watched', percent: 90 },
    completionText: 'Captioned video plus transcript; complete at 90 percent watched.',
    packageType: 'video',
    programmes: ['A', 'B'],
  },
  {
    code: 'C02',
    title: 'Understanding visitor needs',
    format: 'interactive',
    formatLabel: 'Interactive package',
    durationMinutes: 8,
    summary: 'Branching scenario with a family choosing an activity.',
    completionRule: { type: 'package_reports_completion' },
    completionText: 'Three choices, feedback and retry; package reports completion and score.',
    packageType: 'html_preview',
    programmes: ['A', 'B'],
  },
  {
    code: 'C03',
    title: 'Clear and inclusive communication',
    format: 'video',
    formatLabel: 'Video',
    durationMinutes: 4,
    summary: 'Plain language, accessibility preferences and checking understanding.',
    completionRule: { type: 'formative_questions', questions: 3 },
    completionText: 'Add three formative questions.',
    packageType: 'video',
    programmes: ['A', 'B'],
  },
  {
    code: 'C04',
    title: 'Recovering a difficult service moment',
    format: 'interactive',
    formatLabel: 'Interactive package',
    durationMinutes: 10,
    summary:
      'A disappointed visitor faces a changed booking. Practise acknowledgement, options and escalation.',
    completionRule: { type: 'module_quiz', minPercent: 80 },
    completionText: 'Minimum 80 percent on module quiz.',
    packageType: 'scorm_2004',
    programmes: ['A', 'B'],
  },
  {
    code: 'C05',
    title: 'Planning a helpful visitor response',
    format: 'resource',
    formatLabel: 'Resource and exercise',
    durationMinutes: 10,
    summary: 'One-page checklist with a short written response.',
    completionRule: { type: 'resource_and_exercise', wordsMin: 100, wordsMax: 150 },
    completionText: 'B uses a 100–150 word task; A develops it into the practical assignment.',
    packageType: 'resource',
    programmes: ['A', 'B'],
  },
  {
    code: 'C06',
    title: 'Delivering service in practice',
    format: 'session',
    formatLabel: 'Trainer session',
    durationMinutes: 60,
    summary: 'Role-play in pairs, feedback, attendance and scored demonstration.',
    completionRule: { type: 'session_attended_and_scored', minScore: 70 },
    completionText: 'Role-play in pairs, feedback, attendance and scored demonstration. A only.',
    packageType: 'resource',
    programmes: ['A'],
  },
  {
    code: 'C07',
    title: 'Telling a concise destination story',
    format: 'preview',
    formatLabel: 'Preview',
    durationMinutes: 5,
    summary: 'Program C sample overview with a fictional story-planning worksheet.',
    completionRule: { type: 'preview_viewed' },
    completionText: 'No claim of a fully built third programme.',
    packageType: 'html_preview',
    programmes: ['C'],
  },
]

export const COURSE_BY_CODE: Record<string, CourseDefinition> = Object.fromEntries(
  COURSES.map((course) => [course.code, course]),
)

/** C01 sample video narration (brief §7), verbatim. Also the transcript text. */
export const C01_VIDEO_SCRIPT =
  'A helpful welcome begins with attention. Greet the visitor, introduce yourself and ask what they need today. Listen before suggesting an option. If the request is unclear, ask one short follow-up question. Offer information you can verify and explain the next step in plain language. Before the conversation ends, check that the visitor knows what to do next. A confident service experience is built through clarity, respect and follow-through.'

/** Storyboard for the C01 sample video (brief §7): staff greeting, visitor question, two options, closing. */
export const C01_SCENES = [
  { scene: 1, caption: 'A staff member greets the visitor and introduces themselves.' },
  { scene: 2, caption: 'The visitor asks what is available today.' },
  { scene: 3, caption: 'The staff member listens, then offers two useful, verified options.' },
  { scene: 4, caption: 'A clear closing: the visitor knows what to do next.' },
] as const

/** Program summaries used by the catalogue (brief §3). */
export const PROGRAMMES_CONTENT = {
  A: {
    code: 'A',
    title: 'Tourism Service Professional',
    audience: 'Service professionals who want a structured, certified route.',
    summary:
      'Build service skills through self-paced learning, guided practice and trainer-led sessions. Complete assessments and a practical assignment to earn a demonstration certificate.',
    format: 'Two levels • Hybrid • Approximately 4 hours • Certification track',
    durationLabel: 'Approximately 4 hours',
    formatLabel: 'Hybrid',
    certification: true,
    levels: 2,
    cta: 'Join Program A',
    illustrative: false,
  },
  B: {
    code: 'B',
    title: 'Visitor Service Essentials',
    audience: 'Anyone who serves visitors and wants a personalised starting point.',
    summary:
      'Develop everyday visitor-service skills through a personalised selection of short lessons and realistic practice. Measure your improvement from start to finish.',
    format: 'One stage • Self-paced • Approximately 60–90 minutes • No certificate',
    durationLabel: 'Approximately 60–90 minutes',
    formatLabel: 'Self-paced',
    certification: false,
    levels: 1,
    cta: 'Start with Program B',
    illustrative: false,
  },
  C: {
    code: 'C',
    title: 'Destination Storytelling',
    audience: 'Illustrative sample of a possible future Academy offering.',
    summary:
      'Explore a sample future Academy offering focused on clear, engaging destination stories.',
    format: 'Additional sample programme • Overview and reporting preview',
    durationLabel: 'Overview and reporting preview',
    formatLabel: 'Sample overview',
    certification: false,
    levels: 1,
    cta: 'Explore sample programme',
    illustrative: true,
  },
} as const
