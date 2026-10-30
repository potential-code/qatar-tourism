import { useTranslation } from 'react-i18next'
import { SectionHeading } from '@/components/brand'
import { tr } from '@/features/public-site/utils/translate'
import { cn } from '@/lib/utils'
import { accent } from '../tone'
import { IllustrativeTag } from './IllustrativeTag'

const WORKSHEET = ['w1', 'w2', 'w3', 'w4'] as const

/** Program C working overview: the fictional C07 story-planning worksheet (brief §7). */
export function SamplePreview() {
  const { t } = useTranslation('public')
  return (
    <section
      id="sample-preview"
      tabIndex={-1}
      aria-labelledby="sample-title"
      className="grid scroll-mt-24 gap-8 outline-none"
    >
      <div className="flex flex-col gap-3">
        <IllustrativeTag className="w-fit" />
        <SectionHeading
          title={
            <span id="sample-title" className="rtl:leading-[1.4]">
              {t('sample.title')}
            </span>
          }
          description={t('sample.description')}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {WORKSHEET.map((row, index) => (
          <div
            key={row}
            data-reveal="card"
            className={cn(
              'grid gap-2 rounded-[1.5rem] border border-teal/25 border-dashed bg-gradient-to-br via-white to-white p-6 shadow-card',
              accent(index).mist,
            )}
          >
            <p className="flex items-center gap-3 font-display text-xl">
              <span aria-hidden className={cn('font-display text-2xl', accent(index).icon)}>
                {index + 1}
              </span>
              {tr(t, `sample.${row}Label`)}
            </p>
            <p className="text-muted-foreground text-sm">{tr(t, `sample.${row}Prompt`)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
