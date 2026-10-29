import { Route as RouteIcon } from 'lucide-react'
import { Eyebrow, SectionHeading } from '@/components/brand'
import { SplitWords } from '@/components/motion'
import { cn } from '@/lib/utils'
import type { ProgrammeDetail } from '../queries/programmes.queries'
import { accent } from '../tone'

/** Program B personalisation (brief §5, §14): one stage, several approved paths. */
export function PersonalisedPaths({ paths }: { paths: ProgrammeDetail['paths'] }) {
  return (
    <section aria-labelledby="paths-title" className="grid gap-10">
      <SectionHeading
        tone="light"
        eyebrow={
          <Eyebrow index="B" tone="light">
            Personalised paths
          </Eyebrow>
        }
        title={
          <span id="paths-title">
            <SplitWords text="Shaped around your role" />
          </span>
        }
        description="Program B stays one stage. Your profile and baseline choose between administrator-approved paths, and you can always see why a path was recommended."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {paths.map((path, index) => (
          <div
            key={path.code}
            data-reveal="card"
            className={cn(
              'group relative grid h-full content-start gap-4 overflow-hidden rounded-[1.5rem] bg-gradient-to-br via-white to-white p-7 text-ink shadow-card ring-1 ring-ink/5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 motion-reduce:hover:transform-none',
              accent(index).mist,
            )}
          >
            <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1.5', accent(index).bar)} />
            <RouteIcon
              aria-hidden
              className={cn(
                'size-7 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-110',
                accent(index).icon,
              )}
            />
            <p className="font-display text-2xl">{path.name.replace(/^B /, '')}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{path.description}</p>
            {path.isDefault ? (
              <p className="mt-auto w-fit rounded-full bg-white px-3 py-1 text-teal-deep text-xs shadow-xs ring-1 ring-teal/15">
                Default when no more specific rule matches
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
