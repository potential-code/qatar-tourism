import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BENEFITS, type BenefitKey } from '../content/home'
import { AiPracticePreview } from './previews/AiPracticePreview'
import { PacePreview } from './previews/PacePreview'
import { ProgressPreview } from './previews/ProgressPreview'
import { TrainersPreview } from './previews/TrainersPreview'

const NEXT: Record<BenefitKey, { to: string; params?: { code: string } }> = {
  pace: { to: '/programmes/$code', params: { code: 'b' } },
  ai: { to: '/register' },
  trainers: { to: '/sessions' },
  progress: { to: '/register' },
}

/** Each benefit links to its preview (brief §2), built from the demo's real content. */
export function BenefitPreviewDialog({
  benefit,
  onClose,
}: {
  benefit: BenefitKey | null
  onClose: () => void
}) {
  const { t } = useTranslation('public')
  const meta = BENEFITS.find((b) => b.key === benefit)
  const next = benefit ? NEXT[benefit] : null
  return (
    <Dialog open={benefit !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl bg-sand p-0 sm:max-w-2xl">
        {meta && next ? (
          <>
            <DialogHeader className="gap-2 border-ink/5 border-b bg-white p-6 text-start md:p-8">
              <DialogTitle className="font-display font-light text-3xl">
                {t(`benefits.${meta.key}.title`)}
              </DialogTitle>
              <DialogDescription>{t(`benefits.${meta.key}.body`)}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 p-6 md:p-8">
              {benefit === 'pace' ? <PacePreview /> : null}
              {benefit === 'ai' ? <AiPracticePreview /> : null}
              {benefit === 'trainers' ? <TrainersPreview /> : null}
              {benefit === 'progress' ? <ProgressPreview /> : null}
              <Button asChild className="w-fit">
                <Link to={next.to as never} params={next.params as never} onClick={onClose}>
                  {t(`benefits.${meta.key}.next`)}
                  <ArrowRight aria-hidden className="rtl:-scale-x-100" />
                </Link>
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
