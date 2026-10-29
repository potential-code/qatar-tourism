import type { ProgrammeCode } from '@shared/constants'

/**
 * One brand colour per programme (A teal, B maroon, C sky), shared by the homepage cards and
 * the programme pages so each programme keeps its colour everywhere.
 */
export const PROGRAMME_TONE = {
  A: {
    wash: 'from-teal-deep/90 via-teal-deep/30',
    heroWash: 'from-teal-night/95 via-teal-deep/70 to-teal/10',
    chip: 'bg-teal-mist text-teal-deep',
    icon: 'text-teal',
    solid: 'bg-grad-teal text-white',
    cta: 'bg-teal text-white group-hover:bg-teal-deep',
    glow: 'shadow-[0_36px_70px_-28px_rgb(0_98_123/0.6)]',
    bar: 'bg-grad-teal',
  },
  B: {
    wash: 'from-maroon-deep/90 via-maroon-deep/30',
    heroWash: 'from-maroon-deep/95 via-maroon-deep/65 to-maroon/10',
    chip: 'bg-rose-mist text-maroon',
    icon: 'text-maroon',
    solid: 'bg-grad-maroon text-white',
    cta: 'bg-maroon text-white group-hover:bg-maroon-deep',
    glow: 'shadow-[0_36px_70px_-28px_rgb(125_0_42/0.55)]',
    bar: 'bg-grad-maroon',
  },
  C: {
    wash: 'from-teal-night/85 via-teal-night/25',
    heroWash: 'from-teal-night/95 via-teal-night/65 to-sky/10',
    chip: 'bg-sky-mist text-teal-night',
    icon: 'text-teal',
    solid: 'bg-sky text-teal-night',
    cta: 'bg-sky text-teal-night group-hover:bg-gold',
    glow: 'shadow-[0_36px_70px_-28px_rgb(116_174_209/0.8)]',
    bar: 'bg-gradient-to-r from-sky to-gold',
  },
} as const satisfies Record<ProgrammeCode, Record<string, string>>

/** Accent cycle for repeated items (facts, paths, steps): teal, maroon, sky, gold. */
export const ACCENTS = [
  {
    chip: 'bg-grad-teal text-white',
    mist: 'from-teal-mist',
    bar: 'bg-teal',
    text: 'text-teal',
    icon: 'text-teal',
  },
  {
    chip: 'bg-grad-maroon text-white',
    mist: 'from-rose-mist',
    bar: 'bg-maroon',
    text: 'text-maroon',
    icon: 'text-maroon',
  },
  {
    chip: 'bg-sky text-teal-night',
    mist: 'from-sky-mist',
    bar: 'bg-sky',
    text: 'text-teal-deep',
    icon: 'text-lagoon',
  },
  {
    chip: 'bg-gold text-teal-night',
    mist: 'from-gold-soft/70',
    bar: 'bg-gold',
    text: 'text-teal-deep',
    icon: 'text-gold-deep',
  },
] as const

export const accent = (index: number) => ACCENTS[index % ACCENTS.length] ?? ACCENTS[0]
