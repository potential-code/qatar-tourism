import { AR_PRACTICE } from '@shared/content/scenarios-ar'
import { registerArabicCopy } from '@/i18n/localised'

// Arabic variants of the scenario, rubric and label copy that the mock services return in
// English. Registered once, so `tr()` finds them wherever a learner screen shows that text.
registerArabicCopy(AR_PRACTICE)
