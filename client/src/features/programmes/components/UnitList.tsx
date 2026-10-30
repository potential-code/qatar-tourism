import { CircleCheck, CircleDashed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dataText } from '@/features/public-site/utils/translate'
import { cn } from '@/lib/utils'
import type { ProgrammeDetail } from '../queries/programmes.queries'
import { accent } from '../tone'
import { minutesLabel } from '../utils/format'

const KIND_KEY: Record<string, string> = {
  assessment_pre: 'units.kindAssessment',
  assessment_post: 'units.kindAssessment',
  assessment_formative: 'units.kindQuiz',
  ai_practice: 'units.kindAi',
  session: 'units.kindSession',
  assignment: 'units.kindAssignment',
}

/** Seeded English text mapped to its translation key (`data.<group>.<key>` in `public`). */
const UNIT_TITLES: Record<string, string> = {
  'Pre-assessment (baseline)': 'preAssessment',
  'Welcoming every visitor': 'welcoming',
  'Understanding visitor needs': 'needs',
  'Clear and inclusive communication': 'clear',
  'Planning a helpful visitor response': 'plan',
  'AI complaint scenario: Changed booking': 'aiComplaint',
  'Post-assessment': 'postAssessment',
  'AI directions scenario: Unclear directions': 'aiDirections',
  'AI practice: chosen scenario': 'aiChosen',
  'Recovering a difficult service moment': 'recover',
  'Foundation quiz': 'foundationQuiz',
  'AI practice: text or voice': 'aiText',
  'Delivering service in practice': 'delivering',
  'Practical assignment': 'practicalAssignment',
  'Final assessment': 'finalAssessment',
  'Telling a concise destination story': 'story',
}
const STAGES: Record<string, string> = {
  Onboarding: 'onboarding',
  'Visitor Service Essentials': 'vse',
  'Foundation learning': 'foundation',
  'AI practice': 'aiPractice',
  'Practical assignment': 'practical',
  'Trainer-led application': 'trainer',
  'Final assessment': 'final',
  'Sample overview': 'sample',
}
const NOTES: Record<string, string> = { 'Transport scenario': 'transport' }
const FORMATS: Record<string, string> = {
  Video: 'video',
  'Interactive package': 'interactive',
  'Resource and exercise': 'resource',
  'Trainer session': 'trainerSession',
  Preview: 'preview',
}
const COMPLETION: Record<string, string> = {
  'Captioned video plus transcript; complete at 90 percent watched.': 'c01',
  'Three choices, feedback and retry; package reports completion and score.': 'c02',
  'Add three formative questions.': 'c03',
  'Minimum 80 percent on module quiz.': 'c04',
  'B uses a 100–150 word task; A develops it into the practical assignment.': 'c05',
  'Role-play in pairs, feedback, attendance and scored demonstration. A only.': 'c06',
  'No claim of a fully built third programme.': 'c07',
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
  const { t } = useTranslation('public')
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
              <p
                className={cn(
                  'font-medium text-xs uppercase tracking-[0.16em] rtl:tracking-normal',
                  tone.text,
                )}
              >
                {t('units.stage', { n: String(index + 1).padStart(2, '0') })}
                {levels > 1 && group.stage !== 'Onboarding'
                  ? `, ${t('units.level', { n: group.level })}`
                  : ''}
              </p>
              <h3 className="font-display font-light text-2xl leading-snug">
                {dataText(t, 'stage', STAGES, group.stage)}
              </h3>
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
                        <span
                          dir="ltr"
                          className="me-2 inline-block rounded-full bg-white px-2 py-0.5 text-teal-deep text-xs shadow-xs ring-1 ring-teal/15"
                        >
                          {unit.courseCode}
                        </span>
                      ) : null}
                      {dataText(t, 'unit', UNIT_TITLES, unit.title)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {unit.formatLabel
                        ? dataText(t, 'format', FORMATS, unit.formatLabel)
                        : KIND_KEY[unit.kind]
                          ? t(KIND_KEY[unit.kind] as 'units.kindActivity')
                          : t('units.kindActivity')}
                      {unit.durationMinutes ? `, ${minutesLabel(unit.durationMinutes)}` : ''}
                      {unit.note ? `, ${dataText(t, 'note', NOTES, unit.note)}` : ''}
                    </p>
                    {unit.completionText ? (
                      <p className="text-muted-foreground text-xs">
                        {dataText(t, 'completion', COMPLETION, unit.completionText)}
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs">
                    {unit.required ? (
                      <>
                        <CircleCheck aria-hidden className="size-3.5 text-teal" />{' '}
                        {t('units.required')}
                      </>
                    ) : (
                      <>
                        <CircleDashed aria-hidden className="size-3.5 text-muted-foreground" />{' '}
                        {t('units.optional')}
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
