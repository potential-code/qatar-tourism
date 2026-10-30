import type { ContentLanguage } from '@shared/constants'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type SwitchPromptPlan = {
  language: ContentLanguage
  /** True when the other version can continue at the equivalent position. */
  mapped: boolean
  position: number
  positions: number
  unit: 'screen' | 'step'
}

/**
 * Shown before a mid-lesson content-language switch, once the bookmark is saved: "Your progress
 * has been saved. Open the Arabic version?". It says where the other version will start, or that
 * it starts at the beginning while the existing progress is kept. `saving` shows the wait while
 * the bookmark is being committed; the confirm button stays off until it is stored.
 */
export function LanguageSwitchPrompt({
  open,
  plan,
  saving,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean
  plan: SwitchPromptPlan | null
  saving: boolean
  pending: boolean
  error: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation('content')
  const version = plan
    ? t(plan.language === 'ar' ? 'language.versionAr' : 'language.versionEn')
    : ''
  const ready = Boolean(plan) && !saving && !error
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{saving ? t('switch.saving') : t('switch.title', { version })}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {saving ? (
                <p className="flex items-center gap-2" role="status">
                  <Loader2 aria-hidden className="size-4 animate-spin" /> {t('switch.saving')}
                </p>
              ) : error ? (
                <p role="alert" className="text-destructive">
                  {t('switch.error')}
                </p>
              ) : plan ? (
                <>
                  <p>
                    {plan.mapped
                      ? t('switch.mapped', {
                          version,
                          unit: t(`position.${plan.unit}`),
                          position: plan.position,
                          total: plan.positions,
                        })
                      : t('switch.unmapped', { version })}
                  </p>
                  <p>{t('switch.credit')}</p>
                </>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            {t('switch.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={!ready || pending}>
            {t('switch.confirm', { version })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
