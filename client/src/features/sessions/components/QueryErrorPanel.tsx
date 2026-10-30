import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ApiError } from '@/lib/api-error'

/** Error state for a data view: what went wrong, and a retry (brief §17 resilience). */
export function QueryErrorPanel({
  error,
  onRetry,
  title,
}: {
  error: unknown
  onRetry: () => void
  title?: string
}) {
  const { t } = useTranslation('sessions')
  const message = error instanceof ApiError ? error.message : t('page.connectionError')
  return (
    <div className="rounded-xl border border-destructive/20 bg-card">
      <EmptyState
        icon={AlertTriangle}
        variant="destructive"
        title={title ?? t('page.error')}
        description={message}
        action={
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw aria-hidden /> {t('tryAgain')}
          </Button>
        }
      />
    </div>
  )
}
