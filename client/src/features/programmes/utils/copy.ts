import type { ProgrammeCode } from '@shared/constants'
import { type Translate, tr } from '@/features/public-site/utils/translate'

/** A programme field in the active language: `title`, `summary`, `audience`, `cta` ... */
export const programmeText = (t: Translate, code: ProgrammeCode, field: string) =>
  tr(t, `public:programme.items.${code}.${field}`)

/** "Program A" / "البرنامج أ". */
export const programmeName = (t: Translate, code: ProgrammeCode) =>
  tr(t, `public:programme.name.${code}`)

/** "English and Arabic" / "الإنجليزية والعربية". Unknown languages keep their own name. */
export function languagesText(t: Translate, languages: readonly string[]) {
  const names = languages.map((language) =>
    tr(t, `public:trainer.lang.${language}`, { defaultValue: language }),
  )
  const last = names.at(-1)
  if (names.length < 2 || last === undefined) return names.join('')
  return tr(t, 'public:trainer.join', { a: names.slice(0, -1).join(', '), b: last })
}

/** The programme letter as shown: A, B, C or أ، ب، ج. */
export const programmeLetter = (t: Translate, code: ProgrammeCode) =>
  tr(t, `public:programme.letter.${code}`)
