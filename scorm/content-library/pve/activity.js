/*
 * "Planning a visitor experience": four steps, tracked with xAPI statements sent to the
 * simulated learning record store (window.QTAXapi). The same logic serves the English and Arabic
 * activities; text comes from window.QTA_STRINGS and direction from <html dir>.
 * Original code and content written for this demo.
 */
;(() => {
  const S = window.QTA_STRINGS
  const SCHEMA = 'pve-bookmark-1'
  const TOTAL = 4
  const PASS_SCALED = 0.75

  const app = document.getElementById('app')
  const live = document.getElementById('live')
  const statusLine = document.getElementById('status-line')
  const logBox = document.getElementById('lrs-log')

  let state = { step: 1, dest: null, service: null, completed: false, success: false, scaled: null }

  const fmt = (text, values) =>
    text.replace(/\{(\w+)\}/g, (_, key) => (key in values ? String(values[key]) : ''))
  const esc = (text) =>
    String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

  const destOption = () => S.s2.options.find((o) => o.id === state.dest)
  const serviceOption = () => S.s3.options.find((o) => o.id === state.service)
  const scaled = () => ((destOption()?.score ?? 0) + (serviceOption()?.score ?? 0)) / 2

  /* ---------- State document (the bookmark) ---------- */

  const serialize = () => ({
    v: 1,
    s: SCHEMA,
    lang: S.lang,
    step: state.step,
    dest: state.dest,
    service: state.service,
    completed: state.completed,
    success: state.success,
    scaled: state.scaled,
  })

  function restore(saved) {
    if (!saved || !saved.suspendData) return
    let data = null
    try {
      data = JSON.parse(saved.suspendData)
    } catch {
      data = null
    }
    if (!data || data.s !== SCHEMA) {
      statusLine.hidden = false
      statusLine.textContent = S.incompatible
      return
    }
    state = {
      step: Math.min(TOTAL, Math.max(1, Number(data.step) || 1)),
      dest: S.s2.options.some((o) => o.id === data.dest) ? data.dest : null,
      service: S.s3.options.some((o) => o.id === data.service) ? data.service : null,
      completed: Boolean(data.completed),
      success: Boolean(data.success),
      scaled: typeof data.scaled === 'number' ? data.scaled : null,
    }
  }

  const saveState = () => window.QTAXapi.saveState(`step-${state.step}`, JSON.stringify(serialize()))

  /* ---------- Rendering ---------- */

  function stepper() {
    const items = S.steps
      .map((name, i) => {
        const n = i + 1
        const current = n === state.step
        return `<li ${current ? 'aria-current="step"' : ''} data-state="${n < state.step ? 'done' : 'todo'}">
          <span class="stepper__bar"></span><span class="stepper__label">${n}. ${esc(name)}</span></li>`
      })
      .join('')
    return `<ol class="stepper" style="--steps:${TOTAL}" aria-label="${esc(
      fmt(S.stepLabel, { n: state.step, total: TOTAL }),
    )}">${items}</ol>`
  }

  function meet() {
    const t = S.s1
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <p><button type="button" class="btn" data-go="2">${esc(t.start)} <span class="arrow" aria-hidden="true">→</span></button></p>`
  }

  function options(list, selected, group, withTitle) {
    return list
      .map(
        (o, i) => `<button type="button" class="option" data-group="${group}" data-id="${o.id}" aria-pressed="${selected === o.id}">
          <span class="option__mark" aria-hidden="true">${'ABC'[i]}</span>
          <span>${withTitle ? `<strong>${esc(o.title)}</strong><br />` : ''}${esc(o.text)}</span></button>`,
      )
      .join('')
  }

  function feedbackBox(option) {
    if (!option) return ''
    const tone = option.score >= 1 ? 'good' : option.score > 0 ? '' : 'try'
    return `<div class="feedback" ${tone ? `data-tone="${tone}"` : ''} role="status">${esc(option.feedback)}</div>`
  }

  function destination() {
    const t = S.s2
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <div class="options" role="group" aria-label="${esc(t.h)}">${options(t.options, state.dest, 'dest', true)}</div>
      ${feedbackBox(destOption())}`
  }

  function service() {
    const t = S.s3
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <div class="options" role="group" aria-label="${esc(t.h)}">${options(t.options, state.service, 'service', false)}</div>
      ${feedbackBox(serviceOption())}`
  }

  function complete() {
    const t = S.s4
    const ready = state.dest && state.service
    const percent = Math.round((state.completed ? (state.scaled ?? 0) : scaled()) * 100)
    const outcome = state.completed
      ? `<div class="result" data-pass="${state.success}" role="status">
          <p class="result__score"><bdi dir="ltr">${percent}%</bdi></p>
          <p>${esc(state.success ? t.passNote : t.failNote)}</p>
          ${state.success ? `<p>${esc(t.done)}</p>` : `<p><button type="button" class="btn" data-retry>${esc(t.retry)}</button></p>`}
        </div>`
      : ''
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <dl class="grid grid--2">
        <div class="tile"><dt class="eyebrow">${esc(t.destination)}</dt><dd style="margin:6px 0 0">${esc(destOption()?.title ?? '—')}</dd></div>
        <div class="tile"><dt class="eyebrow">${esc(t.response)}</dt><dd style="margin:6px 0 0">${esc(serviceOption()?.text ?? '—')}</dd></div>
      </dl>
      ${ready ? '' : `<p class="note">${esc(t.missing)}</p>`}
      ${state.completed ? outcome : `<p><button type="button" class="btn" data-complete ${ready ? '' : 'disabled'}>${esc(t.complete)}</button></p>`}`
  }

  const SCREENS = [meet, destination, service, complete]

  function canAdvance() {
    if (state.step === 2) return Boolean(state.dest)
    if (state.step === 3) return Boolean(state.service)
    return state.step < TOTAL
  }

  function render(moveFocus) {
    const nav =
      state.step === 1
        ? ''
        : `<div class="nav">
      <button type="button" class="btn btn--ghost" data-back><span class="arrow" aria-hidden="true">←</span> ${esc(S.back)}</button>
      <button type="button" class="btn" data-next ${canAdvance() ? '' : 'disabled'}>${esc(S.next)} <span class="arrow" aria-hidden="true">→</span></button>
    </div>`
    app.innerHTML = `${stepper()}<section class="card" aria-labelledby="screen-title">${SCREENS[state.step - 1]()}${nav}</section>`
    if (moveFocus) document.getElementById('screen-title')?.focus()
  }

  function renderLog(snap) {
    const label = { sent: S.lrs.sent, failed: S.lrs.failed, pending: S.lrs.pending, 'not recorded': S.lrs.notRecorded }
    const items = snap.log
      .slice(0, 8)
      .map((e) => `<li><bdi dir="ltr"><code>${esc(e.verb)}${e.part ? `/${esc(e.part)}` : ''}</code></bdi>: ${esc(label[e.status] ?? e.status)}</li>`)
      .join('')
    logBox.innerHTML = `<summary>${esc(fmt(S.lrs.summary, { n: snap.sent }))}</summary>
      <p class="note">${esc(S.lrs.note)}</p><ol>${items}</ol>`
  }

  function go(step) {
    state.step = Math.min(TOTAL, Math.max(1, step))
    render(true)
    void saveState()
    live.textContent = fmt(S.announce.step, { n: state.step, total: TOTAL, name: S.steps[state.step - 1] })
  }

  /* ---------- Events ---------- */

  app.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null
    if (!target) return
    if (target.dataset.go) return go(Number(target.dataset.go))
    if (target.hasAttribute('data-back')) return go(state.step - 1)
    if (target.hasAttribute('data-next') && canAdvance()) return go(state.step + 1)
    if (target.dataset.group === 'dest') {
      state.dest = target.dataset.id
      const option = destOption()
      render(false)
      document.querySelector(`[data-group="dest"][data-id="${state.dest}"]`)?.focus()
      void window.QTAXapi.send('experienced', 'destination', option.title, {
        response: option.title,
        success: option.score >= 1,
      })
      return void saveState()
    }
    if (target.dataset.group === 'service') {
      state.service = target.dataset.id
      const option = serviceOption()
      render(false)
      document.querySelector(`[data-group="service"][data-id="${state.service}"]`)?.focus()
      void window.QTAXapi.send('answered', 'service-response', S.s3.h, {
        response: option.id,
        success: option.score >= 1,
        score: { scaled: option.score },
      })
      return void saveState()
    }
    if (target.hasAttribute('data-complete')) {
      if (!state.dest || !state.service) return
      const value = scaled()
      state.completed = true
      state.scaled = value
      state.success = value >= PASS_SCALED
      render(false)
      void window.QTAXapi.send('completed', '', S.title, {
        completion: true,
        success: state.success,
        score: { scaled: value, raw: Math.round(value * 100), max: 100 },
      })
      return void saveState()
    }
    if (target.hasAttribute('data-retry')) {
      state = { step: 2, dest: null, service: null, completed: false, success: false, scaled: null }
      render(true)
      return void saveState()
    }
  })

  document.querySelector('[data-exit]')?.addEventListener('click', () => {
    void saveState().then(() => {
      if (window.parent !== window) {
        try {
          window.parent.postMessage({ type: 'qta-xapi-exit' }, window.location.origin)
        } catch {
          // Host on another origin: nothing to tell.
        }
      }
    })
  })

  /** The host calls this before it switches language, so the state document is saved first. */
  window.QTAContent = {
    saveNow: () => saveState(),
    packageId: S.packageId,
    schema: SCHEMA,
  }

  /* ---------- Start ---------- */

  const link = window.QTAXapi.connect()
  window.QTAXapi.onChange(renderLog)
  if (!link.connected) document.getElementById('preview-banner').hidden = false
  else restore(link.state)
  render(false)
  renderLog(window.QTAXapi.snapshot())
  if (link.connected) {
    void window.QTAXapi.send('initialized', '', S.title, undefined)
    void saveState()
  }
})()
