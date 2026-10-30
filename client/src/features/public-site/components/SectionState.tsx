import { AlertCircle, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * Error state for a section that could not load: message plus retry. `what` is the translated
 * noun phrase ("the upcoming sessions"), so the sentence reads naturally in both languages.
 */
export function SectionError({ what, onRetry }: { what: string; onRetry: () => void }) {
  const { t } = useTranslation('public')
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-destructive/20 bg-white p-6 sm:flex-row sm:items-center"
    >
      <AlertCircle aria-hidden className="size-5 shrink-0 text-destructive" />
      <p className="flex-1 text-sm">{t('errors.load', { what })}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw aria-hidden />
        {t('errors.tryAgain')}
      </Button>
    </div>
  )
}
