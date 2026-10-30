import { Link } from '@tanstack/react-router'
import { UserRoundPen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/** Shown on the Overview when the learner saved an unfinished profile for later (brief §4). */
export function ProfileReminder() {
  const { t } = useTranslation('learner')
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-teal/20 bg-teal-mist p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <UserRoundPen aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
        <div className="grid gap-0.5">
          <p className="font-medium text-teal-deep">{t('home.profileReminder.title')}</p>
          <p className="text-muted-foreground text-sm">{t('home.profileReminder.body')}</p>
        </div>
      </div>
      <Button asChild>
        <Link to="/onboarding">{t('home.profileReminder.cta')}</Link>
      </Button>
    </div>
  )
}
