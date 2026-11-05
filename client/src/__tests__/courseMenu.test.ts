import { describe, expect, test } from 'bun:test'
import type { Journey } from '@/features/learning/types'
import {
  buildCourseMenu,
  displayStage,
  findUnit,
  flattenMenu,
} from '@/features/learning/utils/courseMenu'

type Item = Journey['items'][number]

function item(over: Partial<Item> & Pick<Item, 'id' | 'kind' | 'stage' | 'level'>): Item {
  return {
    courseCode: null,
    scenarioKey: null,
    title: over.id,
    state: 'available',
    lockReason: null,
    estimatedMinutes: 5,
    required: true,
    ...over,
  } as Item
}

function journey(
  items: Item[],
  extras: Journey['extras'] = [],
  programme: 'A' | 'B' = 'A',
): Journey {
  return { items, extras, enrolment: { programme } } as unknown as Journey
}

/** Program B's path shape (shared/content/paths.ts): the pre-assessment is seeded as Onboarding. */
function programmeB(): Item[] {
  const stage = 'Visitor Service Essentials'
  return [
    item({ id: 'pre', kind: 'assessment_pre', stage: 'Onboarding', level: 1 }),
    item({ id: 'c08', kind: 'course', courseCode: 'C08', stage, level: 1 }),
    item({ id: 'c09', kind: 'course', courseCode: 'C09', stage, level: 1 }),
    item({ id: 'post', kind: 'assessment_post', stage, level: 1 }),
  ]
}

describe('course menu', () => {
  test('groups required items by level and stage in path order', () => {
    const groups = buildCourseMenu(
      journey([
        item({ id: 'pre', kind: 'assessment_pre', stage: 'Onboarding', level: 0 }),
        item({ id: 'c01', kind: 'course', courseCode: 'C01', stage: 'Foundation', level: 1 }),
        item({ id: 'c02', kind: 'course', courseCode: 'C02', stage: 'Foundation', level: 1 }),
        item({ id: 'c05', kind: 'course', courseCode: 'C05', stage: 'Practice', level: 2 }),
      ]),
    )
    expect(groups.map((g) => [g.stage, g.items.map((i) => i.id)])).toEqual([
      ['Onboarding', ['pre']],
      ['Foundation', ['c01', 'c02']],
      ['Practice', ['c05']],
    ])
    expect(groups.every((g) => !g.recommended)).toBe(true)
  })

  test('lists optional items and baseline extras separately, after the required path', () => {
    const groups = buildCourseMenu(
      journey(
        [
          item({ id: 'c01', kind: 'course', courseCode: 'C01', stage: 'S', level: 1 }),
          item({
            id: 'c03',
            kind: 'course',
            courseCode: 'C03',
            stage: 'S',
            level: 1,
            required: false,
          }),
        ],
        [
          { courseCode: 'C04', title: 'Recovery', minutes: 10, state: 'available', percent: 0 },
          { courseCode: 'C01', title: 'Duplicate', minutes: 3, state: 'available', percent: 0 },
        ] as unknown as Journey['extras'],
      ),
    )
    const last = groups.at(-1)
    expect(last?.recommended).toBe(true)
    expect(last?.items.map((i) => i.courseCode)).toEqual(['C03', 'C04'])
    const flat = flattenMenu(groups)
    expect(flat.map((i) => i.courseCode)).toEqual(['C01', 'C03', 'C04'])
    expect(findUnit(flat, 'C04')?.required).toBe(false)
    expect(findUnit(flat, 'C09')).toBeUndefined()
  })

  test('Program A keeps the Onboarding group', () => {
    const items = programmeB()
    const groups = buildCourseMenu(journey(items, [], 'A'))
    expect(groups.map((g) => g.stage)).toEqual(['Onboarding', 'Visitor Service Essentials'])
    expect(displayStage(journey(items, [], 'A'), items[0] as Item)).toBe('Onboarding')
  })

  test('Program B folds the pre-assessment into its single stage, first item', () => {
    const items = programmeB()
    const groups = buildCourseMenu(journey(items, [], 'B'))
    expect(groups.map((g) => [g.stage, g.items.map((i) => i.id)])).toEqual([
      ['Visitor Service Essentials', ['pre', 'c08', 'c09', 'post']],
    ])
    expect(flattenMenu(groups)[0]?.kind).toBe('assessment_pre')
  })

  test('Program B shows the single stage name for the pre-assessment, seed data unchanged', () => {
    const items = programmeB()
    const b = journey(items, [], 'B')
    expect(displayStage(b, items[0] as Item)).toBe('Visitor Service Essentials')
    expect(displayStage(b, items[1] as Item)).toBe('Visitor Service Essentials')
    expect(items[0]?.stage).toBe('Onboarding')
  })

  test('Program B keeps the seeded stage when no other stage exists', () => {
    const only = [item({ id: 'pre', kind: 'assessment_pre', stage: 'Onboarding', level: 1 })]
    expect(displayStage(journey(only, [], 'B'), only[0] as Item)).toBe('Onboarding')
  })
})
