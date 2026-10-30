import { afterEach, describe, expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import i18n, { LANGUAGE_STORAGE_KEY, leaveForcedLanguage, setAppLanguage } from '@/i18n'

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

describe('LanguageSwitcher', () => {
  test('marks the active language, labels each button in its own script, and switches', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    )
    const english = screen.getByRole('button', { name: 'English' })
    const arabic = screen.getByRole('button', { name: 'العربية' })
    expect(english.getAttribute('aria-pressed')).toBe('true')
    expect(arabic.getAttribute('aria-pressed')).toBe('false')
    expect(arabic.getAttribute('lang')).toBe('ar')

    fireEvent.click(arabic)
    await waitFor(() => expect(arabic.getAttribute('aria-pressed')).toBe('true'))
    expect(document.documentElement.dir).toBe('rtl')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar')
    expect(screen.getByRole('group', { name: 'تغيير اللغة' })).toBeDefined()
  })
})
