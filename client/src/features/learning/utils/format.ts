import i18n from '@/i18n'

/** "1 h 20 min", "45 min" (Arabic: "1 س 20 د"). Follows the active language. */
export function minutesLabel(minutes: number): string {
  const t = (key: 'min' | 'hours' | 'hoursMin', values: Record<string, number>) =>
    i18n.t(`learning.duration.${key}`, { ns: 'learner', ...values })
  if (minutes <= 0) return t('min', { n: 0 })
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (hours === 0) return t('min', { n: rest })
  return rest === 0 ? t('hours', { h: hours }) : t('hoursMin', { h: hours, m: rest })
}

export const PROGRAMME_LABEL = { A: 'Program A', B: 'Program B', C: 'Program C' } as const
