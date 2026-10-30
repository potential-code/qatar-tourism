import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand'
import { Magnetic, Parallax, ScrollReveal, SplitWords } from '@/components/motion'
import { Button } from '@/components/ui/button'

/**
 * Closing invitation over the Fuwairit photograph. Reuses the hero's "Start your journey" label:
 * one label per intent. A teal wash from the start side keeps the copy readable.
 */
export function ClosingCta() {
  const { t } = useTranslation('public')
  return (
    <section aria-labelledby="closing-title" className="px-4 py-24 md:px-8 md:py-32">
      <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] text-white shadow-xl">
        <Parallax speed={10} className="absolute -inset-y-24 inset-x-0 -z-30">
          <img
            src="/images/official/fuwairit-kite-beach.jpg"
            alt={t('closing.imageAlt')}
            loading="lazy"
            className="size-full object-cover"
          />
        </Parallax>
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-gradient-to-r from-teal-night/95 via-teal-deep/70 to-teal/10 rtl:bg-gradient-to-l"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-gradient-to-t from-teal-night/60 via-transparent to-transparent"
        />
        <CornerPattern side="b" tone="dark" />
        <ScrollReveal className="flex min-h-[520px] max-w-2xl flex-col justify-center gap-7 p-8 md:p-14 lg:min-h-[600px] lg:p-20">
          <h2
            id="closing-title"
            className="font-display font-light text-4xl leading-[1.06] rtl:leading-[1.4] md:text-6xl"
          >
            <SplitWords text={t('closing.title')} />
          </h2>
          <p data-reveal className="max-w-lg text-lg text-white/90">
            {t('closing.body')}
          </p>
          <div data-reveal>
            <Magnetic className="w-fit">
              <Button
                asChild
                size="lg"
                className="group h-14 bg-white px-8 text-base text-teal-deep shadow-lg hover:-translate-y-0.5 hover:bg-gold-soft hover:text-teal-night"
              >
                <Link to="/register">
                  {t('hero.secondary')}
                  <ArrowUpRight
                    aria-hidden
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  />
                </Link>
              </Button>
            </Magnetic>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
