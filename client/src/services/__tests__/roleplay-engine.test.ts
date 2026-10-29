import { describe, expect, test } from 'bun:test'
import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'
import {
  findScenario,
  MAX_LEARNER_TURNS,
  MIN_LEARNER_TURNS,
  replay,
} from '../roleplay/engine/conversation'
import { scoreConversation } from '../roleplay/engine/scoring'
import { DEMONSTRATION_REPLIES } from '../roleplay/engine/script'
import { detect } from '../roleplay/engine/signals'

const changed = findScenario('changed-booking')
if (!changed) throw new Error('scenario missing')

const STRONG = DEMONSTRATION_REPLIES['changed-booking'] as readonly string[]
const WEAK = [
  'Not my problem, search online.',
  'I guarantee you a full refund.',
  'Ok.',
  'Bye.',
  'Fine.',
]

describe('scripted conversation (brief §9)', () => {
  test('every scenario finishes in 4 to 6 learner turns with the model replies', () => {
    for (const scenario of ROLEPLAY_SCENARIOS) {
      const replies = DEMONSTRATION_REPLIES[scenario.key] ?? []
      const { transcript, done } = replay(scenario, replies)
      const learnerTurns = transcript.filter((t) => t.speaker === 'learner').length
      expect(done).toBe(true)
      expect(learnerTurns).toBeGreaterThanOrEqual(MIN_LEARNER_TURNS)
      expect(learnerTurns).toBeLessThanOrEqual(MAX_LEARNER_TURNS)
      expect(transcript[0]).toEqual({ speaker: 'visitor', text: scenario.visitorOpening })
    }
  })

  test('the visitor branches on keywords in the learner reply', () => {
    const dismissive = replay(changed, ['Not my problem, search online.'])
    expect(dismissive.transcript[2]?.text).toContain('not very helpful')

    const asked = replay(changed, ['I am sorry about that. How much time do you have today?'])
    expect(asked.transcript[2]?.text).toBe(
      `Thank you, I appreciate that. ${changed.visitorFollowUps[0]}`,
    )
  })

  test('never runs past six learner turns, even when every reply triggers a branch', () => {
    const replies = Array.from({ length: 10 }, () => 'Not my problem, I guarantee a refund.')
    const { transcript, done } = replay(changed, replies.slice(0, 6))
    expect(done).toBe(true)
    expect(transcript.filter((t) => t.speaker === 'learner').length).toBeLessThanOrEqual(6)
  })

  test('a negated promise is a boundary, not an overpromise', () => {
    expect(detect('I am not able to make an exception.').has('overpromise')).toBe(false)
    expect(detect('I will make an exception for you.').has('overpromise')).toBe(true)
  })
})

describe('deterministic scoring', () => {
  test('the same conversation always gets the same result', () => {
    const a = scoreConversation(changed, STRONG)
    const b = scoreConversation(changed, [...STRONG])
    expect(a).toEqual(b)
  })

  test('five criteria scored 0 to 4, total out of 20 converted to /100', () => {
    for (const replies of [STRONG, WEAK]) {
      const result = scoreConversation(changed, replies)
      expect(result.criteria).toHaveLength(5)
      for (const c of result.criteria) {
        expect(c.score).toBeGreaterThanOrEqual(0)
        expect(c.score).toBeLessThanOrEqual(4)
      }
      expect(result.total).toBe(result.criteria.reduce((sum, c) => sum + c.score, 0))
      expect(result.percent).toBe(result.total * 5)
    }
  })

  test('a strong conversation outscores a weak one', () => {
    expect(scoreConversation(changed, STRONG).percent).toBeGreaterThanOrEqual(80)
    expect(scoreConversation(changed, WEAK).percent).toBeLessThanOrEqual(20)
  })

  test('every criterion quotes evidence from the learner and gives a suggestion', () => {
    for (const replies of [STRONG, WEAK]) {
      const result = scoreConversation(changed, replies)
      for (const c of result.criteria) {
        const quoted = c.evidence.replace(/\.\.\.$/, '')
        expect(replies.some((reply) => reply.includes(quoted))).toBe(true)
        expect(c.suggestion.length).toBeGreaterThan(10)
      }
      expect(result.strength).toBeTruthy()
      expect(result.improve).toBeTruthy()
      expect(result.retry).toBeTruthy()
    }
  })

  test('the overpromise is quoted as the accuracy evidence', () => {
    const result = scoreConversation(changed, WEAK)
    const accuracy = result.criteria.find((c) => c.key === 'accuracy_boundaries')
    expect(accuracy?.evidence).toBe('I guarantee you a full refund.')
    expect(accuracy?.suggestion).toContain('Verify availability before promising')
  })

  test('names and backgrounds in the reply never change the score', () => {
    const base = [...STRONG]
    const withNames = base.map((reply, i) =>
      i === 0 ? reply.replace('I am sorry', 'My name is Daniel. I am sorry') : reply,
    )
    const otherName = base.map((reply, i) =>
      i === 0 ? reply.replace('I am sorry', 'My name is Maha. I am sorry') : reply,
    )
    expect(scoreConversation(changed, withNames).scores).toEqual(
      scoreConversation(changed, otherName).scores,
    )
  })
})
