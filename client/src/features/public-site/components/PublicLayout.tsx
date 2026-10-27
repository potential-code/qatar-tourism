import type { ReactNode } from 'react'
import { LenisProvider } from '@/components/motion'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'

/**
 * Frame for every public page: Lenis smooth scroll (public site only), header, footer.
 * `overlayHeader` lets the header sit transparently over a full-bleed hero.
 */
export function PublicLayout({
  children,
  overlayHeader = false,
}: {
  children: ReactNode
  overlayHeader?: boolean
}) {
  return (
    <LenisProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        Skip to content
      </a>
      <div className="flex min-h-[100dvh] flex-col bg-sand">
        <PublicHeader overlay={overlayHeader} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <PublicFooter />
      </div>
    </LenisProvider>
  )
}
