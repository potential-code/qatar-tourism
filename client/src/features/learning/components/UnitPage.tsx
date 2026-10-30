import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScormPlayer } from '@/features/scorm-player/components/ScormPlayer'
import { XapiPlayer } from '@/features/xapi-player/components/XapiPlayer'
import { localised, tr } from '@/i18n/localised'
import { journeyQuery, unitQuery } from '../queries/learning.queries'
import type { Journey, ProgrammeCode, Unit } from '../types'
import { UNIT_IMAGE } from '../utils/imagery'
import { itemLink } from '../utils/itemLink'
import { LoadError } from './LoadError'
import { BranchingPreview } from './units/BranchingPreview'
import { FormativeQuestions } from './units/FormativeQuestions'
import { PreviewUnit } from './units/PreviewUnit'
import { ResourceUnit } from './units/ResourceUnit'
import { SessionUnit } from './units/SessionUnit'
import { Transcript } from './units/Transcript'
import { VideoPlayer } from './units/VideoPlayer'
import { WithProgramme } from './WithProgramme'

/** The unit player (brief §7–8). */
export function UnitPage({ code }: { code: string }) {
  return (
    <WithProgramme skeleton={<UnitSkeleton />}>
      {(ctx) => <UnitView code={code} programme={ctx.programme} />}
    </WithProgramme>
  )
}

function UnitSkeleton() {
  const { t } = useTranslation('learner')
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label={t('learning.unit.loading')}
    >
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="aspect-video w-full rounded-xl" />
    </div>
  )
}

function UnitView({ code, programme }: { code: string; programme: ProgrammeCode }) {
  const unit = useQuery(unitQuery(programme, code))
  const journey = useQuery(journeyQuery(programme))
  const { t, i18n } = useTranslation('learner')
  if (unit.isLoading) return <UnitSkeleton />
  if (unit.error || !unit.data) {
    return (
      <LoadError
        error={unit.error}
        onRetry={() => void unit.refetch()}
        title={t('learning.error.unitTitle')}
      />
    )
  }
  const data = localised(unit.data, i18n.language)
  const completed = data.progress.status === 'completed'
  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: t('learning.page.title'), to: '/learner/learning' },
          { label: `${data.code} ${data.title}` },
        ]}
      />
      <PhotoPanel
        src={UNIT_IMAGE[data.code] ?? UNIT_IMAGE.C01 ?? ''}
        alt=""
        fade="start"
        className="rounded-xl"
      >
        <div className="flex min-h-48 flex-col justify-end gap-3 p-6 md:min-h-56 md:p-10">
          <p className="text-sm font-medium text-white/80">
            {data.code} · {data.formatLabel}
          </p>
          <h1 className="font-display text-3xl leading-tight font-light text-white md:text-5xl">
            {data.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="size-4" />{' '}
              {t('learning.unit.minutes', { n: data.durationMinutes })}
            </span>
            {completed ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-white">
                <CheckCircle2 aria-hidden className="size-4" /> {t('learning.unit.complete')}
              </span>
            ) : (
              <span>{t('learning.unit.percentComplete', { n: data.progress.percent })}</span>
            )}
          </div>
        </div>
      </PhotoPanel>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <UnitContentView unit={data} programme={programme} completed={completed} />
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border bg-white p-5 shadow-xs">
            <h2 className="mb-2 font-display text-xl font-normal text-ink">
              {t('learning.unit.about')}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('learning.unit.completion')}</dt>
                <dd className="text-ink">{data.completionText}</dd>
              </div>
              {data.package ? (
                <div>
                  <dt className="text-muted-foreground">{t('learning.unit.format')}</dt>
                  <dd className="text-ink">
                    {t('learning.unit.formatValue', {
                      label: tr(data.package.label, i18n.language),
                      version: data.package.version,
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          {journey.data ? <UnitNavigation journey={journey.data} code={code} /> : null}
        </aside>
      </div>
    </div>
  )
}

function UnitContentView({
  unit,
  programme,
  completed,
}: {
  unit: Unit
  programme: ProgrammeCode
  completed: boolean
}) {
  const content = unit.content
  switch (content.kind) {
    case 'video':
      return (
        <>
          <VideoPlayer
            programme={programme}
            courseCode="C01"
            media={content.media}
            title={unit.title}
            watchedPercent={content.watchedPercent}
            positionSeconds={content.positionSeconds}
            completeAt={content.completeAtPercent}
            completed={completed}
          />
          <Transcript text={content.transcript} scenes={content.scenes} />
        </>
      )
    case 'video_questions':
      return (
        <>
          <VideoPlayer
            programme={programme}
            courseCode="C03"
            media={content.media}
            title={unit.title}
            watchedPercent={content.watchedPercent}
            positionSeconds={content.positionSeconds}
            completeAt={null}
            completed={completed}
          />
          <Transcript text={content.transcript} />
          <FormativeQuestions questions={content.questions} programme={programme} />
        </>
      )
    case 'branching':
      return <BranchingPreview content={content} programme={programme} />
    case 'scorm':
      return <ScormPlayer code={unit.code} programme={programme} title={unit.title} />
    case 'xapi':
      return <XapiPlayer code={unit.code} programme={programme} title={unit.title} />
    case 'resource':
      return <ResourceUnit content={content} programme={programme} completed={completed} />
    case 'session':
      return <SessionUnit programme={programme} />
    default:
      return <PreviewUnit content={content} programme={programme} completed={completed} />
  }
}

/** Previous and next steps along the path, plus the way back. */
function UnitNavigation({ journey, code }: { journey: Journey; code: string }) {
  const { t, i18n } = useTranslation('learner')
  const programme = journey.enrolment.programme
  const index = journey.items.findIndex((i) => i.courseCode === code)
  const prev = index > 0 ? journey.items[index - 1] : undefined
  const next = index >= 0 ? journey.items[index + 1] : undefined
  return (
    <nav
      aria-label={t('learning.unit.navAria')}
      className="flex flex-col gap-2 rounded-xl border bg-white p-5 shadow-xs"
    >
      {next ? (
        <Link
          to={itemLink(next, programme).to as never}
          search={itemLink(next, programme).search as never}
          className="group flex items-center justify-between gap-3 rounded-lg p-2 text-sm hover:bg-teal-mist"
        >
          <span>
            <span className="block text-xs text-muted-foreground">{t('learning.unit.next')}</span>
            <span className="font-medium text-ink">{tr(next.title, i18n.language)}</span>
          </span>
          <ArrowRight
            aria-hidden
            className="size-4 text-teal transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          />
        </Link>
      ) : null}
      {prev ? (
        <Link
          to={itemLink(prev, programme).to as never}
          search={itemLink(prev, programme).search as never}
          className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-teal-mist"
        >
          <ArrowLeft aria-hidden className="size-4 text-teal rtl:-scale-x-100" />
          <span>
            <span className="block text-xs text-muted-foreground">
              {t('learning.unit.previous')}
            </span>
            <span className="font-medium text-ink">{tr(prev.title, i18n.language)}</span>
          </span>
        </Link>
      ) : null}
      <Link
        to="/learner/learning"
        search={{ programme }}
        className="mt-1 p-2 text-sm font-medium text-teal hover:underline"
      >
        {t('learning.unit.back')}
      </Link>
    </nav>
  )
}
