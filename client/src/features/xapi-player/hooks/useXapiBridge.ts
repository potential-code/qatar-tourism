import { useCallback, useEffect, useRef } from 'react'
import type { StatementInput } from '@/services/xapi/statement'

/**
 * The launch bridge the xAPI package looks for (`window.QTA_LRS`). It plays the part of the
 * launch parameters (endpoint, actor, activity id) and of the LRS itself: statements and the
 * state document go to the simulated learning record store through the handlers given here.
 * No network calls are made.
 */
export type LrsBridge = {
  simulated: true
  label: string
  endpoint: string
  actor: { name: string; homePage: string; account: string }
  activityId: string
  state: { location: string; suspendData: string } | null
  sendStatement: (statement: StatementInput) => Promise<void>
  setState: (location: string, json: string) => Promise<void>
}

declare global {
  interface Window {
    QTA_LRS?: LrsBridge
  }
}

export type BridgeConfig = Omit<LrsBridge, 'sendStatement' | 'setState'> & {
  send: (statement: StatementInput) => Promise<unknown>
  save: (location: string, json: string) => Promise<unknown>
}

export function useXapiBridge() {
  const pending = useRef(new Set<Promise<unknown>>())

  const track = useCallback((promise: Promise<unknown>) => {
    pending.current.add(promise)
    const done = () => pending.current.delete(promise)
    promise.then(done, done)
    return promise
  }, [])

  const install = useCallback(
    ({ send, save, ...rest }: BridgeConfig) => {
      window.QTA_LRS = {
        ...rest,
        sendStatement: async (statement) => {
          await track(send(statement))
        },
        setState: async (location, json) => {
          await track(save(location, json))
        },
      }
    },
    [track],
  )

  const uninstall = useCallback(() => {
    delete window.QTA_LRS
  }, [])

  /** Asks the package to write its state document, then waits for every pending write. */
  const flush = useCallback(async (frame: HTMLIFrameElement | null) => {
    const content = (
      frame?.contentWindow as (Window & { QTAContent?: { saveNow: () => unknown } }) | null
    )?.QTAContent
    await content?.saveNow()
    const results = await Promise.allSettled([...pending.current])
    if (results.some((r) => r.status === 'rejected')) throw new Error('Save failed')
  }, [])

  useEffect(() => uninstall, [uninstall])

  return { install, uninstall, flush }
}
