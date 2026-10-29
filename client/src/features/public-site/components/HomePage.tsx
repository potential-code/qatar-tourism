import { useEffect } from 'react'
import { scrollToSection } from '../utils/scroll'
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
  // Arriving from another page via a header link (/#sessions): glide to that section once the
  // pinned "How it works" has measured itself, so the target position is final.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const timer = window.setTimeout(() => scrollToSection(id), 450)
    return () => window.clearTimeout(timer)
  }, [])

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
