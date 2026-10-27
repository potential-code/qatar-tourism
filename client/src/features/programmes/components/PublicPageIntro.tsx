import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'

/** Title block for public list pages without a photo hero. */
export function PublicPageIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Reveal className="flex max-w-3xl flex-col gap-4">
      <h1 className="font-display font-light text-4xl text-ink leading-[1.08] md:text-6xl">
        {title}
      </h1>
      {children ? (
        <div className="text-lg text-muted-foreground leading-relaxed">{children}</div>
      ) : null}
    </Reveal>
  )
}
