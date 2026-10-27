import { SwoopReveal } from '@/components/brand'
import { Reveal } from '@/components/motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FAQ } from '../content/home'

/** FAQ (brief §2): programme differences, self-paced versus live, certificates, access, help. */
export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="bg-white">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <h2
              id="faq-title"
              className="font-display font-light text-3xl text-ink leading-[1.1] md:text-5xl"
            >
              Questions before you begin
            </h2>
          </Reveal>
          <SwoopReveal className="hidden aspect-[4/3] lg:block">
            <img
              src="/images/official/qabila-westbay-hotel1.jpg"
              alt="A training room set up for a workshop"
              loading="lazy"
              className="size-full object-cover"
            />
          </SwoopReveal>
        </div>
        <Reveal>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger className="py-6 text-start font-display text-xl hover:no-underline md:text-2xl">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
