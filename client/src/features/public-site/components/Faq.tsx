import { useTranslation } from 'react-i18next'
import { ArchFrame, CornerPattern, Eyebrow, GoldArch } from '@/components/brand'
import { Parallax, ScrollReveal, SplitWords } from '@/components/motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FAQ_KEYS } from '../content/home'

/**
 * FAQ (brief §2): programme differences, self-paced versus live, certificates, access, help.
 * The heading runs across the top; below it the arch photograph stands beside the questions at
 * the same height.
 */
export function Faq() {
  const { t } = useTranslation('public')
  return (
    <section aria-labelledby="faq-title" className="relative isolate overflow-hidden bg-sand-deep">
      <CornerPattern side="a" />
      <div aria-hidden className="absolute end-0 top-1/3 -z-10 size-[420px] qt-glow text-sky/20" />
      <ScrollReveal className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 md:px-8 md:py-32">
        <div className="flex flex-col gap-4">
          <div data-reveal>
            <Eyebrow className="rtl:tracking-normal" index="05" tone="maroon">
              {t('faq.eyebrow')}
            </Eyebrow>
          </div>
          <h2
            id="faq-title"
            className="font-display font-light text-4xl text-ink leading-[1.08] rtl:leading-[1.4] md:text-5xl"
          >
            <SplitWords text={t('faq.title')} />
          </h2>
        </div>
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:items-stretch lg:gap-16">
          <div data-reveal="card" className="relative mx-4 hidden min-h-[520px] lg:block">
            <GoldArch className="translate-x-4 translate-y-4 text-rose rtl:-translate-x-4" />
            <ArchFrame className="size-full overflow-hidden bg-teal shadow-xl">
              <Parallax speed={6} className="absolute -inset-y-10 inset-x-0">
                <img
                  src="/images/official/qabila-westbay-hotel1.jpg"
                  alt={t('faq.imageAlt')}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </Parallax>
              <div className="absolute inset-0 bg-gradient-to-t from-teal-deep/70 via-teal-deep/10 to-transparent" />
            </ArchFrame>
          </div>
          <Accordion type="single" collapsible className="grid w-full content-start gap-4">
            {FAQ_KEYS.map((key, index) => (
              <AccordionItem
                key={key}
                value={key}
                data-reveal="card"
                className="group/faq qt-card-elevated relative overflow-hidden rounded-2xl border-0 px-6 transition-shadow duration-500 last:border-b-0 hover:shadow-lg data-[state=open]:shadow-xl md:px-8"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 start-0 w-1 origin-top scale-y-0 bg-gradient-to-b from-teal via-sky to-maroon transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]/faq:scale-y-100"
                />
                <AccordionTrigger className="items-center gap-6 py-6 text-start font-display text-xl hover:no-underline md:text-2xl [&>svg]:size-9 [&>svg]:rounded-full [&>svg]:bg-teal-mist [&>svg]:p-2 [&>svg]:text-teal [&[data-state=open]>svg]:bg-teal [&[data-state=open]>svg]:text-white">
                  <span className="flex items-baseline gap-4">
                    <span aria-hidden className="font-display text-base text-teal tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {t(`faq.${key}.q`)}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-7 ps-9 text-base text-muted-foreground leading-relaxed">
                  {t(`faq.${key}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollReveal>
    </section>
  )
}
