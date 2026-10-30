import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ArchFrame } from '@/components/brand'

const IMAGES = [
  { src: '/images/official/waldorf-astoria-doha-west-bay-2.jpg', alt: 'profile.panel.imgHotel' },
  {
    src: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
    alt: 'profile.panel.imgLibrary',
  },
  { src: '/images/official/al-hazm-0024.jpg', alt: 'profile.panel.imgFamily' },
] as const

/** Side panel for the wizard: the one arch accent on the page, plus how the data is used. */
export function WhyWeAskPanel({ step, name }: { step: number; name: string }) {
  const { t } = useTranslation('learner')
  const image = IMAGES[step - 1] ?? IMAGES[0]
  return (
    <div className="sticky top-8 grid gap-6">
      <ArchFrame className="aspect-[4/5] overflow-hidden">
        <img
          key={image?.src}
          src={image?.src}
          alt={image ? t(image.alt) : ''}
          className="size-full object-cover"
        />
      </ArchFrame>
      <div className="grid gap-3 rounded-xl bg-white p-5 text-sm ring-1 ring-ink/5">
        <p className="font-display text-xl">
          {t('profile.panel.welcome', { name: name.split(' ')[0] })}
        </p>
        <p className="flex gap-2 text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
          {t('profile.panel.privacy')}
        </p>
      </div>
    </div>
  )
}
