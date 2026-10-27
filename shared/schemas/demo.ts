import { z } from 'zod'

export const demoMetaView = z.object({
  referenceDate: z.string(),
  seedVersion: z.string(),
  seededAt: z.string(),
  now: z.string(),
  counts: z.record(z.string(), z.number()),
})
export type DemoMetaView = z.infer<typeof demoMetaView>

export const demoResetInput = z.object({ confirm: z.literal(true) })
