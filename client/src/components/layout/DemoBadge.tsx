import { FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Visible "Demo data" indicator required on every data screen (brief §12, §16). */
export function DemoBadge({
  className,
  compact = false,
  tone = 'light',
}: {
  className?: string
  compact?: boolean
  /** `dark` for the deep-teal sidebar ground. */
  tone?: 'light' | 'dark'
}) {
  const { t } = useTranslation('learner')
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        tone === 'dark'
          ? 'border-white/25 bg-white/10 text-white'
          : 'border-maroon/15 bg-maroon-mist text-maroon-deep',
        compact && 'items-center py-1',
        className,
      )}
    >
      <FlaskConical aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {compact ? (
        <span className="font-medium">{t('shell.demoData')}</span>
      ) : (
        <span>
          <span className="font-medium">{t('shell.demoTitle')}</span> {t('shell.demoBody')}
        </span>
      )}
    </div>
  )
}
