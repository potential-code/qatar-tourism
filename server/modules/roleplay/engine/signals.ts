/**
 * Keyword signals read from what the learner wrote or said (brief §9). The scripted visitor
 * branches on them and the scorer counts them. Only the words of the reply are read: nothing
 * about accent, voice, name or any demographic characteristic is ever an input.
 */

export const SIGNALS = {
  acknowledge:
    /\b(sorry|apologi[sz]e|apologies|i understand|i can see|i hear you|that must be|frustrat\w*|disappoint\w*|worr(y|ied|ying)|stressful|thank you for (telling|letting|your patience|waiting)|i appreciate)\b/i,
  polite: /\b(please|thank you|thanks|happy to help|of course|certainly|you are welcome)\b/i,
  question:
    /\?|\b(could you tell|can you tell|may i ask|do you|would you|what time|which|how many|how long|where are you)\b/i,
  verify:
    /\b(check\w*|verif\w*|confirm with|let me (find out|look|ask)|i will ask|colleague|supervisor|manager|duty manager|operations team|look (it|that) up|authori[sz]ed source)\b/i,
  options:
    /\b(option|options|alternative\w*|either|instead|another (session|time|slot|tour|activity|route|entrance)|or we (could|can)|we could also|two (choices|ideas|possibilities))\b/i,
  followUp:
    /\b(follow[- ]up|get back to you|come back to you|call you|message you|text you|update you|keep you (posted|updated)|next step|within \d+|in \d+ minutes|let you know|escalat\w*)\b/i,
  checkUnderstanding:
    /\b(does that (make sense|work|sound)|is that (clear|ok|okay|alright)|can you repeat|could you repeat|just to confirm|to confirm|let me confirm|any (other )?questions|anything else)\b/i,
  sequence:
    /\b(first|then|next|after that|finally|turn (left|right)|straight ahead|on your (left|right))\b/i,
  overpromise:
    /\b(guarantee\w*|i promise|definitely will|100 ?(%|percent)|full refund|refund you|no problem at all|make an exception|i will hold it|i can hold it|always available)\b/i,
  dismissive:
    /\b(calm down|not my (problem|fault|job)|nothing i can do|search online|google it|look it up yourself|your fault|you should have)\b/i,
  personalData:
    /\b(passport|qid|id number|identity (card|number)|home address|date of birth|credit card|bank)\b/i,
  policy: /\b(policy|rules?|terms|cut-?off|24 hours|demo policy|stated)\b/i,
} as const

export type SignalKey = keyof typeof SIGNALS

/** "I cannot make an exception" is a boundary, not a promise. */
const NEGATION = /\b(not|cannot|can't|can not|unable to|won't|will not|never|no)\b/i

/** True when the sentence carries the signal (an overpromise only when it is not negated). */
export function sentenceHas(sentence: string, key: SignalKey): boolean {
  if (!SIGNALS[key].test(sentence)) return false
  if (key === 'overpromise') {
    const match = SIGNALS.overpromise.exec(sentence)
    const before = match ? sentence.slice(0, match.index) : ''
    return !NEGATION.test(before)
  }
  return true
}

/** Signals present in one reply, sentence by sentence. */
export function detect(text: string): Set<SignalKey> {
  const found = new Set<SignalKey>()
  const parts = sentences(text)
  for (const key of Object.keys(SIGNALS) as SignalKey[]) {
    if (parts.some((part) => sentenceHas(part, key))) found.add(key)
  }
  return found
}

/** Splits a reply into sentences so evidence quotes are short and exact. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** The first sentence (across the replies, in order) that carries the signal. */
export function firstSentenceWith(turns: readonly string[], key: SignalKey): string | null {
  for (const turn of turns) {
    for (const sentence of sentences(turn)) {
      if (sentenceHas(sentence, key)) return sentence
    }
  }
  return null
}

export function countQuestions(turns: readonly string[]): number {
  let total = 0
  for (const turn of turns) {
    for (const sentence of sentences(turn)) {
      if (sentenceHas(sentence, 'question')) total += 1
    }
  }
  return total
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
