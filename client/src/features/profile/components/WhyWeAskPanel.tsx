import { ShieldCheck } from 'lucide-react'
import { ArchFrame } from '@/components/brand'

const IMAGES = [
  { src: '/images/official/waldorf-astoria-doha-west-bay-2.jpg', alt: 'A hotel lobby lounge' },
  {
    src: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
    alt: 'Visitors in the Qatar National Library',
  },
  { src: '/images/official/al-hazm-0024.jpg', alt: 'A family visiting Al Hazm' },
]

/** Side panel for the wizard: the one arch accent on the page, plus how the data is used. */
export function WhyWeAskPanel({ step, name }: { step: number; name: string }) {
  const image = IMAGES[step - 1] ?? IMAGES[0]
  return (
    <div className="sticky top-8 grid gap-6">
      <ArchFrame className="aspect-[4/5] overflow-hidden">
        <img
          key={image?.src}
          src={image?.src}
          alt={image?.alt}
          className="size-full object-cover"
        />
      </ArchFrame>
      <div className="grid gap-3 rounded-xl bg-white p-5 text-sm ring-1 ring-ink/5">
        <p className="font-display text-xl">Welcome, {name.split(' ')[0]}</p>
        <p className="flex gap-2 text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
          Trainers see your learner ID and display name only. Optional fields are marked, and you
          can change every answer later.
        </p>
      </div>
    </div>
  )
}
