import { COURSES } from '@shared/content'
import { Captions, PlayCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { minutesLabel } from '@/features/programmes/utils/format'
import { dataText } from '../../utils/translate'

const SAMPLE = COURSES.filter((course) => ['C01', 'C02', 'C03', 'C05'].includes(course.code))

/** Course titles and formats (seed data, English) with their translations. */
const COURSE_TITLES: Record<string, string> = {
  'Welcoming every visitor': 'welcoming',
  'Understanding visitor needs': 'needs',
  'Clear and inclusive communication': 'clear',
  'Planning a helpful visitor response': 'plan',
}
const FORMATS: Record<string, string> = {
  Video: 'video',
  'Interactive package': 'interactive',
  'Resource and exercise': 'resource',
  'Trainer session': 'trainerSession',
  Preview: 'preview',
}

/** Cut at the last whole word before `max` characters. */
function excerpt(text: string, max: number) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 0))
}

/** Learn at your pace: the C01 lesson and transcript, plus the unit formats (brief §7). */
export function PacePreview() {
  const { t } = useTranslation('public')
  return (
    <div className="grid gap-5">
      <figure className="grid gap-3 rounded-xl bg-white p-5 ring-1 ring-ink/5">
        <div className="relative aspect-video overflow-hidden rounded-lg">
          <img
            src="/images/official/waldorf-astoria-doha-west-bay-2.jpg"
            alt=""
            className="size-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-ink/35">
            <PlayCircle aria-hidden className="size-14 text-white" strokeWidth={1.25} />
          </div>
          <span className="absolute start-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-ink/60 px-2.5 py-1 text-white text-xs">
            <Captions aria-hidden className="size-3.5" /> {t('previews.pace.captions')}
          </span>
        </div>
        <figcaption className="grid gap-1.5">
          <p className="font-medium">{t('previews.pace.caption')}</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            “{excerpt(t('data.video'), 210)}…”
          </p>
        </figcaption>
      </figure>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SAMPLE.map((course) => (
          <li key={course.code} className="rounded-lg bg-white p-4 text-sm ring-1 ring-ink/5">
            <p className="font-medium">{dataText(t, 'unit', COURSE_TITLES, course.title)}</p>
            <p className="text-muted-foreground">
              {dataText(t, 'format', FORMATS, course.formatLabel)},{' '}
              {minutesLabel(course.durationMinutes)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
