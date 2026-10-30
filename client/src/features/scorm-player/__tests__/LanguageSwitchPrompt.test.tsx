import { afterEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n, { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import { ContentLanguageControl } from '../components/ContentLanguageControl'
import { LanguageSwitchPrompt, type SwitchPromptPlan } from '../components/LanguageSwitchPrompt'
import { CONTENT_LANGUAGE_KEY, resolveContentLanguage } from '../hooks/useContentLanguage'

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

const mapped: SwitchPromptPlan = {
  language: 'ar',
  mapped: true,
  position: 3,
  positions: 5,
  unit: 'screen',
}

function renderPrompt(
  props: Partial<Parameters<typeof LanguageSwitchPrompt>[0]> = {},
  handlers = { onConfirm: mock(() => {}), onCancel: mock(() => {}) },
) {
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageSwitchPrompt
        open
        plan={mapped}
        saving={false}
        pending={false}
        error={false}
        {...handlers}
        {...props}
      />
    </I18nextProvider>,
  )
  return handlers
}

describe('LanguageSwitchPrompt', () => {
  test('asks to open the Arabic version once progress is saved, and says where it continues', () => {
    renderPrompt()
    expect(screen.getByText('Your progress has been saved. Open the Arabic version?')).toBeDefined()
    expect(screen.getByText('The Arabic version continues at screen 3 of 5.')).toBeDefined()
    expect(screen.getByText(/Completion credit counts once/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Open the Arabic version' })).toBeDefined()
  })

  test('the English equivalent', () => {
    renderPrompt({ plan: { ...mapped, language: 'en', unit: 'step', position: 2, positions: 4 } })
    expect(
      screen.getByText('Your progress has been saved. Open the English version?'),
    ).toBeDefined()
    expect(screen.getByText('The English version continues at step 2 of 4.')).toBeDefined()
  })

  test('when no equivalent position exists, it explains the other version starts at the beginning', () => {
    renderPrompt({ plan: { ...mapped, mapped: false, position: 0 } })
    expect(screen.getByText(/The Arabic version starts at the beginning\./)).toBeDefined()
    expect(screen.getByText(/your enrolment is not reset/)).toBeDefined()
  })

  test('does not offer the switch until the bookmark is stored', () => {
    renderPrompt({ saving: true, plan: null })
    expect(screen.getAllByText('Saving your progress…').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Your progress has been saved/)).toBeNull()
    const confirm = screen.getByRole('button', { name: /Open the/ }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
  })

  test('a failed save blocks the switch and says so', () => {
    renderPrompt({ error: true, plan: null })
    expect(screen.getByRole('alert').textContent).toContain('could not be saved')
  })

  test('confirm opens the other version, cancel stays', () => {
    const handlers = renderPrompt()
    fireEvent.click(screen.getByRole('button', { name: 'Open the Arabic version' }))
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Stay in this version' }))
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
  })

  test('is translated when the portal is in Arabic', async () => {
    await setAppLanguage('ar')
    renderPrompt({ plan: { ...mapped, language: 'en' } })
    expect(screen.getByText('تم حفظ تقدّمك. هل تريد فتح النسخة الإنجليزية؟')).toBeDefined()
  })
})

describe('ContentLanguageControl', () => {
  function renderControl(value: 'portal' | 'en' | 'ar', onChange = mock(() => {})) {
    render(
      <I18nextProvider i18n={i18n}>
        <ContentLanguageControl value={value} onChange={onChange} portal="en" />
      </I18nextProvider>,
    )
    return onChange
  }

  test('offers the portal language by default, English and Arabic, separate from the portal', () => {
    renderControl('portal')
    const portal = screen.getByRole('radio', { name: 'Use my portal language' })
    expect(portal.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'English' })).toBeDefined()
    const arabic = screen.getByRole('radio', { name: 'العربية' })
    expect(arabic.getAttribute('lang')).toBe('ar')
    expect(screen.getByText(/Portal language: English/)).toBeDefined()
  })

  test('choosing Arabic reports it and does not change the portal language', () => {
    const onChange = renderControl('portal')
    fireEvent.click(screen.getByRole('radio', { name: 'العربية' }))
    expect(onChange).toHaveBeenCalledWith('ar')
    expect(i18n.language).toBe('en')
  })
})

describe('content language resolution', () => {
  test('"portal" follows the portal; English and Arabic pin the lesson', () => {
    expect(resolveContentLanguage('portal', 'ar')).toBe('ar')
    expect(resolveContentLanguage('portal', 'en')).toBe('en')
    expect(resolveContentLanguage('ar', 'en')).toBe('ar')
    expect(resolveContentLanguage('en', 'ar')).toBe('en')
    expect(CONTENT_LANGUAGE_KEY).toBe('qta-content-language')
  })
})
