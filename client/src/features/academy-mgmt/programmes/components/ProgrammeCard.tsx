import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { Award, BadgeX, Pencil } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cardHover } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProgrammeSummary } from '../types'
import { STATUS_LABEL } from '../utils/labels'

/** A programme with its reach, status and certification state, all counted from the database. */
export function ProgrammeCard({
  programme,
  onOpen,
}: {
  programme: ProgrammeSummary
  onOpen: () => void
}) {
  const reduce = useReducedMotion()
  const rate = programme.enrolments
    ? Math.round((programme.completed / programme.enrolments) * 100)
    : 0
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : 'press'}
      variants={cardHover}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Edit ${PROGRAMME_LABELS[programme.code]}: ${programme.title}`}
    >
      <div className="relative aspect-[16/8] overflow-hidden bg-teal-mist">
        {programme.cardImagePath ? (
          <img
            src={programme.cardImagePath}
            alt=""
            className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-2 text-white">
          <span className="font-display text-4xl leading-none font-light">{programme.code}</span>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-md',
              programme.status === 'published'
                ? 'bg-white/90 text-teal-deep'
                : 'bg-white/25 text-white',
            )}
          >
            {STATUS_LABEL[programme.status]}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="grid gap-1">
          <p className="text-xs text-muted-foreground">
            {programme.formatLabel}, {programme.levels}{' '}
            {programme.levels === 1 ? 'level' : 'levels'}
            {programme.isIllustrative ? ', illustrative sample' : ''}
          </p>
          <h2 className="font-display text-2xl leading-snug text-ink">{programme.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {programme.certificationEnabled ? (
            <Badge className="gap-1 border-teal/20 bg-teal-mist text-teal-deep">
              <Award aria-hidden className="size-3" /> Certification on
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <BadgeX aria-hidden className="size-3" /> No certificate
            </Badge>
          )}
          <Badge variant="outline">{programme.enrolmentMode.label}</Badge>
        </div>
        <dl className="mt-auto grid grid-cols-4 gap-2 border-t pt-4">
          {(
            [
              ['Enrolments', programme.enrolments.toLocaleString('en-GB')],
              ['Completed', `${rate}%`],
              ['Paths', String(programme.paths)],
              [
                'Certificates',
                programme.canCertify ? programme.certificates.toLocaleString('en-GB') : 'None',
              ],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="grid gap-0.5">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="font-display text-xl tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal">
          <Pencil aria-hidden className="size-3.5" /> Edit and preview
        </span>
      </div>
    </motion.button>
  )
}
