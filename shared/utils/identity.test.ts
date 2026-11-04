import { describe, expect, test } from 'bun:test'
import { demoEmail, uniqueDemoEmail } from './identity'

describe('demoEmail', () => {
  test('first name, a dot, then the rest of the name with no spaces', () => {
    expect(demoEmail('Maha Al Nouri')).toBe('maha.alnouri@example.com')
    expect(demoEmail('Mariam Al Nuaimi')).toBe('mariam.alnuaimi@example.com')
    expect(demoEmail('Daniel Costa')).toBe('daniel.costa@example.com')
  })

  test('drops punctuation and lowercases', () => {
    expect(demoEmail("Rafael D'Sousa-Lima")).toBe('rafael.dsousalima@example.com')
  })
})

describe('uniqueDemoEmail', () => {
  test('adds a number before @ when the address is taken, and records it', () => {
    const used = new Set(['sara.mansour@example.com'])
    expect(uniqueDemoEmail('Sara Mansour', used)).toBe('sara.mansour2@example.com')
    expect(used.has('sara.mansour2@example.com')).toBe(true)
    expect(uniqueDemoEmail('Sara Mansour', used)).toBe('sara.mansour3@example.com')
  })

  test('returns the plain address when it is free', () => {
    const used = new Set<string>()
    expect(uniqueDemoEmail('Omar Al Safi', used)).toBe('omar.alsafi@example.com')
    expect(used.has('omar.alsafi@example.com')).toBe(true)
  })
})
