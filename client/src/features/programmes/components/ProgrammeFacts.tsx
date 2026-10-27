import { Clock, GraduationCap, Layers, Users } from 'lucide-react'
import type { ProgrammeDetail } from '../queries/programmes.queries'
import { CertificationStatus } from './CertificationStatus'

/** At-a-glance strip under the hero: audience, format, duration, levels, certification. */
export function ProgrammeFacts({ programme }: { programme: ProgrammeDetail }) {
  const facts = [
    { icon: Users, label: 'Audience', value: programme.audience },
    { icon: Layers, label: 'Format', value: programme.formatLabel },
    { icon: Clock, label: 'Duration', value: programme.durationLabel },
    {
      icon: GraduationCap,
      label: 'Structure',
      value: programme.levels > 1 ? `${programme.levels} levels with stages` : 'One stage',
    },
  ]
  return (
    <dl className="grid gap-px overflow-hidden rounded-xl bg-ink/5 shadow-black/5 shadow-xl ring-1 ring-ink/5 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map((fact) => (
        <div key={fact.label} className="grid content-start gap-2 bg-white p-5">
          <dt className="inline-flex items-center gap-2 text-muted-foreground text-xs">
            <fact.icon aria-hidden className="size-4 text-teal" />
            {fact.label}
          </dt>
          <dd className="font-medium text-ink">{fact.value}</dd>
        </div>
      ))}
      <div className="grid content-start gap-2 bg-white p-5">
        <dt className="text-muted-foreground text-xs">Certification</dt>
        <dd className="font-medium text-teal-deep">
          <CertificationStatus
            certified={programme.certificationEnabled}
            illustrative={programme.isIllustrative}
          />
        </dd>
      </div>
    </dl>
  )
}
