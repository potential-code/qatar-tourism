import type { ProgrammeCode } from '@shared/constants'

/** Official Qatar Tourism photography per programme and unit (client/public/images/official). */
const OFFICIAL = '/images/official'

export const PROGRAMME_IMAGE: Record<ProgrammeCode, { src: string; alt: string }> = {
  A: {
    src: `${OFFICIAL}/museum-family.jpg`,
    alt: 'A family arriving at the National Museum of Qatar',
  },
  B: {
    src: `${OFFICIAL}/waldorf-astoria-doha-west-bay-2.jpg`,
    alt: 'A bright hotel lobby in West Bay, Doha',
  },
  C: { src: `${OFFICIAL}/pearl-qatar-tourism-min.jpg`, alt: 'The Pearl-Qatar from above' },
}

export const UNIT_IMAGE: Record<string, string> = {
  C01: `${OFFICIAL}/book-couples.jpg`,
  C02: `${OFFICIAL}/museum-family.jpg`,
  C03: `${OFFICIAL}/city-view.jpg`,
  C04: `${OFFICIAL}/dhow-boat-min.jpg`,
  C05: `${OFFICIAL}/qabila-westbay-hotel1.jpg`,
  C06: `${OFFICIAL}/element-west-bay-13.jpg`,
  C07: `${OFFICIAL}/pearl-qatar-tourism-min.jpg`,
}

export const PAGE_IMAGE = {
  aiPath: {
    src: `${OFFICIAL}/grid-qatar-national-library-2-7740-wip-5.jpg`,
    alt: 'Qatar National Library reading hall',
  },
  assessments: {
    src: `${OFFICIAL}/katara-towers.jpg`,
    alt: 'Katara Towers above the Lusail waterfront',
  },
  progress: { src: `${OFFICIAL}/doha-skyline-min.jpg`, alt: 'The Doha skyline at sunset' },
  certificates: { src: `${OFFICIAL}/westbay-skyline-007.jpg`, alt: 'West Bay skyline at night' },
  completion: { src: `${OFFICIAL}/tour-operator.jpg`, alt: 'Sunset over The Pearl-Qatar marina' },
} as const
