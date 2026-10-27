import { Building2, Landmark } from 'lucide-react'
import { useState } from 'react'
import { SimulatedTag } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { SsoDialog, type SsoProvider } from './SsoDialog'

/** Optional connected sign-in (brief §3). Both are SIMULATED and say so. */
export function SsoButtons({ redirect }: { redirect?: string }) {
  const [provider, setProvider] = useState<SsoProvider | null>(null)
  return (
    <section aria-labelledby="sso-title" className="grid gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/10" />
        <h2 id="sso-title" className="text-muted-foreground text-xs">
          Or use connected sign-in
        </h2>
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <Button
        variant="outline"
        className="h-auto min-h-11 justify-between gap-3 whitespace-normal py-2 text-start"
        onClick={() => setProvider('qatar-tourism')}
      >
        <span className="inline-flex items-center gap-2">
          <Landmark aria-hidden />
          Continue with Qatar Tourism account
        </span>
        <SimulatedTag />
      </Button>
      <Button
        variant="outline"
        className="h-auto min-h-11 justify-between gap-3 whitespace-normal py-2 text-start"
        onClick={() => setProvider('organisation')}
      >
        <span className="inline-flex items-center gap-2">
          <Building2 aria-hidden />
          Continue with organisation account
        </span>
        <SimulatedTag />
      </Button>
      <p className="text-muted-foreground text-xs">
        Optional connected sign-in for CRM and internal tools.
      </p>
      <SsoDialog provider={provider} redirect={redirect} onClose={() => setProvider(null)} />
    </section>
  )
}
