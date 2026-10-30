import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ApiError } from '@/lib/api-error'

/** Error state with the API's message and a retry (CONVENTIONS: every data view has one). */
export function LoadError({
  error,
  onRetry,
  title,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  const { t } = useTranslation('learner')
  const message = error instanceof ApiError ? error.message : t('learning.error.generic')
  return (
    <div role="alert" className="rounded-xl border border-destructive/20 bg-white">
      <EmptyState
        icon={TriangleAlert}
        variant="destructive"
        title={title ?? t('learning.error.title')}
        description={message}
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw aria-hidden /> {t('learning.error.retry')}
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
