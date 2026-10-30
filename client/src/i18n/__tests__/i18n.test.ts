import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import i18n, {
  enterForcedLanguage,
  LANGUAGE_STORAGE_KEY,
  leaveForcedLanguage,
  NAMESPACES,
  resources,
  setAppLanguage,
  storedLanguage,
} from '../index'
import { portalLanguage } from '../usePortalLanguage'

/** Dotted key paths of a nested JSON object. */
function keysOf(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) =>
    keysOf(inner, prefix ? `${prefix}.${key}` : key),
  )
}

describe('translation files', () => {
  for (const namespace of NAMESPACES) {
    test(`ar/${namespace}.json has exactly the keys of en/${namespace}.json`, () => {
      expect(keysOf(resources.ar[namespace]).sort()).toEqual(keysOf(resources.en[namespace]).sort())
    })

    test(`ar/${namespace}.json has no empty values`, () => {
      const empty = keysOf(resources.ar[namespace]).filter((key) => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)[part],
            resources.ar[namespace],
          )
        return typeof value === 'string' && value.trim() === ''
      })
      expect(empty).toEqual([])
    })
  }

  test('interpolation placeholders match between English and Arabic', () => {
    const placeholders = (text: string) => (text.match(/{{\w+}}/g) ?? []).sort()
    const flat = (tree: unknown, key: string) =>
      key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], tree)
    for (const namespace of NAMESPACES) {
      for (const key of keysOf(resources.en[namespace])) {
        const en = flat(resources.en[namespace], key)
        const ar = flat(resources.ar[namespace], key)
        if (typeof en === 'string' && typeof ar === 'string') {
          expect(placeholders(ar)).toEqual(placeholders(en))
        }
      }
    }
  })
})

describe('language switching', () => {
  beforeEach(async () => {
    localStorage.clear()
    await leaveForcedLanguage()
    await setAppLanguage('en')
  })
  afterEach(async () => {
    localStorage.clear()
    await leaveForcedLanguage()
  })

  test('defaults to English, left to right', () => {
    expect(storedLanguage()).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
  })

  test('Arabic sets lang and dir on <html>, translates, and is remembered', async () => {
    await setAppLanguage('ar')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(i18n.t('language.label')).toBe(resources.ar.common.language.label)
    expect(i18n.t('brand.name', { ns: 'public' })).toBe(resources.ar.public.brand.name)
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar')
    expect(storedLanguage()).toBe('ar')
  })

  test('switching back restores English and LTR', async () => {
    await setAppLanguage('ar')
    await setAppLanguage('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  test('an unknown saved value falls back to English', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')
    expect(storedLanguage()).toBe('en')
  })

  test('storage that throws never breaks switching', async () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
    try {
      await setAppLanguage('ar')
      expect(document.documentElement.dir).toBe('rtl')
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('portal language scoping', () => {
  beforeEach(async () => {
    localStorage.clear()
    await leaveForcedLanguage()
    await setAppLanguage('ar')
  })
  afterEach(async () => {
    localStorage.clear()
    await leaveForcedLanguage()
    await setAppLanguage('en')
  })

  test('only trainer and admin portals pin English', () => {
    expect(portalLanguage('learner')).toBeNull()
    expect(portalLanguage('trainer')).toBe('en')
    expect(portalLanguage('admin')).toBe('en')
  })

  test('a pinned portal shows English LTR, keeps the saved choice, and restores it on leaving', async () => {
    await enterForcedLanguage('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(storedLanguage()).toBe('ar')

    await leaveForcedLanguage()
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })

  test('a choice made while pinned is saved but not shown until the portal is left', async () => {
    await setAppLanguage('en')
    await enterForcedLanguage('en')
    await setAppLanguage('ar')
    expect(document.documentElement.dir).toBe('ltr')
    expect(storedLanguage()).toBe('ar')
    await leaveForcedLanguage()
    expect(document.documentElement.dir).toBe('rtl')
  })
})
