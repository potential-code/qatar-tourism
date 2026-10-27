/** Official photographs for portal page banners, one per screen so the set feels curated. */
export const PORTAL_IMAGES = {
  learning: '/images/official/city-view.jpg',
  practice: '/images/official/book-couples.jpg',
  progress: '/images/official/doha-skyline-min.jpg',
  assignments: '/images/official/al-hazm-0024.jpg',
  profile: '/images/official/waldorf-astoria-doha-west-bay-2.jpg',
  trainerSessions: '/images/official/pearl-qatar-tourism-min.jpg',
  trainerLearners: '/images/official/katara-towers.jpg',
  trainerAttendance: '/images/official/qabila-westbay-hotel1.jpg',
  marking: '/images/official/element-west-bay-13.jpg',
} as const

export type PortalImage = keyof typeof PORTAL_IMAGES
