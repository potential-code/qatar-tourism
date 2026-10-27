import { SectionHeading } from '@/components/brand'
import { Reveal } from '@/components/motion'
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
      <Reveal className="grid gap-4 md:grid-cols-2">
        {WORKSHEET.map((row) => (
          <div
            key={row.label}
            className="grid gap-2 rounded-xl border border-teal/20 border-dashed bg-white p-6"
          >
            <p className="font-display text-xl">{row.label}</p>
            <p className="text-muted-foreground text-sm">{row.prompt}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
