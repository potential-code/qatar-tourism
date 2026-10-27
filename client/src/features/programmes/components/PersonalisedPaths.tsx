import { Route as RouteIcon } from 'lucide-react'
import { SectionHeading } from '@/components/brand'
import { Stagger, StaggerItem } from '@/components/motion'
import type { ProgrammeDetail } from '../queries/programmes.queries'

/** Program B personalisation (brief §5, §14): one stage, several approved paths. */
export function PersonalisedPaths({ paths }: { paths: ProgrammeDetail['paths'] }) {
  return (
    <section aria-labelledby="paths-title" className="grid gap-8">
      <SectionHeading
        title={<span id="paths-title">Shaped around your role</span>}
        description="Program B stays one stage. Your profile and baseline choose between administrator-approved paths, and you can always see why a path was recommended."
      />
      <Stagger className="grid gap-4 md:grid-cols-3">
        {paths.map((path) => (
          <StaggerItem key={path.code}>
            <div className="grid h-full content-start gap-3 rounded-xl bg-white p-6 ring-1 ring-ink/5">
              <RouteIcon aria-hidden className="size-5 text-teal" />
              <p className="font-display text-xl">{path.name.replace(/^B /, '')}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{path.description}</p>
              {path.isDefault ? (
                <p className="text-teal-deep text-xs">Default when no more specific rule matches</p>
              ) : null}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
