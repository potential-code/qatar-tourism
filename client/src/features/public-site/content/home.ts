import { BookOpenText, LineChart, MessagesSquare, Presentation } from 'lucide-react'

/**
 * Homepage structure (brief §2). The words live in the `public` translation namespace
 * (`i18n/locales/{en,ar}/public.json`); this file keeps what is language-independent: image
 * paths, icons, ids and the order of things.
 */

export const HERO_SLIDES = [
  { id: 'westBay', src: '/images/official/westbay-skyline-007.jpg' },
  { id: 'museum', src: '/images/official/museum-family.jpg' },
  { id: 'dhow', src: '/images/official/dhow-boat-min.jpg' },
  { id: 'terrace', src: '/images/official/qatar-tourism-banner.jpg' },
] as const

export type HeroSlideId = (typeof HERO_SLIDES)[number]['id']

export type BenefitKey = 'pace' | 'ai' | 'trainers' | 'progress'

export const BENEFITS = [
  {
    key: 'pace',
    icon: BookOpenText,
    image: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
  },
  { key: 'ai', icon: MessagesSquare, image: null },
  { key: 'trainers', icon: Presentation, image: '/images/official/element-west-bay-13.jpg' },
  { key: 'progress', icon: LineChart, image: null },
] as const satisfies readonly {
  key: BenefitKey
  icon: unknown
  image: string | null
}[]

export const STEPS = [
  { key: 's1', image: '/images/official/waldorf-astoria-doha-west-bay-2.jpg' },
  { key: 's2', image: '/images/official/book-couples.jpg' },
  { key: 's3', image: '/images/official/tour-operator.jpg' },
  { key: 's4', image: '/images/official/al-hazm-0024.jpg' },
] as const

export const PROGRAMME_REQUIREMENTS = [
  { code: 'A', key: 'a' },
  { code: 'B', key: 'b' },
  { code: 'C', key: 'c' },
] as const

export const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const
