import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Program B has no required sessions (brief §5–6): say so, and why the optional ones help. */
export function ProgrammeBNotice({ onlyB }: { onlyB: boolean }) {
  const { t } = useTranslation('sessions')
  return (
    <aside className="flex gap-4 rounded-xl border bg-card p-5 shadow-xs">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-maroon-mist text-maroon-deep">
        <Compass aria-hidden className="size-5" />
      </span>
      <div className="grid gap-1">
        <h2 className="font-display text-xl font-normal text-ink">{t('bNotice.title')}</h2>
        <p className="max-w-[70ch] text-sm text-ink-soft">
          {onlyB ? t('bNotice.onlyB') : t('bNotice.both')} {t('bNotice.tail')}
        </p>
      </div>
    </aside>
  )
}
