import { SESSION_RUBRIC, THRESHOLDS } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { BookOpenCheck, FileText, Scale } from 'lucide-react'
import { SwoopReveal } from '@/components/brand/SwoopReveal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { qatarDateShort } from '@/features/sessions/utils/qatar-time'
import { resourcesQuery } from '../../queries/trainer.queries'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'

const GUIDES = [
  {
    title: 'Session rubric guide',
    body: 'How to award preparation, communication, practical application and professionalism points with evidence.',
    icon: Scale,
  },
  {
    title: 'Attendance and absence',
    body: 'Mark pending, attended, late, absent or excused. Absence never becomes a pass, and corrections need a reason.',
    icon: BookOpenCheck,
  },
  {
    title: 'Rescheduling checklist',
    body: 'Check the affected learner count, give a clear reason and highlight any venue change before you confirm.',
    icon: FileText,
  },
]

/** Facilitation resources: the rubric, the operating rules, and materials from the trainer's sessions. */
export function TrainerResourcesPage() {
  const resources = useQuery(resourcesQuery())
  return (
    <>
      <PageHeader
        title="Resources"
        description="Rubrics, operating guides and the materials attached to your sessions. Demonstration content."
      />
      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <SwoopReveal className="aspect-[16/10] rounded-xl">
          <img
            src="/images/official/grid-qatar-national-library-2-7740-wip-5.jpg"
            alt="Reading terraces at Qatar National Library"
            className="size-full object-cover"
          />
        </SwoopReveal>
        <Reveal className="rounded-xl border bg-card p-6 shadow-xs">
          <h2 className="font-display text-2xl font-light text-ink">Session rubric</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Out of 100. Demo pass mark {THRESHOLDS.sessionPass}.
          </p>
          <ul className="mt-4 grid gap-3">
            {SESSION_RUBRIC.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-ink">{r.label}</span>
                <span className="font-display text-2xl tabular-nums text-teal-deep">{r.max}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <Reveal key={g.title} className="rounded-xl border bg-card p-5 shadow-xs">
            <g.icon aria-hidden className="size-6 text-maroon" />
            <h3 className="mt-3 font-display text-xl text-ink">{g.title}</h3>
            <p className="mt-1 text-sm text-ink-soft">{g.body}</p>
          </Reveal>
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-light text-ink">Materials on your sessions</h2>
        {resources.isPending ? (
          <WorkspaceSkeleton rows={2} />
        ) : resources.isError ? (
          <QueryErrorPanel error={resources.error} onRetry={() => resources.refetch()} />
        ) : resources.data.sessionMaterials.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card/60 p-6 text-sm text-muted-foreground">
            None of your sessions lists materials yet. Add them when you create or edit a session.
          </p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {resources.data.sessionMaterials.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-4">
                <p className="font-medium text-ink">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.code}, {qatarDateShort(s.startsAt)}
                </p>
                <ul className="mt-2 list-disc ps-5 text-sm text-ink-soft">
                  {s.materials.map((m) => (
                    <li key={m.title}>{m.title}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
