import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { OptionalMark } from './Field'

/** An optional on/off preference: icon, label, explanation and a switch, all one tap target. */
export function ToggleRow({
  id,
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  icon: LucideIcon
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const { t } = useTranslation('learner')
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors duration-200 sm:p-5',
        checked ? 'border-teal/30 bg-teal-mist/60' : 'border-ink/8 bg-sand/60',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden
          className={cn('mt-0.5 size-5 shrink-0', checked ? 'text-teal' : 'text-ink/50')}
        />
        <div className="grid gap-1">
          <label htmlFor={id} className="flex flex-wrap items-center gap-2 font-medium text-sm">
            {label}
            <OptionalMark>{t('profile.common.optional')}</OptionalMark>
          </label>
          <p id={`${id}-hint`} className="text-muted-foreground text-sm">
            {hint}
          </p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={`${id}-hint`}
        className="mt-0.5"
      />
    </div>
  )
}
