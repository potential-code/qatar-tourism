import { SectionHeading } from '@/components/brand'
import { cn } from '@/lib/utils'
import { accent } from '../tone'
import { IllustrativeTag } from './IllustrativeTag'

const WORKSHEET = [
  {
    label: 'Opening',
    prompt: 'One sentence that tells the visitor why this place matters to them today.',
  },
  {
    label: 'One memorable detail',
    prompt: 'A detail you can verify from an authorised source. Avoid guesses and superlatives.',
  },
  {
    label: 'Connect to the visitor',
    prompt: 'Link the story to what the visitor told you they enjoy.',
  },
  {
    label: 'Close with a next step',
    prompt: 'Suggest what to see or do next, with clear directions.',
  },
]

/** Program C working overview: the fictional C07 story-planning worksheet (brief §7). */
export function SamplePreview() {
  return (
    <section
      id="sample-preview"
      tabIndex={-1}
      aria-labelledby="sample-title"
      className="grid scroll-mt-24 gap-8 outline-none"
    >
      <div className="flex flex-col gap-3">
        <IllustrativeTag className="w-fit" />
        <SectionHeading
          title={<span id="sample-title">Story-planning worksheet</span>}
          description="C07 Telling a concise destination story, preview, 5 minutes. A fictional worksheet that shows how the sample programme would work."
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {WORKSHEET.map((row, index) => (
          <div
            key={row.label}
            data-reveal="card"
            className={cn(
              'grid gap-2 rounded-[1.5rem] border border-teal/25 border-dashed bg-gradient-to-br via-white to-white p-6 shadow-card',
              accent(index).mist,
            )}
          >
            <p className="flex items-center gap-3 font-display text-xl">
              <span aria-hidden className={cn('font-display text-2xl', accent(index).icon)}>
                {index + 1}
              </span>
              {row.label}
            </p>
            <p className="text-muted-foreground text-sm">{row.prompt}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
