import { describe, expect, test } from 'bun:test'
import { safeRedirect } from '@/lib/safe-redirect'

describe('safeRedirect', () => {
  test('keeps same-origin paths', () => {
    expect(safeRedirect('/notes?page=2')).toBe('/notes?page=2')
  })

  test.each([
    undefined,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
  ])('falls back for %p', (target) => {
    expect(safeRedirect(target)).toBe('/')
  })
})
