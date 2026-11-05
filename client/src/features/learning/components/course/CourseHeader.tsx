import { PROGRAMMES_CONTENT } from '@shared/content/curriculum'
import { Award, Clock, Layers, LibraryBig } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eyebrow } from '@/components/brand/Eyebrow'
import { Reveal } from '@/components/motion/Reveal'
import { Progress } from '@/components/ui/progress'
import { tr } from '@/i18n/localised'
import type { Journey, ProgrammeCode } from '../../types'
import { PROGRAMME_IMAGE } from '../../utils/imagery'

const DESCRIPTION_KEY = {
  A: 'learning.page.descriptionA',
  B: 'learning.page.descriptionB',
  C: 'learning.page.descriptionC',
} as const satisfies Record<ProgrammeCode, string>

/**
 * The course card above the player: programme title, description, format chips, the item open
 * now and overall progress (the learning-module course header, in Qatar Tourism styling).
 */
export function CourseHeader({
  journey,
  programme,
  unitCount,
  nowLabel,
  actions,
  headingLevel = 'p',
}: {
  journey: Journey
  programme: ProgrammeCode
  unitCount: number
  nowLabel: string
  /** Extra controls beside the eyebrow, such as the programme switcher. */
  actions?: ReactNode
  /** h1 on My learning, where the course card names the page; p on unit pages. */
  headingLevel?: 'h1' | 'p'
}) {
  const Heading = headingLevel
  const { t, i18n } = useTranslation('learner')
  const content = PROGRAMMES_CONTENT[programme]
  const image = PROGRAMME_IMAGE[programme]
  const percent = journey.enrolment.progressPercent
  const titleId = 'course-header-title'
  return (
    <Reveal className="relative overflow-hidden rounded-xl border border-teal/10 bg-white shadow-sm">
      <section aria-labelledby={titleId}>
        <div
          aria-hidden
          className="qt-star-tile pointer-events-none absolute inset-y-0 end-0 w-1/2 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)] rtl:[mask-image:linear-gradient(to_right,black,transparent)]"
        />
        <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:justify-between md:p-7">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Eyebrow tone="maroon">{t('learning.programme.name', { code: programme })}</Eyebrow>
              {actions}
            </div>
            <Heading
              id={titleId}
              className="font-display text-3xl leading-tight font-light text-ink md:text-4xl"
            >
              {tr(journey.enrolment.programmeTitle, i18n.language)}
            </Heading>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t(DESCRIPTION_KEY[programme])}
            </p>
            <ul className="flex flex-wrap items-center gap-2 text-xs">
              <Chip tone="teal">{tr(content.formatLabel, i18n.language)}</Chip>
              <Chip icon={<LibraryBig aria-hidden className="size-3.5" />}>
                {t('learning.course.units', { n: unitCount })}
              </Chip>
              <Chip icon={<Layers aria-hidden className="size-3.5" />}>
                {content.levels > 1
                  ? t('learning.course.levels', { n: content.levels })
                  : t('learning.course.oneStage')}
              </Chip>
              <Chip icon={<Clock aria-hidden className="size-3.5" />}>
                {tr(content.durationLabel, i18n.language)}
              </Chip>
              {content.certification ? (
                <Chip icon={<Award aria-hidden className="size-3.5" />}>
                  {t('learning.course.certificateTrack')}
                </Chip>
              ) : null}
            </ul>
            <p className="text-sm text-muted-foreground">
              {t('learning.course.now')} <span className="font-medium text-ink">{nowLabel}</span>
            </p>
          </div>
          <img
            src={image.src}
            alt=""
            className="hidden aspect-[16/10] w-56 shrink-0 rounded-lg object-cover shadow-md sm:block lg:w-64"
          />
        </div>
        <div className="relative flex flex-col gap-2 border-t border-border/70 px-5 py-4 md:px-7">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t('learning.course.progress')}</span>
            <span className="font-display text-lg text-teal tabular-nums">{percent}%</span>
          </div>
          <Progress value={percent} aria-label={t('learning.course.progressAria')} />
        </div>
      </section>
    </Reveal>
  )
}

function Chip({
  children,
  icon,
  tone = 'plain',
}: {
  children: ReactNode
  icon?: ReactNode
  tone?: 'plain' | 'teal'
}) {
  return (
    <li
      className={
        tone === 'teal'
          ? 'rounded-full bg-teal-mist px-2.5 py-1 font-medium text-teal-deep'
          : 'inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-2.5 py-1 text-muted-foreground'
      }
    >
      {icon}
      {children}
    </li>
  )
}
