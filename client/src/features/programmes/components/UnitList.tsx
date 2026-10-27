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
    <Stagger className="grid gap-5" stagger={0.06}>
      {groups.map((group) => (
        <StaggerItem key={group.key}>
          <section className="grid gap-3 rounded-xl bg-white p-5 ring-1 ring-ink/5 md:p-6">
            <h3 className="font-display text-xl">
              {levels > 1 && group.stage !== 'Onboarding' ? `Level ${group.level}: ` : ''}
              {group.stage}
            </h3>
            <ul className="grid gap-2">
              {group.units.map((unit) => (
                <li
                  key={unit.position}
                  className="grid gap-1 rounded-lg bg-sand p-3.5 sm:grid-cols-[1fr_auto] sm:items-start"
                >
                  <div className="grid gap-0.5">
                    <p className="font-medium text-sm">
                      {unit.courseCode ? (
                        <span className="me-2 text-teal">{unit.courseCode}</span>
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
