import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import { AssessmentRunner } from '../components/AssessmentRunner'
import { AssessmentTimer } from '../components/AssessmentTimer'
import { ImprovementBanner } from '../components/ImprovementBanner'
import type { AttemptAvailability, OpenAttempt } from '../types'

// happy-dom cannot cancel Web Animations cleanly, so skip motion in these tests.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
})

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

const availability: AttemptAvailability = {
  locked: false,
  canStart: false,
  reason: null,
  reasonCode: null,
  best: null,
  latest: null,
  attempts: 0,
  attemptLimit: 2,
  attemptsRemaining: 1,
  extraGranted: 0,
  passMark: 80,
  reviewMark: null,
  timeLimitMinutes: 15,
  scorePolicy: 'best',
  passed: false,
}

function attempt(language: 'en' | 'ar'): OpenAttempt {
  const text =
    language === 'en'
      ? {
          prompt:
            'A visitor asks for an activity suitable for their family. What should you do first?',
          options: ['Ask about their interests and practical needs', 'Ignore the request'],
          multi: 'Which details help you match an activity to a visitor? Select all that apply.',
        }
      : {
          prompt: 'يسأل أحد الزوّار عن نشاط يناسب عائلته. ما الذي يجب أن تفعله أولًا؟',
          options: ['السؤال عن اهتماماتهم واحتياجاتهم العملية', 'تجاهل الطلب'],
          multi: 'أيّ من التفاصيل التالية تساعدك على مطابقة النشاط مع الزائر؟ اختر كل ما ينطبق.',
        }
  return {
    id: 'attempt-1',
    attemptNo: 1,
    engine: true,
    language,
    deadlineAt: null,
    secondsLeft: 15 * 60 - 1,
    timeLimitMinutes: 15,
    answers: {},
    questions: [
      {
        id: `Q-DN-001-${language.toUpperCase()}`,
        competency: 'discover_needs',
        competencyLabel: 'Discover needs',
        type: 'scenario',
        prompt: text.prompt,
        options: [
          { key: 'B', text: text.options[0] as string },
          { key: 'D', text: text.options[1] as string },
        ],
        language,
      },
      {
        id: `Q-DN-003-${language.toUpperCase()}`,
        competency: 'discover_needs',
        competencyLabel: 'Discover needs',
        type: 'multiple',
        prompt: text.multi,
        options: [
          { key: 'A', text: 'A' },
          { key: 'B', text: 'B' },
        ],
        language,
      },
    ],
  }
}

function renderRunner(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </I18nextProvider>,
  )
}

const runner = (language: 'en' | 'ar') => (
  <AssessmentRunner
    attempt={attempt(language)}
    availability={availability}
    programme="A"
    kind="post"
    title="Final assessment"
    exitAction={<button type="button">Exit</button>}
    onSubmitted={() => undefined}
  />
)

describe('AssessmentRunner', () => {
  test('shows the countdown, the attempt number and the attempts left', () => {
    renderRunner(runner('en'))
    const timer = screen.getByRole('timer', { name: 'Time remaining' })
    expect(within(timer).getByText(/^1[45]:\d\d$/)).toBeDefined()
    expect(within(timer).getByText('15 minute limit')).toBeDefined()
    expect(screen.getByText(/Attempt 1 of 2/)).toBeDefined()
    expect(screen.getByText(/Attempts remaining after this one: 1/)).toBeDefined()
    expect(screen.getByText('0 of 2 answered')).toBeDefined()
    // A scenario question uses radio buttons; the hint says one answer.
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByText('Choose one answer · Scenario')).toBeDefined()
  })

  test('renders the Arabic variant right to left with Arabic labels', async () => {
    await setAppLanguage('ar')
    renderRunner(runner('ar'))
    await waitFor(() => expect(screen.getByRole('timer', { name: 'الوقت المتبقي' })).toBeDefined())
    expect(screen.getByText(/المحاولة 1 من 2/)).toBeDefined()
    expect(screen.getByText(/المحاولات المتبقية بعد هذه: 1/)).toBeDefined()
    const prompt = screen.getByText(/يسأل أحد الزوّار/)
    expect(prompt.getAttribute('lang')).toBe('ar')
    expect(prompt.getAttribute('dir')).toBe('rtl')
    expect(screen.getByText('اختر إجابة واحدة · موقف')).toBeDefined()
    expect(screen.getByRole('button', { name: 'السابق' })).toBeDefined()
    // The countdown digits stay left to right.
    expect(
      within(screen.getByRole('timer'))
        .getByText(/^1[45]:\d\d$/)
        .getAttribute('dir'),
    ).toBe('ltr')
  })
})

describe('ImprovementBanner', () => {
  const comparison = { baseline: 50, post: 80, gainPoints: 30 }

  test('says "Improvement: 30 percentage points"', () => {
    renderRunner(<ImprovementBanner comparison={comparison} programme="A" policy="best" />)
    expect(screen.getByText('Improvement: 30 percentage points')).toBeDefined()
    expect(screen.getByText('50%')).toBeDefined()
    expect(screen.getByText('80%')).toBeDefined()
  })

  test('says it in Arabic too', async () => {
    await setAppLanguage('ar')
    renderRunner(<ImprovementBanner comparison={comparison} programme="A" policy="best" />)
    await waitFor(() => expect(screen.getByText('التحسّن: 30 نقطة مئوية')).toBeDefined())
  })
})

describe('AssessmentTimer', () => {
  test('writes the warning out and calls onExpire once when time is up', async () => {
    let expired = 0
    renderRunner(
      <AssessmentTimer secondsLeft={0} limitMinutes={15} onExpire={() => (expired += 1)} />,
    )
    await waitFor(() => expect(expired).toBe(1))
    expect(
      screen.getAllByText('Time is up. Submitting your saved answers.').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('00:00')).toBeDefined()
  })

  test('under a minute the warning is text, not only colour', () => {
    renderRunner(<AssessmentTimer secondsLeft={45} limitMinutes={15} onExpire={() => undefined} />)
    expect(screen.getAllByText('1 minute remaining.').length).toBeGreaterThan(0)
  })
})
