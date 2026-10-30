/*
 * Qatar Tourism Academy SCORM 2004 (4th edition) runtime wrapper for the Content Library packages.
 * Finds API_1484_11, wraps Initialize/GetValue/SetValue/Commit/Terminate, tracks session time and
 * reports to the host page with postMessage. Original code written for this demo.
 * Exposes window.QTAScorm.
 */
;(() => {
  const MAX_PARENT_DEPTH = 7
  const SUSPEND_LIMIT = 4000

  const state = {
    api: null,
    initialized: false,
    terminated: false,
    startedAt: Date.now(),
    location: '',
    completion: 'unknown',
    success: 'unknown',
    scoreRaw: null,
    progress: 0,
    onError: null,
  }

  function findApiIn(win) {
    let current = win
    let depth = 0
    while (current && depth <= MAX_PARENT_DEPTH) {
      try {
        if (current.API_1484_11) return current.API_1484_11
      } catch {
        return null
      }
      if (!current.parent || current.parent === current) break
      current = current.parent
      depth += 1
    }
    return null
  }

  function reportError(action, element) {
    if (!state.api) return
    const code = String(state.api.GetLastError())
    // 403 = value not initialized: expected on a first launch, not an error.
    if (code === '0' || (action === 'GetValue' && code === '403')) return
    const text = state.api.GetErrorString(code)
    const where = element ? `${action}(${element})` : action
    if (typeof state.onError === 'function') state.onError(`LMS error ${code} on ${where}: ${text}`)
  }

  function call(action, ...args) {
    if (!state.api || !state.initialized || state.terminated) return ''
    const result = state.api[action](...args)
    if (action === 'GetValue') {
      if (result === '') reportError(action, args[0])
      return result
    }
    if (String(result) !== 'true') reportError(action, args[0])
    return result
  }

  const getValue = (element) => call('GetValue', element)
  const setValue = (element, value) => call('SetValue', element, String(value))

  function formatDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    let out = 'PT'
    if (hours) out += `${hours}H`
    if (minutes) out += `${minutes}M`
    out += `${seconds}S`
    return out
  }

  function postToHost(message) {
    if (window.parent === window) return
    try {
      window.parent.postMessage(message, window.location.origin)
    } catch {
      // Host on another origin: live status is optional.
    }
  }

  function commit() {
    if (!state.api || !state.initialized || state.terminated) return
    setValue('cmi.session_time', formatDuration(Date.now() - state.startedAt))
    call('Commit', '')
    postToHost({
      type: 'qta-scorm-status',
      location: state.location,
      completion: state.completion,
      success: state.success,
      scoreRaw: state.scoreRaw,
    })
  }

  /** Connects to the LMS. Returns what the LMS held: entry, location, suspend data, status. */
  function initialize(options) {
    state.onError = options?.onError || null
    state.api = findApiIn(window)
    const result = {
      connected: false,
      entry: '',
      location: '',
      suspendData: '',
      completion: 'unknown',
      success: 'unknown',
      scaled: null,
    }
    if (!state.api) return result
    if (String(state.api.Initialize('')) !== 'true') {
      reportError('Initialize')
      state.api = null
      return result
    }
    state.initialized = true
    result.connected = true
    result.entry = getValue('cmi.entry')
    result.location = getValue('cmi.location')
    result.suspendData = getValue('cmi.suspend_data')
    result.completion = getValue('cmi.completion_status') || 'unknown'
    result.success = getValue('cmi.success_status') || 'unknown'
    const scaled = getValue('cmi.score.scaled')
    result.scaled = scaled === '' ? null : Number(scaled)
    state.location = result.location
    state.completion = result.completion
    state.success = result.success
    if (result.scaled !== null && !Number.isNaN(result.scaled)) {
      state.scoreRaw = Math.round(result.scaled * 100)
    }
    return result
  }

  const isCompleted = () => state.completion === 'completed'

  /** Bookmark: location, suspend_data and progress, then Commit. Never writes truncated JSON. */
  function saveProgress(location, data, progress) {
    state.location = location
    state.progress = progress
    if (!state.api || state.terminated) return
    const json = JSON.stringify(data)
    setValue('cmi.location', location)
    if (json.length <= SUSPEND_LIMIT) setValue('cmi.suspend_data', json)
    if (!isCompleted()) {
      state.completion = 'incomplete'
      setValue('cmi.completion_status', 'incomplete')
    }
    setValue('cmi.progress_measure', isCompleted() ? 1 : Math.min(1, Math.max(0, progress)))
    commit()
  }

  /**
   * Record the quiz result (percent 0..100). A pass completes the package; a miss leaves it
   * incomplete so the learner can try again.
   */
  function recordScore(percent, passMark) {
    const raw = Math.round(Math.min(100, Math.max(0, percent)))
    const passed = raw >= passMark
    state.scoreRaw = raw
    state.success = passed ? 'passed' : 'failed'
    state.completion = passed ? 'completed' : 'incomplete'
    if (!state.api || state.terminated) return
    setValue('cmi.score.min', 0)
    setValue('cmi.score.max', 100)
    setValue('cmi.score.raw', raw)
    setValue('cmi.score.scaled', (raw / 100).toFixed(2))
    setValue('cmi.success_status', state.success)
    setValue('cmi.completion_status', state.completion)
    setValue('cmi.progress_measure', passed ? 1 : state.progress)
    commit()
  }

  /** Save, set cmi.exit and Terminate. Safe to call more than once. */
  function terminate() {
    if (!state.api || !state.initialized || state.terminated) return false
    setValue('cmi.exit', isCompleted() ? 'normal' : 'suspend')
    commit()
    call('Terminate', '')
    state.terminated = true
    return true
  }

  function saveAndExit() {
    terminate()
    postToHost({ type: 'qta-scorm-exit' })
  }

  window.addEventListener('pagehide', terminate)
  window.addEventListener('beforeunload', terminate)

  window.QTAScorm = {
    initialize,
    saveProgress,
    recordScore,
    saveAndExit,
    isCompleted,
    formatDuration,
    connected: () => state.initialized,
  }
})()
