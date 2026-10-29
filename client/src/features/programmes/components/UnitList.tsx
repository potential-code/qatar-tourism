import { CircleCheck, CircleDashed } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProgrammeDetail } from '../queries/programmes.queries'
import { accent } from '../tone'
import { minutesLabel } from '../utils/format'

const KIND_LABEL: Record<string, string> = {
  assessment_pre: 'Assessment',
  assessment_post: 'Assessment',
  assessment_formative: 'Quiz',
  ai_practice: 'AI practice',
  session: 'Trainer session',
  assignment: 'Assignment',
}

type Unit = ProgrammeDetail['units'][number]

function groupByStage(units: Unit[]) {
  const groups: { key: string; level: number; stage: string; units: Unit[] }[] = []
  for (const unit of units) {
    const key = `${unit.level}:${unit.stage}`
    const group = groups.find((g) => g.key === key)
    if (group) group.units.push(unit)
    else groups.push({ key, level: unit.level, stage: unit.stage, units: [unit] })
  }
  return groups
}

/**
 * Units of the programme's default path, grouped by level and stage (brief §3, §6), as a
 * timeline: each stage gets an accent node on the rail, its units sit on raised cards.
 */
export function UnitList({ units, levels }: { units: Unit[]; levels: number }) {
  const groups = groupByStage(units)
  return (
    <ol className="relative grid gap-6 before:absolute before:inset-y-6 before:start-[1.2rem] before:w-px before:bg-gradient-to-b before:from-teal before:via-sky before:to-gold md:before:start-[1.45rem]">
      {groups.map((group, index) => {
        const tone = accent(index)
        return (
          <li
            key={group.key}
            data-reveal="card"
            className="relative grid gap-5 ps-14 md:grid-cols-[minmax(0,260px)_1fr] md:gap-10 md:ps-16"
          >
            <span
              aria-hidden
              className={cn(
                'absolute start-0 top-1 inline-flex size-10 items-center justify-center rounded-full font-display text-base shadow-md ring-4 ring-sand md:size-12 md:text-lg',
                tone.chip,
              )}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <header className="grid content-start gap-1.5 self-start pt-1 md:sticky md:top-28">
              <p className={cn('font-medium text-xs uppercase tracking-[0.16em]', tone.text)}>
                {`Stage ${String(index + 1).padStart(2, '0')}`}
                {levels > 1 && group.stage !== 'Onboarding' ? `, Level ${group.level}` : ''}
              </p>
              <h3 className="font-display font-light text-2xl leading-snug">{group.stage}</h3>
            </header>
            <ul className="grid gap-3">
              {group.units.map((unit) => (
                <li
                  key={unit.position}
                  className={cn(
                    'group relative grid gap-1 overflow-hidden rounded-2xl bg-gradient-to-br via-white to-white p-4 ps-5 shadow-card ring-1 ring-ink/5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 sm:grid-cols-[1fr_auto] sm:items-start motion-reduce:hover:transform-none',
                    tone.mist,
                  )}
                >
                  <span aria-hidden className={cn('absolute inset-y-0 start-0 w-1', tone.bar)} />
                  <div className="grid gap-0.5">
                    <p className="font-medium text-sm">
                      {unit.courseCode ? (
                        <span className="me-2 rounded-full bg-white px-2 py-0.5 text-teal-deep text-xs shadow-xs ring-1 ring-teal/15">
                          {unit.courseCode}
                        </span>
                      ) : null}
                      {unit.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {unit.formatLabel ?? KIND_LABEL[unit.kind] ?? 'Activity'}
                      {unit.durationMinutes ? `, ${minutesLabel(unit.durationMinutes)}` : ''}
                      {unit.note ? `, ${unit.note}` : ''}
                    </p>
                    {unit.completionText ? (
                      <p className="text-muted-foreground text-xs">{unit.completionText}</p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs">
                    {unit.required ? (
                      <>
                        <CircleCheck aria-hidden className="size-3.5 text-teal" /> Required
                      </>
                    ) : (
                      <>
                        <CircleDashed aria-hidden className="size-3.5 text-muted-foreground" />{' '}
                        Optional
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ol>
  )
}
