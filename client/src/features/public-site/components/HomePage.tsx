import { ClosingCta } from './ClosingCta'
import { Faq } from './Faq'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { ProgrammesSection } from './ProgrammesSection'
import { PublicLayout } from './PublicLayout'
import { SessionsAndTrainers } from './SessionsAndTrainers'
import { WhatToExpect } from './WhatToExpect'

/** Public homepage, sections in the brief's display order (§2). */
export function HomePage() {
  return (
    <PublicLayout overlayHeader>
      <Hero />
      <ProgrammesSection />
      <WhatToExpect />
      <HowItWorks />
      <SessionsAndTrainers />
      <Faq />
      <ClosingCta />
    </PublicLayout>
  )
}
