import { C01_VIDEO_SCRIPT, COURSES } from '@shared/content'
import { Captions, PlayCircle } from 'lucide-react'
import { minutesLabel } from '@/features/programmes/utils/format'

const SAMPLE = COURSES.filter((course) => ['C01', 'C02', 'C03', 'C05'].includes(course.code))

/** Learn at your pace: the C01 lesson and transcript, plus the unit formats (brief §7). */
export function PacePreview() {
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
            <Captions aria-hidden className="size-3.5" /> Captions and transcript
          </span>
        </div>
        <figcaption className="grid gap-1.5">
          <p className="font-medium">C01 Welcoming every visitor, video, 3 minutes</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            “{C01_VIDEO_SCRIPT.slice(0, 210)}…”
          </p>
        </figcaption>
      </figure>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SAMPLE.map((course) => (
          <li key={course.code} className="rounded-lg bg-white p-4 text-sm ring-1 ring-ink/5">
            <p className="font-medium">{course.title}</p>
            <p className="text-muted-foreground">
              {course.formatLabel}, {minutesLabel(course.durationMinutes)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
