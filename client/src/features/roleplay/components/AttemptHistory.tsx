import { Link } from '@tanstack/react-router'
import { History, Keyboard, Mic } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/empty-state'
import { tr } from '@/i18n/localised'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import type { AttemptView } from '../types'
import { scoreBand } from '../utils/labels'

interface AttemptHistoryProps {
  attempts: AttemptView[]
  bestId?: string | null
  latestId?: string | null
  /** Highlights the attempt being viewed. */
  currentId?: string
  showScenario?: boolean
}

/** Attempt list with best and latest marked separately (brief §9). */
export function AttemptHistory({
  attempts,
  bestId,
  latestId,
  currentId,
  showScenario = true,
}: AttemptHistoryProps) {
  const { t, i18n } = useTranslation('learner')
  if (attempts.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={History}
        title={t('roleplay.history.emptyTitle')}
        description={t('roleplay.history.emptyDescription')}
      />
    )
  }
  return (
    <ol className="grid gap-2">
      {attempts.map((attempt) => {
        const band = scoreBand(attempt.totalPercent)
        const ModeIcon = attempt.mode === 'voice' ? Mic : Keyboard
        return (
          <li key={attempt.id}>
            <Link
              to="/learner/practice/attempts/$attemptId"
              params={{ attemptId: attempt.id }}
              className={cn(
                'flex items-center gap-4 rounded-lg border bg-white px-4 py-3 transition-colors hover:border-teal/40 hover:bg-teal-mist/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                attempt.id === currentId && 'border-teal/50 bg-teal-mist/40',
              )}
            >
              <span className="w-14 shrink-0 font-display text-2xl tabular-nums text-ink">
                {attempt.totalPercent}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium text-ink">
                  {showScenario
                    ? tr(attempt.scenarioTitle, i18n.language)
                    : t('roleplay.history.attemptWord', { band: t(`roleplay.bands.${band.key}`) })}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ModeIcon aria-hidden className="size-3" />
                  {attempt.mode === 'voice' ? t('roleplay.modes.voice') : t('roleplay.modes.text')},{' '}
                  {qatarDateTime(attempt.completedAt)}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {attempt.id === bestId ? (
                  <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-medium text-white">
                    {t('roleplay.history.best')}
                  </span>
                ) : null}
                {attempt.id === latestId ? (
                  <span className="rounded-full border border-teal/30 px-2 py-0.5 text-[11px] font-medium text-teal-deep">
                    {t('roleplay.history.latest')}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
