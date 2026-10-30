import 'i18next'
import type { resources } from './index'

// Typed keys: `t('notes.title')` is checked against the English files at compile time. Namespaces:
// common (default), public, auth, learner. Use `useTranslation('public')` for the others.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: (typeof resources)['en']
  }
}
