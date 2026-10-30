/**
 * Any i18next `t` (from `useTranslation('public')`, `('auth')` ...). Typed keys cannot follow
 * template strings, so run-time keys go through `tr`, the one place the cast lives; the
 * key-parity test still guarantees both languages define every key.
 */
export type Translate = (key: never, options?: never) => unknown

export function tr(t: Translate, key: string, options?: Record<string, unknown>): string {
  return String(t(key as never, options as never))
}

/**
 * Seeded data (unit titles, stage names, course formats) arrives in English from the mock
 * services. Where a translation exists for it the lookup returns that; anything unknown keeps
 * its English text, so new seed rows never show an empty label.
 */
export function dataText(
  t: Translate,
  group: string,
  lookup: Record<string, string>,
  english: string,
): string {
  const key = lookup[english]
  return key ? tr(t, `public:data.${group}.${key}`, { defaultValue: english }) : english
}
