import { Award, CircleSlash, Sparkle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Certification status as icon plus text, never colour alone (brief §18). */
export function CertificationStatus({
  certified,
  illustrative,
  className,
}: {
  certified: boolean
  illustrative?: boolean
  className?: string
}) {
  const { t } = useTranslation('public')
  const [Icon, label] = illustrative
    ? [Sparkle, t('programme.sampleNoCertificate')]
    : certified
      ? [Award, t('programme.certified')]
      : [CircleSlash, t('programme.noCertificate')]
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </span>
  )
}
