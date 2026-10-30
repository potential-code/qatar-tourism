import type { ProgrammeCode } from '@shared/constants'

/**
 * Programme overview structure (brief §3, §5, §6, §7). The words (outcomes, prerequisites,
 * effort, audience, hero alt text) live in the `public` namespace under
 * `programme.items.<code>.*`; this file keeps the slug, the hero image and how many outcomes
 * each programme lists. Numbers that an administrator can change (pass marks) are read from the
 * programme's completion rules in the database, not from here.
 */
export type ProgrammeCopy = {
  slug: 'a' | 'b' | 'c'
  heroImage: string
  outcomeCount: number
}

export const PROGRAMME_COPY: Record<ProgrammeCode, ProgrammeCopy> = {
  A: { slug: 'a', heroImage: '/images/official/museum-family.jpg', outcomeCount: 5 },
  B: { slug: 'b', heroImage: '/images/official/dhow-boat-min.jpg', outcomeCount: 4 },
  C: {
    slug: 'c',
    heroImage: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
    outcomeCount: 3,
  },
}

export function programmeSlug(code: ProgrammeCode) {
  return PROGRAMME_COPY[code].slug
}
