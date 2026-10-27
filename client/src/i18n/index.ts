import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'

// English only for the demo. Layouts use logical (start/end) spacing so Arabic can be added later.
export const SUPPORTED_LANGUAGES = ['en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const resources = {
  en: { common: enCommon },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
}

export default i18n
