import { useTranslation } from 'react-i18next'
import { type Language, SUPPORTED_LANGUAGES, setAppLanguage } from '@/i18n'
import { cn } from '@/lib/utils'

/** Each language names itself in its own script, so a visitor can always find theirs. */
const NATIVE_NAME: Record<Language, string> = { en: 'English', ar: 'العربية' }

/**
 * EN / العربية toggle. Place it in the public header, auth pages and the learner portal header
 * (not the trainer or admin portals, which stay English). The choice is saved and `<html lang
 * dir>` follows. Each button carries its own `lang`, so screen readers pronounce it correctly.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language

  return (
    <fieldset
      className={cn('m-0 inline-flex min-w-0 rounded-full border bg-card p-0.5 text-sm', className)}
    >
      <legend className="sr-only">{t('language.label')}</legend>
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          aria-pressed={current === language}
          onClick={() => void setAppLanguage(language)}
          className={cn(
            'rounded-full px-3 py-1 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            current === language
              ? 'bg-teal-deep text-white'
              : 'text-muted-foreground hover:text-ink',
          )}
        >
          {NATIVE_NAME[language]}
        </button>
      ))}
    </fieldset>
  )
}
