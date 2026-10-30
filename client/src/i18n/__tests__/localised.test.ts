import { describe, expect, test } from 'bun:test'
import { COURSES, PROGRAMMES_CONTENT } from '@shared/content/curriculum'
import { AR_CURRICULUM } from '@shared/content/curriculum-ar'
import { PATH_DEFINITIONS } from '@shared/content/paths'
import { localised, registerArabicCopy, tr } from '../localised'

describe('localised()', () => {
  const course = { id: 'c-1', code: 'C01', title: 'Welcoming every visitor', durationMinutes: 3 }

  test('English returns the row unchanged', () => {
    expect(localised(course, 'en')).toBe(course)
  })

  test('Arabic translates text fields and leaves ids, codes and numbers alone', () => {
    const out = localised(
      { ...course, summary: 'Role-play in pairs, feedback, attendance and scored demonstration.' },
      'ar',
    )
    expect(out.title).toBe('الترحيب بكل زائر')
    expect(out.summary).toContain('لعب أدوار')
    expect(out.id).toBe('c-1')
    expect(out.code).toBe('C01')
    expect(out.durationMinutes).toBe(3)
  })

  test('text without an Arabic variant falls back to English; the input is not mutated', () => {
    const row = { title: 'Something new' }
    expect(localised(row, 'ar').title).toBe('Something new')
    expect(localised(course, 'ar')).not.toBe(course)
    expect(course.title).toBe('Welcoming every visitor')
  })

  test('every course and programme text has an Arabic variant', () => {
    for (const c of COURSES) {
      for (const text of [c.title, c.summary, c.formatLabel, c.completionText]) {
        expect(AR_CURRICULUM[text], text).toBeDefined()
      }
    }
    for (const p of Object.values(PROGRAMMES_CONTENT)) {
      for (const text of [p.title, p.audience, p.summary, p.format, p.durationLabel]) {
        expect(AR_CURRICULUM[text], text).toBeDefined()
      }
    }
    for (const def of PATH_DEFINITIONS) {
      for (const text of [def.name, def.description, ...def.items.map((i) => i.title)]) {
        expect(AR_CURRICULUM[text], text).toBeDefined()
      }
    }
  })

  test('service-built sentences are translated through their template', () => {
    expect(tr('Continue: Welcoming every visitor', 'ar')).toBe('تابع: الترحيب بكل زائر')
    expect(tr('Baseline gap: Discover needs', 'ar')).toContain('استكشاف الاحتياجات')
    expect(tr('Continue: Welcoming every visitor', 'en')).toBe('Continue: Welcoming every visitor')
  })

  test('features can register more copy', () => {
    registerArabicCopy({ 'A test line': 'سطر تجريبي' })
    expect(tr('A test line', 'ar')).toBe('سطر تجريبي')
    expect(tr(null, 'ar')).toBeNull()
  })
})
