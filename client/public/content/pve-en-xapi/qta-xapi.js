/*
 * A small in-browser xAPI client for the Qatar Tourism Academy sample activity.
 * Builds complete xAPI statements (actor, verb, object, result, timestamp) and hands them to the
 * launch bridge the Academy provides (window.parent.QTA_LRS), which stores them in the SIMULATED
 * learning record store. It makes no network calls. Original code written for this demo.
 * Exposes window.QTAXapi.
 */
;(() => {
  const VERB_BASE = 'http://adlnet.gov/expapi/verbs/'
  const MAX_PARENT_DEPTH = 7

  const state = {
    bridge: null,
    actor: null,
    activityId: '',
    sent: 0,
    failed: 0,
    log: [],
    listeners: [],
  }

  function findBridge() {
    let current = window
    for (let depth = 0; depth <= MAX_PARENT_DEPTH && current; depth += 1) {
      try {
        if (current.QTA_LRS) return current.QTA_LRS
      } catch {
        return null
      }
      if (!current.parent || current.parent === current) break
      current = current.parent
    }
    return null
  }

  function uuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID()
    const hex = '0123456789abcdef'
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16)
      return hex[c === 'x' ? r : (r & 3) | 8]
    })
  }

  const notify = () => {
    for (const fn of state.listeners) fn({ sent: state.sent, failed: state.failed, log: state.log })
  }

  /** Connects to the launch bridge. Without one, the activity still runs but records nothing. */
  function connect() {
    state.bridge = findBridge()
    if (!state.bridge) return { connected: false, state: null }
    state.actor = state.bridge.actor
    state.activityId = state.bridge.activityId
    return { connected: true, state: state.bridge.state || null }
  }

  /**
   * Build and send one statement. `part` is an optional sub-activity path ("destination"),
   * `name` its display name, `result` the xAPI result object.
   */
  async function send(verb, part, name, result) {
    const statement = {
      id: uuid(),
      actor: {
        objectType: 'Agent',
        name: state.actor?.name || 'Learner',
        account: {
          homePage: state.actor?.homePage || 'https://academy.demo.invalid',
          name: state.actor?.account || 'unknown',
        },
      },
      verb: { id: VERB_BASE + verb, display: { 'en-US': verb } },
      object: {
        objectType: 'Activity',
        id: part ? `${state.activityId}/${part}` : state.activityId,
        definition: name ? { name: { [document.documentElement.lang || 'en']: name } } : undefined,
      },
      result: result || undefined,
      timestamp: new Date().toISOString(),
    }
    const entry = { verb, part: part || '', at: statement.timestamp, status: 'pending' }
    state.log.unshift(entry)
    notify()
    if (!state.bridge) {
      entry.status = 'not recorded'
      notify()
      return false
    }
    try {
      await state.bridge.sendStatement(statement)
      entry.status = 'sent'
      state.sent += 1
    } catch {
      entry.status = 'failed'
      state.failed += 1
    }
    notify()
    return entry.status === 'sent'
  }

  /** The xAPI State resource: the activity's own bookmark (location and a JSON string). */
  async function saveState(location, json) {
    if (!state.bridge) return false
    try {
      await state.bridge.setState(location, json)
      return true
    } catch {
      return false
    }
  }

  window.QTAXapi = {
    connect,
    send,
    saveState,
    onChange: (fn) => state.listeners.push(fn),
    snapshot: () => ({ sent: state.sent, failed: state.failed, log: state.log }),
  }
})()
