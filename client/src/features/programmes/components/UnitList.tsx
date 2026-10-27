import { CircleCheck, CircleDashed } from 'lucide-react'
import { Stagger, StaggerItem } from '@/components/motion'
import type { ProgrammeDetail } from '../queries/programmes.queries'
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

/** Units of the programme's default path, grouped by level and stage (brief §3, §6). */
export function UnitList({ units, levels }: { units: Unit[]; levels: number }) {
  const groups = groupByStage(units)
  return (
    <Stagger className="grid" stagger={0.06}>
      {groups.map((group, index) => (
        <StaggerItem key={group.key}>
          <section className="grid gap-5 border-ink/10 border-t py-8 md:grid-cols-[minmax(0,240px)_1fr] md:gap-10">
            <header className="grid content-start gap-1.5">
              <p className="font-medium text-teal text-xs tracking-wide">
                {`Stage ${String(index + 1).padStart(2, '0')}`}
                {levels > 1 && group.stage !== 'Onboarding' ? `, Level ${group.level}` : ''}
              </p>
              <h3 className="font-display font-light text-2xl leading-snug">{group.stage}</h3>
            </header>
            <ul className="grid gap-2.5">
              {group.units.map((unit) => (
                <li
                  key={unit.position}
                  className="grid gap-1 rounded-xl bg-white p-4 ring-1 ring-ink/5 transition-shadow duration-300 hover:shadow-md sm:grid-cols-[1fr_auto] sm:items-start"
                >
                  <div className="grid gap-0.5">
                    <p className="font-medium text-sm">
                      {unit.courseCode ? (
                        <span className="me-2 rounded-full bg-teal-mist px-2 py-0.5 text-teal-deep text-xs">
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
          </section>
        </StaggerItem>
      ))}
    </Stagger>
  )
}
