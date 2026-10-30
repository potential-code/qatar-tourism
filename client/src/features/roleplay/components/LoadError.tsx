import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/** Error state with a retry, for any practice view that failed to load. */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  const { t } = useTranslation('learner')
  return (
    <EmptyState
      className="rounded-xl border bg-card"
      variant="destructive"
      icon={AlertCircle}
      title={t('roleplay.loadError.title', { what })}
      description={t('roleplay.loadError.description')}
      action={<Button onClick={onRetry}>{t('roleplay.loadError.retry')}</Button>}
    />
  )
}
