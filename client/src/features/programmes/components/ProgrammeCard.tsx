import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Clock, Layers, Users } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { ArchFrame } from '@/components/brand'
import { cardHover } from '@/components/motion'
import { cn } from '@/lib/utils'
import { programmeSlug } from '../content'
import type { PublicProgramme } from '../queries/programmes.queries'
import { CertificationStatus } from './CertificationStatus'
import { IllustrativeTag } from './IllustrativeTag'

type Props = {
  programme: PublicProgramme
  /** feature: tall card with the arch accent (one per view); row: image beside text; column: image on top. */
  layout?: 'feature' | 'row' | 'column'
  className?: string
}

/** Rich A/B/C card (brief §2): image, title, audience, format, duration, certification, action. */
export function ProgrammeCard({ programme, layout = 'row', className }: Props) {
  const feature = layout === 'feature'
  const reduce = useReducedMotion()
  const image = (
    <img
      src={programme.cardImagePath ?? '/images/official/city-view.jpg'}
      alt=""
      loading="lazy"
      className="size-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
    />
  )
  return (
    <motion.article
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : 'press'}
      variants={cardHover}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl bg-white ring-1 ring-ink/5',
        layout === 'row' && 'sm:flex-row',
        className,
      )}
    >
      {feature ? (
        <ArchFrame className="mx-5 mt-5 aspect-[5/4] overflow-hidden sm:aspect-[16/9] md:mx-7 md:mt-7 lg:aspect-[4/3]">
          {image}
        </ArchFrame>
      ) : (
        <div
          className={cn(
            'aspect-[16/10] shrink-0 overflow-hidden',
            layout === 'row' && 'sm:aspect-auto sm:w-[42%]',
          )}
        >
          {image}
        </div>
      )}
      <div className={cn('flex flex-1 flex-col gap-4 p-6', feature && 'md:p-8')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm text-teal">Program {programme.code}</span>
          {programme.isIllustrative ? <IllustrativeTag /> : null}
        </div>
        <h3
          className={cn(
            'font-display font-normal text-ink leading-tight',
            feature ? 'text-3xl md:text-4xl' : 'text-2xl',
          )}
        >
          {programme.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{programme.summary}</p>
        <dl className="grid gap-2.5 text-ink/80 text-sm">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Audience</dt>
            <Users aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
            <dd>{programme.audience}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="sr-only">Format</dt>
            <Layers aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
            <dd>{programme.formatLabel}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="sr-only">Duration</dt>
            <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
            <dd>{programme.durationLabel}</dd>
          </div>
          <div className="flex items-start gap-2 text-teal-deep">
            <dt className="sr-only">Certification</dt>
            <dd>
              <CertificationStatus
                certified={programme.certificationEnabled}
                illustrative={programme.isIllustrative}
              />
            </dd>
          </div>
        </dl>
        <Link
          to="/programmes/$code"
          params={{ code: programmeSlug(programme.code) }}
          className="mt-auto inline-flex w-fit items-center gap-3 rounded-full py-1 pe-1 ps-0 font-medium text-sm text-teal-deep after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          View programme
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-teal-mist transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-teal group-hover:text-white">
            <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
          </span>
        </Link>
      </div>
    </motion.article>
  )
}
