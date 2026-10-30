import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n, { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import type { DemoDb } from '@/mocks/db'
import { actAs, freshDemo } from '@/services/__tests__/helpers'
import { rsvpsOn } from '@/services/__tests__/sessions-support'
import { cancelBooking } from '@/services/rsvps.service'
import { OfferCard } from '../components/OfferCard'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

/** A confirmed learner cancels on the full session, so the first waitlisted learner is offered. */
async function openOffer() {
  const confirmed = rsvpsOn('SES-T03-2').find((r) => r.status === 'confirmed')
  actAs(db, confirmed?.learnerId as string)
  await cancelBooking(confirmed?.id as string)
  const rsvp = rsvpsOn('SES-T03-2').find((r) => r.status === 'offered')
  const offer = db.seatOffers.find((o) => o.rsvpId === rsvp?.id)
  if (!rsvp || !offer) throw new Error('The seat offer was not created')
  actAs(db, rsvp.learnerId)
  return { rsvp, offer }
}

function renderCard(props: { rsvpId: string; expiresAt: string; now: string }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <OfferCard sessionTitle="Service Excellence Workshop" {...props} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe('OfferCard', () => {
  test('shows the reserved seat, the time left and both answers', async () => {
    const { rsvp, offer } = await openOffer()
    renderCard({ rsvpId: rsvp.id, expiresAt: offer.expiresAt, now: offer.offeredAt })
    expect(screen.getByText('A seat is reserved for you')).toBeDefined()
    expect(screen.getByText(/23 h 59 min left|24 h 0 min left|24 h 1 min left/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Accept seat/ }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: /Decline/ }).hasAttribute('disabled')).toBe(false)
  })

  test('an offer past its deadline cannot be answered', async () => {
    const { rsvp, offer } = await openOffer()
    const later = new Date(Date.parse(offer.expiresAt) + 60_000).toISOString()
    renderCard({ rsvpId: rsvp.id, expiresAt: offer.expiresAt, now: later })
    expect(screen.getByText(/This offer has expired/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Accept seat/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /Decline/ }).hasAttribute('disabled')).toBe(true)
  })

  test('Accept confirms the seat through the booking service', async () => {
    const { rsvp, offer } = await openOffer()
    renderCard({ rsvpId: rsvp.id, expiresAt: offer.expiresAt, now: offer.offeredAt })
    fireEvent.click(screen.getByRole('button', { name: /Accept seat/ }))
    await waitFor(() => expect(db.rsvps.find((r) => r.id === rsvp.id)?.status).toBe('confirmed'))
    expect(db.seatOffers.find((o) => o.id === offer.id)?.status).toBe('accepted')
  })

  test('Decline releases the seat to the next learner', async () => {
    const { rsvp, offer } = await openOffer()
    renderCard({ rsvpId: rsvp.id, expiresAt: offer.expiresAt, now: offer.offeredAt })
    fireEvent.click(screen.getByRole('button', { name: /Decline/ }))
    await waitFor(() => expect(db.rsvps.find((r) => r.id === rsvp.id)?.status).toBe('cancelled'))
    expect(db.rsvps.filter((r) => r.status === 'offered' && r.id !== rsvp.id)).toHaveLength(1)
  })

  test('renders in Arabic with right-to-left direction', async () => {
    const { rsvp, offer } = await openOffer()
    await setAppLanguage('ar')
    renderCard({ rsvpId: rsvp.id, expiresAt: offer.expiresAt, now: offer.offeredAt })
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByText('مقعد محجوز لك')).toBeDefined()
    expect(screen.getByRole('button', { name: /قبول المقعد/ })).toBeDefined()
  })
})
