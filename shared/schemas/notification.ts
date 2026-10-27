import { z } from 'zod'
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATES } from '../constants/enums'

export const notificationView = z.object({
  id: z.uuid(),
  eventId: z.string(),
  kind: z.string(),
  channel: z.enum(NOTIFICATION_CHANNELS),
  state: z.enum(NOTIFICATION_STATES),
  subject: z.string(),
  body: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
})
export type NotificationView = z.infer<typeof notificationView>

export const notificationLogQuery = z.object({
  state: z.enum(NOTIFICATION_STATES).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  sessionId: z.uuid().optional(),
})
