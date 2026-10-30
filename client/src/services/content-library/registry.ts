import type { ContentLanguage } from '@shared/constants'

/**
 * What the host needs to know about each Content Library item beyond the `contentPackages` rows:
 * how a bookmark is shaped, how many positions the lesson has, and the pass mark. The two
 * language variants of an item share one `courseKey` and one `bookmarkSchema`, which is what
 * makes an equivalent position mappable between them. A variant with a different schema is never
 * handed another variant's bookmark.
 */
export type CourseKey = 'welcoming-visitors-to-qatar' | 'planning-a-visitor-experience'

export type ItemSpec = {
  courseKey: CourseKey
  courseCode: 'C08' | 'C09'
  format: 'scorm_2004' | 'xapi'
  /** Bookmark layout shared by both language variants. */
  bookmarkSchema: string
  /** Prefix of the `cmi.location` / state position: `screen-3`, `step-2`. */
  positionPrefix: 'screen' | 'step'
  positions: number
  /** Percent a SCORM quiz needs (2 of 3). Package-defined, a demo setting. */
  passMark: number | null
}

export const ITEM_SPECS: Record<CourseKey, ItemSpec> = {
  'welcoming-visitors-to-qatar': {
    courseKey: 'welcoming-visitors-to-qatar',
    courseCode: 'C08',
    format: 'scorm_2004',
    bookmarkSchema: 'wvq-bookmark-1',
    positionPrefix: 'screen',
    positions: 5,
    passMark: 67,
  },
  'planning-a-visitor-experience': {
    courseKey: 'planning-a-visitor-experience',
    courseCode: 'C09',
    format: 'xapi',
    bookmarkSchema: 'pve-bookmark-1',
    positionPrefix: 'step',
    positions: 4,
    passMark: null,
  },
}

export const specForCourseCode = (code: string): ItemSpec | undefined =>
  Object.values(ITEM_SPECS).find((spec) => spec.courseCode === code)

export const specForCourseKey = (key: string | null): ItemSpec | undefined =>
  key ? (ITEM_SPECS as Record<string, ItemSpec>)[key] : undefined

export const LANGUAGE_NAME: Record<ContentLanguage, { name: string; native: string }> = {
  en: { name: 'English', native: 'English' },
  ar: { name: 'Arabic', native: 'العربية' },
}
