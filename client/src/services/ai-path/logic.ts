import type { Competency, JobFunction, ProgrammeCode } from '@shared/constants'
import { COMPETENCIES } from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content/assessments'
import { COURSE_BY_CODE } from '@shared/content/curriculum'

/**
 * Scripted "AI" path recommendation (brief §9), labelled Demo mode in the UI. Deterministic:
 * the same profile, baseline and approved path always give the same answer. It only ever
 * recommends courses from the approved catalogue for the learner's programme, never changes
 * the required units of the approved path, and never moves a unit across a level gate.
 */

/** Approved content mapping: which course strengthens which competency. */
export const COMPETENCY_COURSE: Record<Competency, string> = {
  discover_needs: 'C02',
  verify_information: 'C05',
  communicate_clearly: 'C03',
  recover_service: 'C04',
  protect_information: 'C05',
}

const STRENGTH_PHRASE: Record<Competency, string> = {
  discover_needs: 'needs discovery',
  verify_information: 'information checking',
  communicate_clearly: 'visitor communication',
  recover_service: 'service recovery',
  protect_information: 'information protection',
}

const ROLE_PHRASE: Partial<Record<JobFunction, string>> = {
  guest_services: 'guest-services',
  front_office: 'front-office',
  guiding: 'guiding',
  transport: 'transport',
  sales: 'sales',
  operations: 'operations',
  training: 'training',
  management: 'management',
}

/** The course a role benefits from most, from the approved catalogue. */
const ROLE_COURSE: Partial<Record<JobFunction, string>> = {
  guest_services: 'C03',
  front_office: 'C03',
  guiding: 'C03',
  transport: 'C03',
  sales: 'C02',
  operations: 'C04',
  training: 'C05',
  management: 'C04',
}

export type PathItemLite = {
  kind: string
  courseCode: string | null
  required: boolean
  level: number
  title: string
  estimatedMinutes: number
}

export type RecommendationInput = {
  programme: ProgrammeCode
  jobFunction: JobFunction | null
  baseline: Partial<Record<Competency, number>> | null
  pathItems: readonly PathItemLite[]
}

export type Recommendation = {
  strengths: Competency[]
  gaps: Competency[]
  focusCourses: string[]
  extras: { courseCode: string; title: string; reason: string; minutes: number; level: number }[]
  rationale: string
  requiredMinutes: number
  extraMinutes: number
}

const title = (code: string) => COURSE_BY_CODE[code]?.title ?? code

function joinTitles(codes: string[]): string {
  const titles = codes.map(title)
  if (titles.length <= 1) return titles.join('')
  return `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)}`
}

export function recommend(input: RecommendationInput): Recommendation {
  const scores = input.baseline ?? {}
  const scored = COMPETENCIES.filter((c) => scores[c] !== undefined)
  // Ties keep the competency order of the bank, so the output is stable.
  const gaps = scored.filter((c) => (scores[c] ?? 0) === 0)
  const strengths = scored.filter((c) => (scores[c] ?? 0) > 0)

  const inProgramme = (code: string) =>
    COURSE_BY_CODE[code]?.programmes.includes(input.programme) ?? false
  const pathCourses = new Set(
    input.pathItems.filter((i) => i.courseCode).map((i) => i.courseCode as string),
  )

  // Courses that address the lowest baseline areas, in competency order, without repeats.
  const focusCourses: string[] = []
  for (const gap of gaps) {
    const code = COMPETENCY_COURSE[gap]
    if (inProgramme(code) && !focusCourses.includes(code)) focusCourses.push(code)
  }

  // Extras: focus courses the approved path does not already include. They stay recommended,
  // never required, and sit in Level 1 so no prerequisite is bypassed.
  const extras = focusCourses
    .filter((code) => !pathCourses.has(code))
    .map((code) => {
      const gap = gaps.find((g) => COMPETENCY_COURSE[g] === code) as Competency
      return {
        courseCode: code,
        title: title(code),
        reason: `Baseline gap: ${COMPETENCY_LABELS[gap]}`,
        minutes: COURSE_BY_CODE[code]?.durationMinutes ?? 10,
        level: 1,
      }
    })

  const sentences: string[] = []
  const lead = strengths.find((c) => c === 'communicate_clearly') ?? strengths[0]
  if (lead) sentences.push(`Your ${STRENGTH_PHRASE[lead]} skills are strong.`)
  const firstTwo = focusCourses.slice(0, 2)
  if (firstTwo.length > 0) {
    sentences.push(
      `We recommend starting with ${joinTitles(firstTwo)} because ${
        firstTwo.length > 1
          ? 'these were your lowest baseline areas'
          : 'this was your lowest baseline area'
      }.`,
    )
  } else if (scored.length > 0) {
    sentences.push('Your baseline shows no gaps, so we recommend the standard order of your path.')
  } else {
    sentences.push(
      'Complete your baseline assessment so the recommendation can reflect your starting point.',
    )
  }
  const roleCourse = input.jobFunction ? ROLE_COURSE[input.jobFunction] : undefined
  const rolePhrase = input.jobFunction ? ROLE_PHRASE[input.jobFunction] : undefined
  if (roleCourse && rolePhrase && inProgramme(roleCourse) && !firstTwo.includes(roleCourse)) {
    sentences.push(`Your ${rolePhrase} role also benefits from ${title(roleCourse)}.`)
  }

  const requiredMinutes = input.pathItems
    .filter((i) => i.required)
    .reduce((sum, i) => sum + i.estimatedMinutes, 0)
  const extraMinutes = extras.reduce((sum, e) => sum + e.minutes, 0)

  return {
    strengths,
    gaps,
    focusCourses,
    extras,
    rationale: sentences.join(' '),
    requiredMinutes,
    extraMinutes,
  }
}
