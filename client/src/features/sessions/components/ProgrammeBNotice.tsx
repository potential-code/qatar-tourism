import { Compass } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Program B has no required sessions (brief §5–6): say so, and why the optional ones help.
 * `standalone` is the whole page while Program B is active, where no catalogue follows, so the
 * copy points to Program A instead of the clinics below.
 */
export function ProgrammeBNotice({
  onlyB,
  standalone = false,
  action,
}: {
  onlyB: boolean
  standalone?: boolean
  action?: ReactNode
}) {
  const { t } = useTranslation('sessions')
  const Heading = standalone ? 'h1' : 'h2'
  return (
    <aside className="flex gap-4 rounded-xl border bg-card p-5 shadow-xs md:p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-maroon-mist text-maroon-deep">
        <Compass aria-hidden className="size-5" />
      </span>
      <div className="grid gap-3">
        <div className="grid gap-1">
          <Heading
            className={
              standalone
                ? 'font-display text-2xl font-light text-ink md:text-3xl'
                : 'font-display text-xl font-normal text-ink'
            }
          >
            {t('bNotice.title')}
          </Heading>
          <p className="max-w-[70ch] text-sm text-ink-soft">
            {onlyB ? t('bNotice.onlyB') : t('bNotice.both')}{' '}
            {standalone ? t('bNotice.tailStandalone') : t('bNotice.tail')}
          </p>
        </div>
        {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </aside>
  )
}
