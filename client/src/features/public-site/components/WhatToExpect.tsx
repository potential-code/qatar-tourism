import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { SectionHeading } from '@/components/brand'
import { Reveal, Stagger, StaggerItem } from '@/components/motion'
import { cn } from '@/lib/utils'
import { BENEFITS, type BenefitKey } from '../content/home'
import { BenefitPreviewDialog } from './BenefitPreviewDialog'

const LAYOUT: Record<BenefitKey, string> = {
  pace: 'lg:col-span-7 min-h-[340px] lg:min-h-[420px]',
  ai: 'lg:col-span-5 min-h-[340px] lg:min-h-[420px]',
  trainers: 'lg:col-span-5 min-h-[340px]',
  progress: 'lg:col-span-7 min-h-[340px]',
}

const TONE: Record<BenefitKey, string> = {
  pace: 'text-white',
  ai: 'bg-teal-deep text-white',
  trainers: 'text-white',
  progress: 'bg-white text-ink ring-1 ring-ink/5',
}

/** Visual accent per tile: two photographs, two typographic previews. */
function TileVisual({ benefitKey, image }: { benefitKey: BenefitKey; image: string | null }) {
  if (image) {
    return (
      <>
        <img
          src={image}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/5"
        />
      </>
    )
  }
  if (benefitKey === 'ai') {
    return (
      <blockquote className="font-display text-2xl text-white/95 leading-snug md:text-[1.7rem]">
        <span aria-hidden className="text-teal-soft">
          “
        </span>
        I booked this experience for today and now I am told it is unavailable. What can you do?
        <span aria-hidden className="text-teal-soft">
          ”
        </span>
      </blockquote>
    )
  }
  return (
    <div className="flex items-end gap-8" aria-hidden>
      <div className="grid gap-1">
        <span className="text-muted-foreground text-xs">Baseline</span>
        <span className="font-display text-5xl text-ink/50 md:text-6xl">40</span>
      </div>
      <div className="grid gap-1">
        <span className="text-muted-foreground text-xs">Post-assessment</span>
        <span className="font-display text-5xl text-teal md:text-6xl">80</span>
      </div>
      <span className="mb-2 rounded-full bg-teal-mist px-3 py-1 font-medium text-sm text-teal-deep">
        +40 points
      </span>
    </div>
  )
}

/** "What to expect" (brief §2): four benefits, each opening its preview. */
export function WhatToExpect() {
  const [open, setOpen] = useState<BenefitKey | null>(null)
  return (
    <section
      id="academy"
      tabIndex={-1}
      aria-labelledby="expect-title"
      className="scroll-mt-20 bg-sand-deep outline-none"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 md:px-8 md:py-32">
        <Reveal>
          <SectionHeading
            title={<span id="expect-title">What to expect</span>}
            description="The Academy brings self-paced learning, realistic practice and trainer-led sessions into one connected journey."
          />
        </Reveal>
        <Stagger className="grid gap-5 lg:grid-cols-12" stagger={0.1}>
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon
            return (
              <StaggerItem key={benefit.key} className={LAYOUT[benefit.key]}>
                <button
                  type="button"
                  onClick={() => setOpen(benefit.key)}
                  aria-haspopup="dialog"
                  className={cn(
                    'group relative isolate flex size-full flex-col justify-between gap-10 overflow-hidden rounded-xl p-7 text-start transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:p-9',
                    TONE[benefit.key],
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        'inline-flex size-11 items-center justify-center rounded-full',
                        benefit.key === 'progress'
                          ? 'bg-teal-mist text-teal-deep'
                          : 'bg-white/15 text-white backdrop-blur-sm',
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full py-1 ps-3 pe-1 font-medium text-sm',
                        benefit.key === 'progress' ? 'text-teal-deep' : 'text-white',
                      )}
                    >
                      Preview
                      <span
                        className={cn(
                          'inline-flex size-7 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
                          benefit.key === 'progress'
                            ? 'bg-teal text-white'
                            : 'bg-white text-teal-deep',
                        )}
                      >
                        <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
                      </span>
                    </span>
                  </div>
                  {benefit.image ? null : <TileVisual benefitKey={benefit.key} image={null} />}
                  {benefit.image ? (
                    <TileVisual benefitKey={benefit.key} image={benefit.image} />
                  ) : null}
                  <div className="grid max-w-md gap-2">
                    <h3 className="font-display text-2xl md:text-3xl">{benefit.title}</h3>
                    <p
                      className={cn(
                        'text-base leading-relaxed',
                        benefit.key === 'progress' ? 'text-muted-foreground' : 'text-white/85',
                      )}
                    >
                      {benefit.body}
                    </p>
                  </div>
                </button>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
      <BenefitPreviewDialog benefit={open} onClose={() => setOpen(null)} />
    </section>
  )
}
