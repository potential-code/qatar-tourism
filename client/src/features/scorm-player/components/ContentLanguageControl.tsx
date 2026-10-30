import { Languages } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'
import type { ContentLanguagePreference } from '../hooks/useContentLanguage'

/**
 * The content-language control: "Use my portal language" (default), English, العربية. It
 * chooses the language of the lesson only; the portal keeps its own language control.
 */
export function ContentLanguageControl({
  value,
  onChange,
  portal,
  disabled = false,
  className,
}: {
  value: ContentLanguagePreference
  onChange: (value: ContentLanguagePreference) => void
  /** The portal's current language, shown as a hint under the control. */
  portal: 'en' | 'ar'
  disabled?: boolean
  className?: string
}) {
  const { t } = useTranslation('content')
  const labelId = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p id={labelId} className="flex items-center gap-1.5 text-sm font-medium text-ink">
        <Languages aria-hidden className="size-4 text-teal" /> {t('language.label')}
      </p>
      <SegmentedControl
        aria-labelledby={labelId}
        value={value}
        disabled={disabled}
        onValueChange={(next) => onChange(next as ContentLanguagePreference)}
        className="h-auto w-full flex-wrap sm:w-fit"
      >
        <SegmentedControlItem value="portal">{t('language.portal')}</SegmentedControlItem>
        <SegmentedControlItem value="en" lang="en">
          {t('language.en')}
        </SegmentedControlItem>
        <SegmentedControlItem value="ar" lang="ar">
          {t('language.ar')}
        </SegmentedControlItem>
      </SegmentedControl>
      <p className="text-xs text-muted-foreground">
        {t('language.help')} {t('language.portalIs', { language: t(`language.${portal}`) })}
      </p>
    </div>
  )
}
