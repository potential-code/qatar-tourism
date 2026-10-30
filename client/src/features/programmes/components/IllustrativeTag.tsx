import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Marks Program C as an illustrative sample everywhere it appears (brief §3). */
export function IllustrativeTag({ className }: { className?: string }) {
  const { t } = useTranslation('public')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-maroon/20 bg-maroon-mist px-2.5 py-0.5 font-medium text-maroon-deep text-xs',
        className,
      )}
    >
      <Info aria-hidden className="size-3.5" />
      {t('programme.illustrative')}
    </span>
  )
}
