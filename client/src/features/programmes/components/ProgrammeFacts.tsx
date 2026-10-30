import { Award, Clock, GraduationCap, Layers, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ProgrammeDetail } from '../queries/programmes.queries'
import { accent } from '../tone'
import { programmeText } from '../utils/copy'
import { CertificationStatus } from './CertificationStatus'

/**
 * At-a-glance cards overlapping the hero: audience, format, duration, levels, certification.
 * Each fact carries its own accent icon and top rule so the strip reads as a colourful set.
 */
export function ProgrammeFacts({ programme }: { programme: ProgrammeDetail }) {
  const { t } = useTranslation('public')
  const facts = [
    {
      icon: Users,
      label: t('programme.audience'),
      value: programmeText(t, programme.code, 'audience'),
    },
    {
      icon: Layers,
      label: t('programme.format'),
      value: programmeText(t, programme.code, 'formatLabel'),
    },
    {
      icon: Clock,
      label: t('programme.duration'),
      value: programmeText(t, programme.code, 'durationLabel'),
    },
    {
      icon: GraduationCap,
      label: t('programme.structure'),
      value:
        programme.levels > 1
          ? t('programme.levels', { n: programme.levels })
          : t('programme.oneStage'),
    },
  ]
  const card =
    'group qt-card-elevated relative grid content-start gap-3 overflow-hidden rounded-2xl p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 motion-reduce:hover:transform-none'
  const icon =
    'size-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:scale-110'
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map((fact, index) => (
        <div key={fact.label} data-reveal="card" className={card}>
          <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1', accent(index).bar)} />
          <fact.icon aria-hidden className={cn(icon, accent(index).icon)} />
          <dt className="text-muted-foreground text-xs uppercase tracking-[0.14em] rtl:tracking-normal">
            {fact.label}
          </dt>
          <dd className="font-medium text-ink leading-snug">{fact.value}</dd>
        </div>
      ))}
      <div data-reveal="card" className={cn(card, 'bg-grad-teal text-white')}>
        <Award aria-hidden className={cn(icon, 'text-gold-soft')} />
        <dt className="text-white/75 text-xs uppercase tracking-[0.14em] rtl:tracking-normal">
          {t('programme.certification')}
        </dt>
        <dd className="font-medium">
          <CertificationStatus
            certified={programme.certificationEnabled}
            illustrative={programme.isIllustrative}
          />
        </dd>
      </div>
    </dl>
  )
}
