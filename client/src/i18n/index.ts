import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import arAssessments from './locales/ar/assessments.json'
import arAuth from './locales/ar/auth.json'
import arCommon from './locales/ar/common.json'
import arContent from './locales/ar/content.json'
import arLearner from './locales/ar/learner.json'
import arPublic from './locales/ar/public.json'
import arRecord from './locales/ar/record.json'
import arSessions from './locales/ar/sessions.json'
import enAssessments from './locales/en/assessments.json'
import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import enContent from './locales/en/content.json'
import enLearner from './locales/en/learner.json'
import enPublic from './locales/en/public.json'
import enRecord from './locales/en/record.json'
import enSessions from './locales/en/sessions.json'

/**
 * English and Arabic (29 Oct update). Public site, auth and the learner portal follow the
 * visitor's chosen language; the trainer and admin portals stay English and left-to-right
 * (`enterForcedLanguage`, used by PortalShell). The chosen language is saved in localStorage
 * (`qta-lang`) and `<html lang dir>` is kept in step by `setAppLanguage`.
 *
 * English is the source shape for typed keys (i18next.d.ts); a unit test keeps the Arabic files'
 * key sets identical to English.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** One namespace per area, so each lane edits its own JSON file. */
export const NAMESPACES = [
  'common',
  'public',
  'auth',
  'learner',
  'record',
  'sessions',
  'assessments',
  'content',
] as const
export type Namespace = (typeof NAMESPACES)[number]

export const LANGUAGE_DIRECTION: Record<Language, 'ltr' | 'rtl'> = { en: 'ltr', ar: 'rtl' }

export const LANGUAGE_STORAGE_KEY = 'qta-lang'

export const resources = {
  en: {
    common: enCommon,
    public: enPublic,
    auth: enAuth,
    learner: enLearner,
    record: enRecord,
    sessions: enSessions,
    assessments: enAssessments,
    content: enContent,
  },
  ar: {
    common: arCommon,
    public: arPublic,
    auth: arAuth,
    learner: arLearner,
    record: arRecord,
    sessions: arSessions,
    assessments: arAssessments,
    content: arContent,
  },
} as const

export const isLanguage = (value: unknown): value is Language =>
  SUPPORTED_LANGUAGES.includes(value as Language)

/** The language saved by `setAppLanguage`, or English. Storage can throw (private mode). */
export function storedLanguage(): Language {
  try {
    const saved = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(saved) ? saved : 'en'
  } catch {
    return 'en'
  }
}

function saveLanguage(language: Language): void {
  try {
    globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Storage unavailable: the choice then lasts for this page load only.
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage(),
  defaultNS: 'common',
  ns: [...NAMESPACES],
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
})

/** Sets `<html lang dir>`. Direction is handled here only; components use `rtl:` variants. */
export function applyDocumentLanguage(language: Language): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.documentElement.dir = LANGUAGE_DIRECTION[language]
}

/** Set while a portal pins the language (trainer and admin: English). */
let forced: Language | null = null

async function show(language: Language): Promise<void> {
  await i18n.changeLanguage(language)
  applyDocumentLanguage(language)
}

/**
 * The visitor's language choice: saved, and shown now unless a portal is pinning the language
 * (then it is applied when that portal is left).
 */
export async function setAppLanguage(language: Language): Promise<void> {
  saveLanguage(language)
  if (forced === null) await show(language)
}

/** Pins the shown language without changing the saved choice (trainer and admin portals). */
export function enterForcedLanguage(language: Language): Promise<void> {
  forced = language
  return show(language)
}

/** Restores the visitor's saved language after a pinned portal. */
export function leaveForcedLanguage(): Promise<void> {
  forced = null
  return show(storedLanguage())
}

/** Applies the saved language to the document at start-up (called from boot). */
export function initDocumentLanguage(): void {
  applyDocumentLanguage(storedLanguage())
}

export default i18n
