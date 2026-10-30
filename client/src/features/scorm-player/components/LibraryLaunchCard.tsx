import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { Info, Play, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export type LaunchFact = { label: string; value: string }

/**
 * The card shown before a Content Library unit runs: current state of the chosen language
 * version, what launching will do, and the launch / restart / return actions.
 */
export function LibraryLaunchCard({
  programme,
  completed,
  canResume,
  facts,
  notes,
  onLaunch,
  onRestart,
  busy = false,
  children,
}: {
  programme: ProgrammeCode
  completed: boolean
  canResume: boolean
  facts: LaunchFact[]
  /** Plain-text notes: credit counted once, sibling progress, captions. */
  notes: string[]
  onLaunch: () => void
  onRestart: () => void
  busy?: boolean
  children?: ReactNode
}) {
  const { t } = useTranslation('content')
  return (
    <div className="grid gap-6 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:p-8">
      <div className="flex min-w-0 flex-col gap-4">
        <h2 className="font-display text-2xl font-normal text-ink">
          {completed ? t('player.complete') : canResume ? t('player.continue') : t('player.ready')}
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium text-ink capitalize">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {notes.map((note) => (
          <p key={note} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
            {note}
          </p>
        ))}
        {children}
      </div>
      <div className="flex flex-wrap gap-3 md:flex-col">
        <Button size="lg" onClick={onLaunch} disabled={busy}>
          <Play aria-hidden className="rtl:-scale-x-100" />{' '}
          {canResume ? t('player.resume') : completed ? t('player.openAgain') : t('player.launch')}
        </Button>
        {canResume || completed ? (
          <Button size="lg" variant="outline" onClick={onRestart} disabled={busy}>
            <RotateCcw aria-hidden /> {t('player.restart')}
          </Button>
        ) : null}
        <Button asChild size="lg" variant="ghost">
          <Link to="/learner/learning" search={{ programme }}>
            {t('player.returnPath')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
