/*
 * Scenes, quiz and rendering for "Recovering a difficult service moment".
 * Depends on window.QTAScorm (runtime.js).
 */
;(() => {
  const TOTAL_STEPS = 6
  const PASS_MARK = 80
  const SCENE_IDS = ['scene-1', 'scene-2', 'scene-3', 'scene-4', 'scene-5', 'scene-6']
  const VISITOR_LINE =
    'I booked this experience for today and now I am told it is unavailable. What can you do?'

  /* ---------- Content ---------- */

  const PRACTICE = {
    'scene-2': {
      eyebrow: 'Acknowledge',
      title: 'Choose your first response',
      context:
        'The visitor has just arrived at your desk. Their desert experience was booked for 2:00 pm today, and the operator has moved it. They are visibly frustrated.',
      legend: 'Which response should come first?',
      options: [
        {
          id: 'a',
          text: 'I am so sorry for the inconvenience. I can see how disappointing this is when you planned your day around it. Let me look at what we can do right now.',
          correct: true,
          feedback:
            'This acknowledges the impact on the visitor and apologises for the inconvenience without blaming anyone. It also signals that action is coming next.',
        },
        {
          id: 'b',
          text: 'The operator changed it, not us, so there is not much I can do about that.',
          correct: false,
          feedback:
            'Shifting blame to the operator does not help the visitor and closes the conversation. Acknowledge the impact first, then focus on what you can do.',
        },
        {
          id: 'c',
          text: 'These things happen with desert trips. Could you come back later when we know more?',
          correct: false,
          feedback:
            'This minimises the problem and sends the visitor away without support. Start by recognising how they feel and apologising for the inconvenience.',
        },
      ],
    },
    'scene-3': {
      eyebrow: 'Offer options',
      title: 'Choose a feasible pair of options',
      context:
        'You have called the operator. They confirmed two open departures. Now you need to present options the visitor can actually rely on.',
      legend: 'Which pair of options should you offer?',
      options: [
        {
          id: 'a',
          text: 'Keep the original 2:00 pm slot and tell the visitor you will find a way to make it work.',
          correct: false,
          feedback:
            'The operator has already moved this slot. Promising it anyway sets up a second, bigger disappointment. Only offer what has been confirmed.',
        },
        {
          id: 'b',
          text: 'Two alternatives confirmed by the operator: a 4:30 pm sunset departure today, or an 8:00 am departure tomorrow with hotel pickup.',
          correct: true,
          feedback:
            'Both options are real, verified, and have times confirmed by the operator. Offering a choice gives the visitor back a sense of control.',
        },
        {
          id: 'c',
          text: 'Offer a full refund on the spot, even though refunds of this size need supervisor approval.',
          correct: false,
          feedback:
            'A refund may be right later, but promising one outside your authority is an unapproved commitment. Offer verified alternatives first.',
        },
      ],
    },
    'scene-4': {
      eyebrow: 'Escalate',
      title: 'Know when and how to escalate',
      context:
        'The visitor thanks you, but explains they fly home at 7:00 am tomorrow and are staying far from the 4:30 pm meeting point. Neither option works for them.',
      legend: 'What should you do now?',
      options: [
        {
          id: 'a',
          text: 'Create an exception yourself, such as promising a free private tour this evening, to keep the visitor happy.',
          correct: false,
          feedback:
            'Inventing an exception you cannot guarantee risks another broken promise. Exceptions belong to someone with the authority to approve them.',
        },
        {
          id: 'b',
          text: 'Suggest the visitor post a complaint online so the operator takes the issue seriously.',
          correct: false,
          feedback:
            'This hands your responsibility back to the visitor. The issue should be resolved through the right internal channel, not a public review.',
        },
        {
          id: 'c',
          text: "Since the visitor's need cannot be met within your authority, escalate to the duty supervisor with a clear summary, and tell the visitor when they will hear back.",
          correct: true,
          feedback:
            'Correct. A clear summary means the supervisor does not have to ask the visitor to repeat everything, and a time to hear back keeps trust intact.',
        },
      ],
    },
  }

  const QUIZ = [
    {
      id: 'q1',
      topic: 'Acknowledgement',
      prompt:
        'A visitor tells you their booked experience has been moved. What should your first words do?',
      options: [
        { id: 'a', text: 'Explain the operator scheduling policy in detail' },
        { id: 'b', text: 'Acknowledge the impact and apologise for the inconvenience' },
        { id: 'c', text: 'Make it clear the change was not your decision' },
        { id: 'd', text: 'Ask them to wait while you check, without saying more' },
      ],
      answer: 'b',
      review:
        'Open by acknowledging how the change affects the visitor and apologising for the inconvenience, without blaming anyone.',
    },
    {
      id: 'q2',
      topic: 'Verifying availability',
      prompt: 'Before you offer an alternative time, what must you do?',
      options: [
        { id: 'a', text: 'Assume the next slot is free, since it usually is' },
        { id: 'b', text: 'Offer the time the visitor prefers and check later' },
        { id: 'c', text: 'Confirm availability directly with the operator' },
        { id: 'd', text: 'Ask the visitor to call the operator themselves' },
      ],
      answer: 'c',
      review:
        'Only offer times the operator has confirmed. An unverified slot can turn one disappointment into two.',
    },
    {
      id: 'q3',
      topic: 'Feasible options',
      prompt: 'Which of these is the best pair of options to present?',
      options: [
        { id: 'a', text: 'The original slot, because you will try to make it work' },
        { id: 'b', text: 'A full refund now, although refunds need approval' },
        { id: 'c', text: 'A list of every operator in the city to choose from' },
        { id: 'd', text: 'Two alternatives with times confirmed by the operator' },
      ],
      answer: 'd',
      review:
        'Two verified alternatives give the visitor a real choice. Avoid promising cancelled slots or approvals you do not hold.',
    },
    {
      id: 'q4',
      topic: 'Escalation',
      prompt:
        "Neither option meets the visitor's need, and a solution is outside your authority. What next?",
      options: [
        { id: 'a', text: 'Escalate to the duty supervisor with a clear summary' },
        { id: 'b', text: 'Promise a private tour that you cannot arrange yourself' },
        { id: 'c', text: 'Suggest they leave an online review' },
        { id: 'd', text: 'Tell them nothing more can be done' },
      ],
      answer: 'a',
      review:
        'When a need is beyond your authority, escalate to the duty supervisor with a clear summary instead of inventing an exception.',
    },
    {
      id: 'q5',
      topic: 'Confirming follow-up',
      prompt: 'After escalating, how should you close the conversation with the visitor?',
      options: [
        { id: 'a', text: 'Say the supervisor will be in touch at some point' },
        { id: 'b', text: 'Confirm the next step, when they will hear back, and how' },
        { id: 'c', text: 'Give them your personal mobile number' },
        { id: 'd', text: 'End the conversation once the case is passed on' },
      ],
      answer: 'b',
      review:
        'Close by confirming the agreed next step, the time they will hear back, and the contact method. Vague follow-up erodes trust.',
    },
  ]

  /* ---------- State ---------- */

  const model = {
    scene: 'scene-1',
    choices: {},
    quiz: {},
    score: null,
  }
  let exited = false

  const app = document.getElementById('app')
  const statusLine = document.getElementById('status-line')
  const liveRegion = document.getElementById('live')

  function suspendPayload() {
    return {
      v: 1,
      scene: model.scene,
      choices: model.choices,
      quiz: model.quiz,
      score: model.score,
    }
  }

  function stepNumber(sceneId) {
    return SCENE_IDS.indexOf(sceneId) + 1
  }

  function persist() {
    const progress = (stepNumber(model.scene) - 1) / TOTAL_STEPS
    window.QTAScorm.saveProgress(model.scene, suspendPayload(), progress)
  }

  function announce(text) {
    liveRegion.textContent = ''
    window.setTimeout(() => {
      liveRegion.textContent = text
    }, 30)
  }

  function showError(text) {
    statusLine.textContent = text
    statusLine.hidden = false
  }

  /* ---------- Rendering helpers ---------- */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function progressMarkup(step) {
    let segments = ''
    for (let i = 1; i <= TOTAL_STEPS; i += 1) {
      const cls = i < step ? 'is-done' : i === step ? 'is-current' : ''
      segments += `<span class="progress__seg ${cls}"></span>`
    }
    return `
      <div class="progress">
        <p class="progress__label">Step ${step} of ${TOTAL_STEPS}</p>
        <div class="progress__track" role="progressbar" aria-label="Module progress"
          aria-valuemin="1" aria-valuemax="${TOTAL_STEPS}" aria-valuenow="${step}"
          aria-valuetext="Step ${step} of ${TOTAL_STEPS}">${segments}</div>
      </div>`
  }

  function optionMarkup(name, option, checked, extraClass) {
    return `
      <label class="option ${extraClass || ''}">
        <input type="radio" name="${name}" value="${option.id}" ${checked ? 'checked' : ''} />
        <span class="option__dot" aria-hidden="true"></span>
        <span class="option__text">${escapeHtml(option.text)}</span>
      </label>`
  }

  function cardShell(sceneId, eyebrow, title, body, actions) {
    return `
      <article class="card" data-scene="${sceneId}">
        ${progressMarkup(stepNumber(sceneId))}
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2 class="scene-title" tabindex="-1">${escapeHtml(title)}</h2>
        ${body}
        <div class="actions">${actions}</div>
      </article>`
  }

  function backButton(target) {
    return `<button type="button" class="btn btn--ghost" data-go="${target}">Back</button>`
  }

  function quoteMarkup() {
    return `
      <figure class="quote">
        <blockquote><p>${escapeHtml(VISITOR_LINE)}</p></blockquote>
        <figcaption>The visitor, at the concierge desk</figcaption>
      </figure>`
  }

  /* ---------- Scenes ---------- */

  function renderIntro() {
    const body = `
      <p class="lede">A visitor booked a desert experience for this afternoon. This morning the operator moved it, and the visitor has just found out.</p>
      ${quoteMarkup()}
      <h3 class="subhead">In this module you will practise how to</h3>
      <ol class="goals">
        <li><span class="goals__num" aria-hidden="true">1</span><span><strong>Acknowledge</strong> the impact on the visitor and apologise for the inconvenience.</span></li>
        <li><span class="goals__num" aria-hidden="true">2</span><span><strong>Offer feasible options</strong> that you have verified with the operator.</span></li>
        <li><span class="goals__num" aria-hidden="true">3</span><span><strong>Escalate correctly</strong> when a need is beyond your authority.</span></li>
      </ol>
      <p class="meta">Three short practice moments, then a five question check. Pass mark ${PASS_MARK}%.</p>`
    return cardShell(
      'scene-1',
      'Scenario',
      'A changed booking, a disappointed visitor',
      body,
      `<span></span><button type="button" class="btn btn--primary" data-go="scene-2">Start</button>`,
    )
  }

  function feedbackMarkup(sceneId) {
    const saved = model.choices[sceneId]
    if (!saved?.viewed) return ''
    const option = PRACTICE[sceneId].options.find((o) => o.id === saved.c)
    if (!option) return ''
    const label = option.correct ? 'Good choice' : 'Not quite'
    const icon = option.correct ? '&#10003;' : '!'
    const retry = option.correct
      ? ''
      : '<p class="feedback__hint">Choose another response to try again.</p>'
    return `
      <div class="feedback ${option.correct ? 'feedback--good' : 'feedback--warn'}">
        <p class="feedback__label"><span class="badge-icon" aria-hidden="true">${icon}</span>${label}</p>
        <p>${escapeHtml(option.feedback)}</p>
        ${retry}
      </div>`
  }

  function renderPractice(sceneId) {
    const scene = PRACTICE[sceneId]
    const saved = model.choices[sceneId] || {}
    const step = stepNumber(sceneId)
    const options = scene.options.map((o) => optionMarkup(sceneId, o, saved.c === o.id)).join('')
    const body = `
      <p class="lede">${escapeHtml(scene.context)}</p>
      <div class="question" data-practice="${sceneId}">
        <fieldset>
          <legend>${escapeHtml(scene.legend)}</legend>
          <div class="options">${options}</div>
        </fieldset>
        <div class="check-row">
          <button type="button" class="btn btn--secondary" data-check ${saved.c ? '' : 'disabled'}>Check answer</button>
        </div>
      </div>
      <div class="feedback-slot" data-feedback>${feedbackMarkup(sceneId)}</div>`
    const next = SCENE_IDS[step]
    const actions = `${backButton(SCENE_IDS[step - 2])}
      <button type="button" class="btn btn--primary" data-go="${next}" ${saved.viewed ? '' : 'disabled'}>Continue</button>`
    return cardShell(sceneId, scene.eyebrow, scene.title, body, actions)
  }

  function allAnswered() {
    return QUIZ.every((q) => model.quiz[q.id])
  }

  function renderQuiz() {
    const questions = QUIZ.map((q, index) => {
      const options = q.options
        .map((o) => optionMarkup(q.id, o, model.quiz[q.id] === o.id))
        .join('')
      return `
        <div class="quiz-q">
          <fieldset>
            <legend><span class="quiz-q__num">Question ${index + 1} of ${QUIZ.length}</span>${escapeHtml(q.prompt)}</legend>
            <div class="options">${options}</div>
          </fieldset>
        </div>`
    }).join('')
    const answered = QUIZ.filter((q) => model.quiz[q.id]).length
    const body = `
      <p class="lede">Five questions, 20 points each. You need ${PASS_MARK}% to pass. Your answers are saved as you go.</p>
      <div class="quiz" data-quiz>
        ${questions}
        <p class="meta" data-answered>${answered} of ${QUIZ.length} answered</p>
      </div>`
    const actions = `${backButton('scene-4')}
      <button type="button" class="btn btn--primary" data-submit-quiz ${allAnswered() ? '' : 'disabled'}>Submit answers</button>`
    return cardShell('scene-5', 'Knowledge check', 'Check your understanding', body, actions)
  }

  function renderResult() {
    const score = model.score ?? 0
    const passed = score >= PASS_MARK
    const wrong = QUIZ.filter((q) => model.quiz[q.id] && model.quiz[q.id] !== q.answer)
    const review = wrong.length
      ? `<h3 class="subhead">Worth another look</h3>
         <ul class="review">${wrong
           .map(
             (q) =>
               `<li><p class="review__topic"><span class="badge-icon badge-icon--muted" aria-hidden="true">!</span>Question ${QUIZ.indexOf(q) + 1}: ${escapeHtml(q.topic)}</p><p>${escapeHtml(q.review)}</p></li>`,
           )
           .join('')}</ul>`
      : '<p class="meta">You answered every question correctly.</p>'
    const body = `
      <div class="result ${passed ? 'result--pass' : 'result--fail'}">
        <div class="result__score">
          <span class="result__num">${score}</span><span class="result__unit">%</span>
        </div>
        <div>
          <p class="result__status"><span class="result__icon" aria-hidden="true">${passed ? '&#10003;' : '&#8635;'}</span>${passed ? 'Passed' : 'Not yet passed'}</p>
          <p class="result__note">${
            passed
              ? 'Well done. You recovered the moment with care and stayed within your authority.'
              : `You need ${PASS_MARK}% to pass. Review the notes below and try the quiz again.`
          }</p>
        </div>
      </div>
      ${review}
      <p class="meta">This module is marked complete. Retrying the quiz updates your score.</p>`
    const actions = `<button type="button" class="btn btn--ghost" data-retry>Retry quiz</button>
      <button type="button" class="btn btn--primary" data-exit>Save and exit</button>`
    return cardShell(
      'scene-6',
      'Result',
      passed ? 'You passed the knowledge check' : 'Almost there',
      body,
      actions,
    )
  }

  function renderExited() {
    app.innerHTML = `
      <article class="card card--center">
        <h2 class="scene-title" tabindex="-1">Progress saved</h2>
        <p class="lede">Your progress has been saved. You can close this window.</p>
      </article>`
    app.querySelector('.scene-title').focus()
  }

  function render(focusHeading) {
    let html
    if (model.scene === 'scene-1') html = renderIntro()
    else if (PRACTICE[model.scene]) html = renderPractice(model.scene)
    else if (model.scene === 'scene-5') html = renderQuiz()
    else html = renderResult()
    app.innerHTML = html
    if (focusHeading) {
      window.scrollTo(0, 0)
      app.querySelector('.scene-title')?.focus({ preventScroll: true })
    }
  }

  function goTo(sceneId) {
    if (!SCENE_IDS.includes(sceneId)) return
    model.scene = sceneId
    render(true)
    persist()
  }

  /* ---------- Events ---------- */

  function onPracticeChange(group, input) {
    const sceneId = group.dataset.practice
    model.choices[sceneId] = { ...(model.choices[sceneId] || {}), c: input.value }
    group.querySelector('[data-check]').disabled = false
  }

  /* Sandboxed iframes without allow-forms block form submission, so no <form> is used. */
  function onPracticeCheck(group) {
    const sceneId = group.dataset.practice
    const saved = model.choices[sceneId]
    if (!saved?.c) return
    const option = PRACTICE[sceneId].options.find((o) => o.id === saved.c)
    model.choices[sceneId] = { c: saved.c, ok: option.correct, n: (saved.n || 0) + 1, viewed: true }
    app.querySelector('[data-feedback]').innerHTML = feedbackMarkup(sceneId)
    app.querySelector('[data-go].btn--primary').disabled = false
    announce(`${option.correct ? 'Good choice.' : 'Not quite.'} ${option.feedback}`)
    persist()
  }

  function onQuizChange(input) {
    model.quiz[input.name] = input.value
    const answered = QUIZ.filter((q) => model.quiz[q.id]).length
    app.querySelector('[data-answered]').textContent = `${answered} of ${QUIZ.length} answered`
    app.querySelector('[data-submit-quiz]').disabled = !allAnswered()
    persist()
  }

  function submitQuiz() {
    if (!allAnswered()) return
    const correct = QUIZ.filter((q) => model.quiz[q.id] === q.answer).length
    model.score = Math.round((correct / QUIZ.length) * 100)
    window.QTAScorm.recordScore(model.score, PASS_MARK)
    goTo('scene-6')
    announce(
      `Score ${model.score} percent. ${model.score >= PASS_MARK ? 'Passed.' : 'Not yet passed.'}`,
    )
  }

  function retryQuiz() {
    model.quiz = {}
    goTo('scene-5')
  }

  function saveAndExit() {
    if (exited) return
    exited = true
    persist()
    window.QTAScorm.saveAndExit()
    renderExited()
    for (const button of document.querySelectorAll('[data-exit]')) button.disabled = true
  }

  app.addEventListener('change', (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return
    const practice = input.closest('[data-practice]')
    if (practice) onPracticeChange(practice, input)
    else if (input.closest('[data-quiz]')) onQuizChange(input)
  })

  document.addEventListener('click', (event) => {
    if (exited || !(event.target instanceof Element)) return
    const target = event.target.closest('button')
    if (!target || target.disabled) return
    if (target.dataset.go) goTo(target.dataset.go)
    else if (target.hasAttribute('data-check')) onPracticeCheck(target.closest('[data-practice]'))
    else if (target.hasAttribute('data-submit-quiz')) submitQuiz()
    else if (target.hasAttribute('data-retry')) retryQuiz()
    else if (target.hasAttribute('data-exit')) saveAndExit()
  })

  /* ---------- Boot ---------- */

  function restore(saved) {
    if (!saved.suspendData) return
    try {
      const data = JSON.parse(saved.suspendData)
      if (data && typeof data === 'object') {
        model.choices = data.choices && typeof data.choices === 'object' ? data.choices : {}
        model.quiz = data.quiz && typeof data.quiz === 'object' ? data.quiz : {}
        model.score = typeof data.score === 'number' ? data.score : null
        if (SCENE_IDS.includes(data.scene)) model.scene = data.scene
      }
    } catch {
      showError('Saved progress could not be read, so the module starts from the beginning.')
    }
  }

  function boot() {
    const saved = window.QTAScorm.initialize({ onError: showError })
    if (!saved.connected) document.getElementById('preview-banner').hidden = false
    const hasSaved = saved.entry === 'resume' || saved.location || saved.suspendData
    if (hasSaved) {
      restore(saved)
      if (SCENE_IDS.includes(saved.location)) model.scene = saved.location
      if (model.scene === 'scene-6' && model.score === null) model.scene = 'scene-5'
    }
    render(false)
    if (hasSaved && model.scene !== 'scene-1') announce('Welcome back. You are where you left off.')
    persist()
  }

  boot()
})()
