import type { ContentLanguage } from '@shared/constants'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The content-language control is separate from the portal language. "portal" (the default)
 * follows the portal; "en" and "ar" pin the lesson to one language whatever the portal shows.
 * The choice is a per-viewer convenience kept in localStorage (guarded: storage can throw).
 */
export type ContentLanguagePreference = 'portal' | ContentLanguage

export const CONTENT_LANGUAGE_KEY = 'qta-content-language'

const isPreference = (value: unknown): value is ContentLanguagePreference =>
  value === 'portal' || value === 'en' || value === 'ar'

export function readContentLanguagePreference(): ContentLanguagePreference {
  try {
    const saved = globalThis.localStorage?.getItem(CONTENT_LANGUAGE_KEY)
    return isPreference(saved) ? saved : 'portal'
  } catch {
    return 'portal'
  }
}

function writeContentLanguagePreference(value: ContentLanguagePreference) {
  try {
    globalThis.localStorage?.setItem(CONTENT_LANGUAGE_KEY, value)
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

/** The language a preference resolves to, given the portal's current language. */
export const resolveContentLanguage = (
  preference: ContentLanguagePreference,
  portal: string,
): ContentLanguage => (preference === 'portal' ? (portal === 'ar' ? 'ar' : 'en') : preference)

export function useContentLanguage() {
  const { i18n } = useTranslation()
  const [preference, setPreferenceState] = useState<ContentLanguagePreference>(
    readContentLanguagePreference,
  )
  const setPreference = useCallback((value: ContentLanguagePreference) => {
    writeContentLanguagePreference(value)
    setPreferenceState(value)
  }, [])
  const portal: ContentLanguage = i18n.language === 'ar' ? 'ar' : 'en'
  return {
    preference,
    setPreference,
    portal,
    /** What the lesson should be shown in right now. */
    language: resolveContentLanguage(preference, portal),
  }
}
