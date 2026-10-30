/*
 * "Welcoming visitors to Qatar": five screens, tracked with SCORM 2004. The same logic serves
 * the English and Arabic packages; all text comes from window.QTA_STRINGS (strings.<lang>.js)
 * and the layout direction from <html dir>. Original code and content written for this demo.
 */
;(() => {
  const S = window.QTA_STRINGS
  const SCHEMA = 'wvq-bookmark-1'
  const TOTAL = 5
  const PASS_MARK = 67
  const QUESTIONS = S.s5.questions.length
  const VIDEO_SRC = '/media/c01-welcoming-every-visitor.mp4'
  const POSTER_SRC = '/media/c01-poster.jpg'

  const app = document.getElementById('app')
  const live = document.getElementById('live')
  const statusLine = document.getElementById('status-line')

  const fresh = () => ({
    screen: 1,
    visited: [1],
    video: false,
    needs: [],
    branch: { node: 'start', path: [], feedback: null },
    quiz: { answers: Array(QUESTIONS).fill(null), retries: 0 },
  })
  let state = fresh()

  const fmt = (text, values) =>
    text.replace(/\{(\w+)\}/g, (_, key) => (key in values ? String(values[key]) : ''))
  const esc = (text) =>
    String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

  /* ---------- Bookmark ---------- */

  function serialize() {
    return {
      v: 1,
      s: SCHEMA,
      lang: S.lang,
      screen: state.screen,
      visited: state.visited,
      video: state.video,
      needs: state.needs,
      branch: { node: state.branch.node, path: state.branch.path },
      quiz: state.quiz,
    }
  }

  /** Reads the bookmark. A bookmark from another layout is ignored, never half-used. */
  function restore(lms) {
    let data = null
    try {
      data = lms.suspendData ? JSON.parse(lms.suspendData) : null
    } catch {
      data = null
    }
    if (data && data.s !== SCHEMA) {
      statusLine.hidden = false
      statusLine.textContent = S.incompatible
      return
    }
    if (data) {
      state.screen = Math.min(TOTAL, Math.max(1, Number(data.screen) || 1))
      state.visited = Array.isArray(data.visited) ? data.visited : [state.screen]
      state.video = Boolean(data.video)
      state.needs = Array.isArray(data.needs) ? data.needs : []
      if (data.branch?.node && S.s4.nodes[data.branch.node]) {
        state.branch = { node: data.branch.node, path: data.branch.path || [], feedback: null }
      }
      if (Array.isArray(data.quiz?.answers) && data.quiz.answers.length === QUESTIONS) {
        state.quiz = { answers: data.quiz.answers, retries: Number(data.quiz.retries) || 0 }
      }
      return
    }
    const match = /screen-(\d)/.exec(lms.location || '')
    if (match) state.screen = Math.min(TOTAL, Math.max(1, Number(match[1])))
    if (!state.visited.includes(state.screen)) state.visited.push(state.screen)
  }

  function progress() {
    return Math.min(0.95, state.visited.length / TOTAL)
  }

  function save() {
    window.QTAScorm.saveProgress(`screen-${state.screen}`, serialize(), progress())
  }

  function score() {
    const correct = state.quiz.answers.filter(
      (a, i) => a === S.s5.questions[i].correct,
    ).length
    return { correct, percent: Math.round((correct / QUESTIONS) * 100) }
  }
  const quizDone = () => state.quiz.answers.every((a) => a !== null)

  /* ---------- Rendering ---------- */

  function stepper() {
    const items = S.steps
      .map((name, i) => {
        const n = i + 1
        const current = n === state.screen
        const done = state.visited.includes(n) && !current
        return `<li ${current ? 'aria-current="step"' : ''} data-state="${done ? 'done' : 'todo'}">
          <span class="stepper__bar"></span>
          <span class="stepper__label">${n}. ${esc(name)}</span>
        </li>`
      })
      .join('')
    return `<ol class="stepper" style="--steps:${TOTAL}" aria-label="${esc(
      fmt(S.stepLabel, { n: state.screen, total: TOTAL }),
    )}">${items}</ol>`
  }

  function welcome() {
    const t = S.s1
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <div><h3>${esc(t.objectivesTitle)}</h3>
      <ul class="list">${t.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>
      <p class="note">${esc(t.meta)}</p>`
  }

  function needs() {
    const t = S.s2
    const cards = t.cards
      .map((card, i) => {
        const open = state.needs.includes(i)
        return `<div class="tile">
          <h3><button type="button" class="btn btn--ghost btn--small" data-need="${i}" aria-expanded="${open}" aria-controls="need-${i}">${esc(card.h)}</button></h3>
          <div id="need-${i}" ${open ? '' : 'hidden'}>
            <p>${esc(card.p)}</p>
            <p class="tile__ask">${esc(card.ask)}</p>
          </div>
          ${open ? '' : `<p class="note">${esc(t.revealHint)}</p>`}
        </div>`
      })
      .join('')
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <div class="grid grid--3">${cards}</div>
      <p class="note">${esc(t.tip)}</p>`
  }

  function video() {
    const t = S.s3
    const isAr = S.lang === 'ar'
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <video id="video" class="video" controls preload="metadata" poster="${POSTER_SRC}" aria-label="${esc(t.videoLabel)}" playsinline>
        <source src="${VIDEO_SRC}" type="video/mp4" />
        <track kind="captions" srclang="en" label="${esc(t.captionEn)}" src="captions/c01.en.vtt" ${isAr ? '' : 'default'} />
        <track kind="captions" srclang="ar" label="${esc(t.captionAr)}" src="captions/c01.ar.vtt" ${isAr ? 'default' : ''} />
      </video>
      <p class="note">${esc(t.captionsOn)}</p>
      <p class="note" id="video-state" ${state.video ? '' : 'hidden'}>${esc(t.watched)}</p>
      <details class="transcript"><summary>${esc(t.transcriptTitle)}</summary><p>${esc(t.transcript)}</p></details>`
  }

  function speech(who, line) {
    return `<div class="speech"><p class="speech__who">${esc(who)}</p><p>${esc(line)}</p></div>`
  }

  function branching() {
    const t = S.s4
    const node = t.nodes[state.branch.node]
    const head = `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>
      <p class="note">${esc(t.scene)}</p>`
    if (node.tone) {
      return `${head}
        <div class="feedback" data-tone="${node.tone}" role="status"><strong>${esc(node.title)}</strong>${esc(node.text)}</div>
        <p class="note">${esc(fmt(t.pathLabel, { n: state.branch.path.length }))}</p>
        <button type="button" class="btn btn--ghost" data-branch-restart>${esc(t.tryAgain)}</button>`
    }
    const answered = state.branch.feedback
    const options = node.options
      .map((o) => {
        const picked = answered?.id === o.id
        return `<button type="button" class="option" data-option="${o.id}" ${answered ? 'disabled' : ''} ${picked ? 'aria-pressed="true"' : ''}>
          <span class="option__mark" aria-hidden="true">${o.id.toUpperCase()}</span><span>${o.text}</span></button>`
      })
      .join('')
    return `${head}
      ${speech(t.visitor, node.line)}
      <fieldset class="options"><legend class="visually-hidden">${esc(node.prompt)}</legend>
      <p><strong>${esc(node.prompt)}</strong></p>${options}</fieldset>
      ${
        answered
          ? `<div class="feedback" role="status"><strong>${esc(t.you)}</strong>${esc(answered.feedback)}</div>
             <button type="button" class="btn" data-branch-continue>${esc(t.continue)} <span class="arrow" aria-hidden="true">→</span></button>`
          : ''
      }`
  }

  function quiz() {
    const t = S.s5
    const done = quizDone()
    const result = score()
    const blocks = t.questions
      .map((q, qi) => {
        const answer = state.quiz.answers[qi]
        const answered = answer !== null
        const opts = q.options
          .map((text, oi) => {
            const state_ = !answered
              ? ''
              : oi === q.correct
                ? 'correct'
                : oi === answer
                  ? 'incorrect'
                  : ''
            return `<button type="button" class="option" data-q="${qi}" data-a="${oi}" ${answered ? 'disabled' : ''} ${state_ ? `data-result="${state_}"` : ''}>
              <span class="option__mark" aria-hidden="true">${'ABC'[oi] ?? oi + 1}</span><span>${text}</span></button>`
          })
          .join('')
        const fb = answered
          ? `<div class="feedback" data-tone="${answer === q.correct ? 'good' : 'try'}" role="status"><strong>${esc(
              answer === q.correct ? t.correct : t.incorrect,
            )}</strong>${esc(q.why)}</div>`
          : ''
        return `<fieldset class="options"><legend><span class="note">${esc(
          fmt(t.qOf, { n: qi + 1, total: QUESTIONS }),
        )}</span><br /><strong>${q.q}</strong></legend>${opts}${fb}</fieldset>`
      })
      .join('')
    const passed = result.percent >= PASS_MARK
    const summary = done
      ? `<div class="result" data-pass="${passed}" role="status">
          <p>${esc(t.scoreLabel)}</p>
          <p class="result__score"><bdi dir="ltr">${result.percent}%</bdi></p>
          <p><strong>${esc(passed ? t.passedTitle : t.failedTitle)}</strong></p>
          <p>${esc(fmt(passed ? t.passNote : t.failNote, { n: result.correct, total: QUESTIONS }))}</p>
          ${passed ? '' : `<p><button type="button" class="btn" data-quiz-retry>${esc(t.retry)}</button></p>`}
        </div>`
      : ''
    return `<p class="eyebrow">${esc(t.eyebrow)}</p>
      <h2 id="screen-title" tabindex="-1">${esc(t.h)}</h2>
      <p class="lead">${esc(t.lead)}</p>${blocks}${summary}`
  }

  const SCREENS = [welcome, needs, video, branching, quiz]

  function render(moveFocus) {
    const nav = `<div class="nav">
      <button type="button" class="btn btn--ghost" data-back ${state.screen === 1 ? 'disabled' : ''}><span class="arrow" aria-hidden="true">←</span> ${esc(S.back)}</button>
      <button type="button" class="btn" data-next ${state.screen === TOTAL ? 'disabled' : ''}>${esc(S.next)} <span class="arrow" aria-hidden="true">→</span></button>
    </div>`
    app.innerHTML = `${stepper()}<section class="card" aria-labelledby="screen-title">${SCREENS[state.screen - 1]()}${nav}</section>`
    if (moveFocus) document.getElementById('screen-title')?.focus()
    if (state.screen === 3) wireVideo()
  }

  function wireVideo() {
    const el = document.getElementById('video')
    if (!el) return
    const mark = () => {
      if (state.video) return
      state.video = true
      document.getElementById('video-state')?.removeAttribute('hidden')
      save()
    }
    el.addEventListener('ended', mark)
    el.addEventListener('timeupdate', () => {
      if (el.duration && el.currentTime / el.duration >= 0.9) mark()
    })
  }

  function announce(message) {
    live.textContent = ''
    window.setTimeout(() => {
      live.textContent = message
    }, 30)
  }

  function go(screen) {
    state.screen = Math.min(TOTAL, Math.max(1, screen))
    if (!state.visited.includes(state.screen)) state.visited.push(state.screen)
    render(true)
    save()
    announce(fmt(S.announce.screen, { n: state.screen, total: TOTAL, name: S.steps[state.screen - 1] }))
  }

  /* ---------- Events ---------- */

  function reportQuiz() {
    const result = score()
    window.QTAScorm.recordScore(result.percent, PASS_MARK)
  }

  app.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null
    if (!target) return
    if (target.hasAttribute('data-back')) return go(state.screen - 1)
    if (target.hasAttribute('data-next')) return go(state.screen + 1)
    if (target.dataset.need !== undefined) {
      const i = Number(target.dataset.need)
      state.needs = state.needs.includes(i) ? state.needs.filter((n) => n !== i) : [...state.needs, i]
      render(false)
      document.querySelector(`[data-need="${i}"]`)?.focus()
      return save()
    }
    if (target.dataset.option) {
      const node = S.s4.nodes[state.branch.node]
      const option = node.options.find((o) => o.id === target.dataset.option)
      if (!option) return
      state.branch.feedback = { id: option.id, feedback: option.feedback, next: option.next }
      state.branch.path = [...state.branch.path, `${state.branch.node}:${option.id}`]
      render(false)
      document.querySelector('[data-branch-continue]')?.focus()
      return save()
    }
    if (target.hasAttribute('data-branch-continue')) {
      state.branch = { node: state.branch.feedback.next, path: state.branch.path, feedback: null }
      render(false)
      document.getElementById('screen-title')?.focus()
      return save()
    }
    if (target.hasAttribute('data-branch-restart')) {
      state.branch = { node: 'start', path: [], feedback: null }
      render(true)
      return save()
    }
    if (target.dataset.q !== undefined) {
      const q = Number(target.dataset.q)
      state.quiz.answers = state.quiz.answers.map((a, i) => (i === q ? Number(target.dataset.a) : a))
      render(false)
      if (quizDone()) reportQuiz()
      save()
      return
    }
    if (target.hasAttribute('data-quiz-retry')) {
      state.quiz = { answers: Array(QUESTIONS).fill(null), retries: state.quiz.retries + 1 }
      render(true)
      return save()
    }
    if (target.hasAttribute('data-exit')) window.QTAScorm.saveAndExit()
  })

  document.querySelector('[data-exit]')?.addEventListener('click', () => window.QTAScorm.saveAndExit())

  /** The host calls this before it switches language, so the bookmark is committed first. */
  window.QTAContent = {
    saveNow: () => {
      save()
      return true
    },
    packageId: S.packageId,
    schema: SCHEMA,
  }

  /* ---------- Start ---------- */

  const lms = window.QTAScorm.initialize({
    onError: (message) => {
      statusLine.hidden = false
      statusLine.textContent = message
    },
  })
  if (!lms.connected) document.getElementById('preview-banner').hidden = false
  else if (lms.entry === 'resume' || lms.suspendData || lms.location) restore(lms)
  if (!state.visited.includes(state.screen)) state.visited.push(state.screen)
  render(false)
  if (lms.connected) save()
})()
