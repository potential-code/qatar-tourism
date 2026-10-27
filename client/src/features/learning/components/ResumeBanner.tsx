import { Link } from '@tanstack/react-router'
import { History } from 'lucide-react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Button } from '@/components/ui/button'
import type { Journey } from '../types'
import { UNIT_IMAGE } from '../utils/imagery'

/** "Resume at last activity" (brief §5). */
export function ResumeBanner({ journey }: { journey: Journey }) {
  const resume = journey.resume
  if (!resume) return null
  const item =
    journey.items.find((i) => i.courseCode === resume.courseCode) ??
    journey.extras.find((e) => e.courseCode === resume.courseCode)
  const title = item?.title ?? resume.courseCode
  return (
    <PhotoPanel
      src={UNIT_IMAGE[resume.courseCode] ?? UNIT_IMAGE.C01 ?? ''}
      alt=""
      fade="start"
      className="rounded-xl"
    >
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-white/80">Resume where you left off</p>
          <p className="font-display text-2xl font-normal text-white md:text-3xl">{title}</p>
          <p className="text-sm text-white/80">{resume.percent}% complete</p>
        </div>
        <Button asChild size="lg" variant="glass">
          <Link
            to="/learner/learning/$code"
            params={{ code: resume.courseCode }}
            search={{ programme: journey.enrolment.programme }}
          >
            <History aria-hidden /> Resume
          </Link>
        </Button>
      </div>
    </PhotoPanel>
  )
}
