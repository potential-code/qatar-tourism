import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/lib/api-error'
import { useAfterSignIn } from '../hooks/useAfterSignIn'
import { useSimulatedSso } from '../queries/auth.queries'
import { FormAlert } from './FormAlert'

export type SsoProvider = 'qatar-tourism' | 'organisation'

/** Translation keys (`auth` namespace) for each simulated provider. */
const COPY = {
  'qatar-tourism': {
    title: 'sso.tourism',
    account: 'sso.tourismAccount',
    detail: 'sso.tourismDetail',
  },
  organisation: {
    title: 'sso.organisation',
    account: 'sso.organisationAccount',
    detail: 'sso.organisationDetail',
  },
} as const satisfies Record<SsoProvider, Record<string, string>>

/** Explains the simulated connection before using the mock account (brief §1, §3). */
export function SsoDialog({
  provider,
  redirect,
  onClose,
}: {
  provider: SsoProvider | null
  redirect?: string
  onClose: () => void
}) {
  const { t } = useTranslation('auth')
  const sso = useSimulatedSso()
  const afterSignIn = useAfterSignIn()
  const copy = provider ? COPY[provider] : null

  async function continueWithMock() {
    if (!provider) return
    await sso.mutateAsync(provider)
    onClose()
    await afterSignIn({ redirect })
  }

  return (
    <Dialog open={provider !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="rounded-xl sm:max-w-lg">
        {copy ? (
          <>
            <DialogHeader className="gap-3 text-start">
              <SimulatedTag label={t('sso.connection')} className="w-fit" />
              <DialogTitle className="font-display font-light text-2xl">
                {t(copy.title)}
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {t('sso.description', { detail: t(copy.detail) })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1 rounded-lg bg-sand p-4 text-sm">
              <p className="text-muted-foreground text-xs">{t('sso.mockAccount')}</p>
              <p className="font-medium">{t(copy.account)}</p>
            </div>
            {sso.isError ? (
              <FormAlert>
                {sso.error instanceof ApiError && sso.error.status === 429
                  ? t('sso.tooMany')
                  : t('sso.unavailable')}
              </FormAlert>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-start">
              <Button onClick={continueWithMock} disabled={sso.isPending}>
                {sso.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                {t('sso.continue')}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                {t('sso.cancel')}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
