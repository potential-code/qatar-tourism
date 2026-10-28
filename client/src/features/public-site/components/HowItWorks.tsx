import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { PROGRAMME_REQUIREMENTS, STEPS } from '../content/home'

gsap.registerPlugin(ScrollTrigger)

/**
 * "How it works" (brief §2): the four steps as the page's one pinned storytelling moment.
 * On wide screens with motion allowed, the section pins and the steps pan sideways as you
 * scroll, a distance of one track width only, so it never traps the reader. Narrow screens and
 * reduced motion get a plain vertical sequence.
 */
export function HowItWorks() {
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = wrap.current
    const rail = track.current
    if (!section || !rail) return
    const media = gsap.matchMedia()
    media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const distance = () => rail.scrollWidth - window.innerWidth
      const pan = gsap.to(rail, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      })
      const panels = gsap.utils.toArray<HTMLElement>('[data-step]', rail)
      for (const panel of panels) {
        const image = panel.querySelector('img')
        if (!image) continue
        gsap.fromTo(
          image,
          { scale: 1.18 },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: pan,
              start: 'left right',
              end: 'center center',
              scrub: true,
            },
          },
        )
      }
    })
    return () => media.revert()
  }, [])

  return (
    <section
      id="how-it-works"
      tabIndex={-1}
      aria-labelledby="how-title"
      className="scroll-mt-20 overflow-hidden bg-teal-deep text-white outline-none"
    >
      <div
        ref={wrap}
        className="lg:motion-safe:flex lg:motion-safe:min-h-[100dvh] lg:motion-safe:items-center"
      >
        <div
          ref={track}
          className="mx-auto flex max-w-[1400px] flex-col gap-14 px-4 py-24 md:grid md:grid-cols-2 md:gap-x-8 md:px-8 lg:grid-cols-4 lg:py-32 lg:motion-safe:mx-0 lg:motion-safe:flex lg:motion-safe:w-max lg:motion-safe:max-w-none lg:motion-safe:flex-row lg:motion-safe:items-stretch lg:motion-safe:gap-10 lg:motion-safe:py-0 lg:motion-safe:ps-[max(2rem,calc((100vw-1400px)/2+2rem))] lg:motion-safe:pe-[8vw]"
        >
          <div className="flex max-w-md shrink-0 flex-col justify-center gap-6 md:col-span-2 lg:col-span-4 lg:motion-safe:w-[30rem]">
            <h2
              id="how-title"
              className="font-display font-light text-4xl leading-[1.08] md:text-6xl"
            >
              How it works
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              Four steps take you from a new account to measurable improvement. Requirements differ
              by programme.
            </p>
          </div>
          <ol className="contents">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                data-step
                className="grid shrink-0 content-start gap-6 lg:motion-safe:w-[26rem] lg:motion-safe:self-center"
              >
                <div className="aspect-[4/5] overflow-hidden rounded-xl sm:aspect-[4/3] lg:motion-safe:aspect-auto lg:motion-safe:h-[min(56dvh,540px)]">
                  <img
                    src={step.image}
                    alt={step.alt}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </div>
                <div className="grid gap-2">
                  <h3 className="flex items-center gap-3 font-display text-2xl md:text-3xl">
                    {step.title}
                    {index < STEPS.length - 1 ? (
                      <ArrowRight aria-hidden className="size-5 text-teal-soft rtl:-scale-x-100" />
                    ) : null}
                  </h3>
                  <p className="text-white/80 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <aside
            aria-label="Requirements by programme"
            className="grid shrink-0 content-center gap-5 rounded-xl bg-white/[0.07] p-7 ring-1 ring-white/15 md:col-span-2 lg:col-span-4 lg:motion-safe:w-[28rem] lg:motion-safe:self-center"
          >
            <p className="font-display text-2xl">Requirements differ by programme</p>
            <dl className="grid gap-4">
              {PROGRAMME_REQUIREMENTS.map((row) => (
                <div key={row.code} className="grid gap-1">
                  <dt className="font-medium text-teal-mist text-sm">Program {row.code}</dt>
                  <dd className="text-sm text-white/85 leading-relaxed">{row.text}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}
