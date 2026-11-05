import { describe, expect, test } from 'bun:test'
import { LEARNER_NAV, type NavContext } from '../navigation'

const labels = (ctx: NavContext) =>
  LEARNER_NAV.flatMap((s) => s.items)
    .filter((i) => !i.visible || i.visible(ctx))
    .map((i) => i.label)

describe('learner navigation follows the active programme', () => {
  test('Progress sits directly below Overview', () => {
    expect(labels({ programmes: ['B'] }).slice(0, 2)).toEqual(['Overview', 'Progress'])
  })

  test('a learner in A and B sees Certificates only while viewing A', () => {
    expect(labels({ programmes: ['A', 'B'], activeProgramme: 'A' })).toContain('Certificates')
    expect(labels({ programmes: ['A', 'B'], activeProgramme: 'B' })).not.toContain('Certificates')
  })

  test('a B-only learner never sees Certificates; the combined record stays', () => {
    const items = labels({ programmes: ['B'], activeProgramme: 'B' })
    expect(items).not.toContain('Certificates')
    expect(items).toContain('My Learning Record')
  })

  test('My sessions is hidden while viewing B and shown for A', () => {
    expect(labels({ programmes: ['A', 'B'], activeProgramme: 'B' })).not.toContain('My sessions')
    expect(labels({ programmes: ['A', 'B'], activeProgramme: 'A' })).toContain('My sessions')
    expect(labels({ programmes: ['B'] })).not.toContain('My sessions')
  })
})
