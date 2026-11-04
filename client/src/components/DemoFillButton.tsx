import { Loader2, WandSparkles } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DemoFillButtonProps {
  /** Writes sample answers into the form's state. Never submits: the presenter still does. */
  onFill: () => void | Promise<void>
  className?: string
  disabled?: boolean
}

/**
 * Presenter aid for live walkthroughs: one click fills the form with fictional, valid sample
 * answers. Convention: the first row of the form, aligned to the end (mirrors in RTL).
 */
export function DemoFillButton({ onFill, className, disabled }: DemoFillButtonProps) {
  const { t } = useTranslation('common')
  const hintId = useId()
  const [busy, setBusy] = useState(false)
  const [filled, setFilled] = useState(false)

  async function fill() {
    setBusy(true)
    try {
      await onFill()
      setFilled(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      <span
        id={hintId}
        className="inline-flex items-center rounded-full border border-teal/20 bg-teal-mist px-2 py-0.5 font-medium text-[11px] text-teal-deep"
      >
        {t('demoFill.tag')}
        <span className="sr-only">. {t('demoFill.description')}</span>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void fill()}
        disabled={disabled || busy}
        aria-describedby={hintId}
        data-demo-fill
      >
        {busy ? <Loader2 aria-hidden className="animate-spin" /> : <WandSparkles aria-hidden />}
        {t('demoFill.label')}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {filled ? t('demoFill.filled') : ''}
      </span>
    </div>
  )
}
