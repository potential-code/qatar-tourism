import type {
  BookingChangeRequestInput,
  BookingCreateInput,
  BookingMoveInput,
} from '@shared/schemas/booking-rsvp'
import type { Actor } from '../sessions/actor'
import * as rsvpsService from './rsvps.service'

export function ping() {
  return { module: 'rsvps' as const, status: 'ok' as const }
}

export const catalogue = (actor: Actor) => rsvpsService.catalogue(actor.id)
export const mine = (actor: Actor) => rsvpsService.mySessions(actor.id)
export const book = (actor: Actor, input: BookingCreateInput) => rsvpsService.book(actor, input)
export const move = (actor: Actor, input: BookingMoveInput) => rsvpsService.move(actor, input)
export const cancel = (actor: Actor, rsvpId: string, reason?: string) =>
  rsvpsService.cancel(actor, rsvpId, reason)
export const requestChange = (actor: Actor, rsvpId: string, input: BookingChangeRequestInput) =>
  rsvpsService.requestChange(actor, rsvpId, input)
