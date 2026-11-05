import type { Journey, JourneyItem } from '../types'

/** One entry of the course menu: a path item, or a recommended extra unit shaped like one. */
export type MenuItem = Pick<
  JourneyItem,
  | 'id'
  | 'kind'
  | 'courseCode'
  | 'scenarioKey'
  | 'title'
  | 'state'
  | 'lockReason'
  | 'estimatedMinutes'
  | 'required'
>

export type MenuGroup = {
  key: string
  /** Stage name (seed English, shown through `tr`), or null for the recommended group. */
  stage: string | null
  level: number
  recommended: boolean
  items: MenuItem[]
}

const ONBOARDING = 'Onboarding'

/**
 * The stage name the learner sees for a path item. Program B has one stage (brief §5), so its
 * onboarding pre-assessment opens "Visitor Service Essentials" in the UI. The seed data keeps
 * the "Onboarding" stage name; only the display folds it. Program A keeps Onboarding.
 */
export function displayStage(
  journey: Pick<Journey, 'enrolment' | 'items'>,
  item: Pick<JourneyItem, 'stage'>,
): string {
  if (journey.enrolment.programme !== 'B' || item.stage !== ONBOARDING) return item.stage
  const single = journey.items.find((i) => i.required && i.stage !== ONBOARDING)
  return single?.stage ?? item.stage
}

/** Consecutive path items that share a level and stage, in path order. */
export function groupByStage<T extends Pick<JourneyItem, 'stage' | 'level'>>(
  items: readonly T[],
  stageOf: (item: T) => string = (item) => item.stage,
) {
  const groups: { stage: string; level: number; items: T[] }[] = []
  for (const item of items) {
    const stage = stageOf(item)
    const last = groups.at(-1)
    if (last && last.stage === stage && last.level === item.level) last.items.push(item)
    else groups.push({ stage, level: item.level, items: [item] })
  }
  return groups
}

/**
 * The course menu for a journey (brief §5 step 4): required items grouped by level and stage in
 * path order, then the recommended items (optional path items and baseline extras) separately.
 * Program B shows its single stage only: the pre-assessment is the first item of it.
 */
export function buildCourseMenu(journey: Journey): MenuGroup[] {
  const required = journey.items.filter((i) => i.required)
  const optional = journey.items.filter((i) => !i.required)
  const groups: MenuGroup[] = groupByStage(required, (i) => displayStage(journey, i)).map(
    (group, index) => ({
      key: `stage-${index}`,
      stage: group.stage,
      level: group.level,
      recommended: false,
      items: group.items,
    }),
  )
  const inPath = new Set(journey.items.map((i) => i.courseCode).filter(Boolean))
  const extras: MenuItem[] = journey.extras
    .filter((extra) => !inPath.has(extra.courseCode))
    .map((extra) => ({
      id: `extra-${extra.courseCode}`,
      kind: 'course',
      courseCode: extra.courseCode,
      scenarioKey: null,
      title: extra.title,
      state: extra.state as MenuItem['state'],
      lockReason: null,
      estimatedMinutes: extra.minutes,
      required: false,
    }))
  const recommended = [...optional, ...extras]
  if (recommended.length > 0) {
    groups.push({
      key: 'recommended',
      stage: null,
      level: 0,
      recommended: true,
      items: recommended,
    })
  }
  return groups
}

/** The menu in reading order, for previous and next navigation. */
export function flattenMenu(groups: readonly MenuGroup[]): MenuItem[] {
  return groups.flatMap((g) => g.items)
}

/** The menu entry for a unit code, if the unit is on this learner's path. */
export function findUnit(items: readonly MenuItem[], code: string): MenuItem | undefined {
  return items.find((i) => i.kind === 'course' && i.courseCode === code)
}
