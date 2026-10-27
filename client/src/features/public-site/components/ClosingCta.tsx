import { Link } from '@tanstack/react-router'
import { PhotoPanel } from '@/components/brand'
import { Reveal } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { HERO } from '../content/home'

/** Closing invitation. Reuses the hero's "Start your journey" label: one label per intent. */
export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="px-4 py-24 md:px-8 md:py-32">
      <PhotoPanel
        src="/images/official/fuwairit-kite-beach.jpg"
        alt="Kite surfers over turquoise water at Fuwairit beach"
        fade="start"
        className="mx-auto max-w-[1400px] rounded-xl"
      >
        <Reveal className="flex min-h-[420px] max-w-xl flex-col justify-center gap-6 p-8 md:p-14">
          <h2
            id="closing-title"
            className="font-display font-light text-4xl text-white leading-[1.08] md:text-5xl"
          >
            Every great visit starts with a confident welcome.
          </h2>
          <p className="text-lg text-white/85">
            Create your account, complete a short profile and get a learning path shaped around your
            role.
          </p>
          <Button asChild size="lg" variant="glass" className="w-fit">
            <Link to="/register">{HERO.secondary}</Link>
          </Button>
        </Reveal>
      </PhotoPanel>
    </section>
  )
}
