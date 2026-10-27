import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'

/** Router-wide error boundary. Shows the API's message for API errors, a generic one otherwise. */
export function RouteError({ error }: ErrorComponentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const queryErrorResetBoundary = useQueryErrorResetBoundary()

  useEffect(() => {
    queryErrorResetBoundary.reset()
  }, [queryErrorResetBoundary])

  const message = error instanceof ApiError ? error.message : t('errors.generic')

  return (
    <div role="alert" className="mx-auto grid max-w-md gap-4 p-8 text-center">
      <h1 className="font-semibold text-xl">{t('errors.title')}</h1>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex justify-center gap-2">
        <Button onClick={() => void router.invalidate()}>{t('common.retry')}</Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard">{t('common.goToDashboard')}</Link>
        </Button>
      </div>
    </div>
  )
}

export function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto grid max-w-md gap-4 p-8 text-center">
      <h1 className="font-semibold text-xl">{t('errors.notFoundTitle')}</h1>
      <p className="text-muted-foreground">{t('errors.notFoundBody')}</p>
      <div>
        <Button asChild>
          <Link to="/dashboard">{t('common.goToDashboard')}</Link>
        </Button>
      </div>
    </div>
  )
}
