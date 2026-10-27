import 'i18next'
import type { resources } from './index'

// Typed keys: `t('notes.title')` is checked against the English file at compile time.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: (typeof resources)['en']
  }
}
