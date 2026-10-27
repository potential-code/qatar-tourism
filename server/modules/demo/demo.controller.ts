import { now } from '@server/lib/clock'
import type { AuthEnv } from '@server/middleware/auth.middleware'
import type { DemoMetaView } from '@shared/schemas'
import type { Context } from 'hono'
import * as demoService from './demo.service'

type MetaRow = Awaited<ReturnType<typeof demoService.getDemoMeta>>

export function toMetaView(meta: MetaRow): DemoMetaView {
  return {
    referenceDate: meta.referenceDate,
    seedVersion: meta.seedVersion,
    seededAt: meta.seededAt.toISOString(),
    now: now().toISOString(),
    counts: meta.counts,
  }
}

export async function getMeta() {
  return toMetaView(await demoService.getDemoMeta())
}

export async function reset(c: Context<AuthEnv>) {
  const { meta, resetAt } = await demoService.resetDemo(c)
  return {
    message:
      'Demo data has been reset to the snapshot. All learner and training data is fictional.',
    resetAt: resetAt.toISOString(),
    meta: toMetaView(meta),
  }
}
