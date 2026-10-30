import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Scorm2004API } from 'scorm-again/scorm2004'
import type { StatementInput } from '@/services/xapi/statement'

/**
 * The built Content Library packages run for real: their own scripts execute against a DOM and a
 * scorm-again runtime (SCORM) or a launch bridge (xAPI). Checks launch, navigation, bookmark and
 * resume, the quiz score and completion, the xAPI statements, and that the Arabic package is
 * properly right-to-left. The packages are loaded from client/public/content (bun run content:build).
 */

const ROOT = join(import.meta.dir, '../../../../public/content')
const read = (packageId: string, file: string) => readFileSync(join(ROOT, packageId, file), 'utf8')

type Scorm = Scorm2004API

declare global {
  interface Window {
    API_1484_11?: unknown
    QTA_STRINGS?: Record<string, unknown>
    QTAContent?: { saveNow: () => unknown }
  }
}

/** Runs a package script in the page's global scope, as a <script> tag would. */
const run = (code: string) => new Function(code).call(globalThis)
const len = (value: unknown): number => (Array.isArray(value) ? value.length : -1)

/** Puts the package page in the document and returns once its scripts have run. */
function launch(packageId: string, scripts: string[]) {
  const html = read(packageId, 'index.html')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  document.documentElement.lang = doc.documentElement.lang
  document.documentElement.dir = doc.documentElement.dir
  document.body.innerHTML = doc.body.innerHTML.replace(/<script[^>]*><\/script>/g, '')
  for (const script of scripts) run(read(packageId, script))
}

const scormApi = (cmi: Record<string, unknown> = {}): Scorm => {
  const api = new Scorm2004API({ lmsCommitUrl: false, autocommit: false, logLevel: 5 })
  api.loadFromJSON({ cmi })
  window.API_1484_11 = api
  return api
}

const heading = () => document.getElementById('screen-title')?.textContent ?? ''
const click = (selector: string) => {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`No element matches ${selector}`)
  el.click()
}
type Section = Record<string, unknown>
type Strings = {
  packageId: string
  incompatible: string
  s1: Section
  s2: Section
  s3: Section
  s4: Section
  s5: Section
}
const strings = () => window.QTA_STRINGS as unknown as Strings

beforeEach(() => {
  document.body.innerHTML = ''
})
afterEach(() => {
  delete window.API_1484_11
  delete window.QTA_LRS
  document.body.innerHTML = ''
})

const SCORM_PACKAGES = [
  { id: 'wvq-en-scorm2004', lang: 'en', dir: 'ltr' },
  { id: 'wvq-ar-scorm2004', lang: 'ar', dir: 'rtl' },
] as const
const SCORM_FILES = ['qta-scorm.js', 'strings.js', 'player.js']

describe.each(SCORM_PACKAGES)('SCORM package $id', ({ id, lang, dir }) => {
  test('is a SCORM 2004 package with its own id, language and direction', () => {
    const manifest = read(id, 'imsmanifest.xml')
    expect(manifest).toContain('<schemaversion>2004 4th Edition</schemaversion>')
    expect(manifest).toContain(`identifier="${id.toUpperCase()}"`)
    expect(manifest).toContain(`xml:lang="${lang}"`)
    expect(manifest).toContain('adlcp:scormType="sco"')
    const html = read(id, 'index.html')
    expect(html).toContain(`<html lang="${lang}" dir="${dir}">`)
  })

  test('launches on screen 1 of 5 in its own language', () => {
    const api = scormApi()
    launch(id, SCORM_FILES)
    expect(document.documentElement.dir).toBe(dir)
    expect(heading()).toBe(strings().s1?.h as string)
    expect(document.querySelectorAll('.stepper li')).toHaveLength(5)
    expect(api.cmi.completion_status).toBe('incomplete')
    expect(api.cmi.location).toBe('screen-1')
    expect(window.QTAContent?.saveNow).toBeDefined()
  })

  test('the video screen carries captions in both languages, defaulting to its own', () => {
    scormApi()
    launch(id, SCORM_FILES)
    click('[data-next]')
    click('[data-next]')
    const tracks = [...document.querySelectorAll<HTMLTrackElement>('video track')]
    expect(tracks.map((t) => t.getAttribute('srclang')).sort()).toEqual(['ar', 'en'])
    const defaults = tracks.filter((t) => t.hasAttribute('default'))
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?.getAttribute('srclang')).toBe(lang)
    expect(read(id, 'captions/c01.ar.vtt')).toContain('WEBVTT')
    expect(read(id, 'captions/c01.en.vtt')).toContain('WEBVTT')
  })

  test('bookmark: location and suspend data are committed and resume on relaunch', () => {
    const first = scormApi()
    launch(id, SCORM_FILES)
    click('[data-next]')
    click('[data-next]')
    expect(first.cmi.location).toBe('screen-3')
    const saved = JSON.parse(first.cmi.suspend_data)
    expect(saved).toMatchObject({ s: 'wvq-bookmark-1', lang, screen: 3 })

    // A new launch with what the LMS stored: entry "resume" and the same screen.
    scormApi({
      entry: 'resume',
      location: first.cmi.location,
      suspend_data: first.cmi.suspend_data,
    })
    launch(id, SCORM_FILES)
    expect(heading()).toBe(strings().s3?.h as string)
  })

  test('a bookmark from a different layout is ignored and the package starts over', () => {
    scormApi({
      entry: 'resume',
      location: 'screen-4',
      suspend_data: JSON.stringify({ v: 1, s: 'other-layout', screen: 4 }),
    })
    launch(id, SCORM_FILES)
    expect(heading()).toBe(strings().s1?.h as string)
    expect(document.getElementById('status-line')?.textContent).toBe(
      strings().incompatible as unknown as string,
    )
  })

  test('branching: the best path reaches the confirmed-options outcome', () => {
    scormApi()
    launch(id, SCORM_FILES)
    for (let i = 0; i < 3; i++) click('[data-next]')
    click('[data-option="b"]')
    click('[data-branch-continue]')
    click('[data-option="a"]')
    click('[data-branch-continue]')
    expect(document.querySelector('.feedback[data-tone="good"]')).not.toBeNull()
    click('[data-branch-restart]')
    expect(document.querySelectorAll('[data-option]')).toHaveLength(3)
  })

  test('knowledge check: all correct reports score 100, completed and passed', () => {
    const api = scormApi()
    launch(id, SCORM_FILES)
    for (let i = 0; i < 4; i++) click('[data-next]')
    const questions = (strings().s5?.questions as { correct: number }[]) ?? []
    questions.forEach((q, i) => {
      click(`[data-q="${i}"][data-a="${q.correct}"]`)
    })
    expect(api.cmi.score.raw).toBe('100')
    expect(api.cmi.completion_status).toBe('completed')
    expect(api.cmi.success_status).toBe('passed')
    expect(document.querySelector('.result[data-pass="true"]')).not.toBeNull()
    // Feedback is shown for each answer and the choice is locked.
    expect(document.querySelectorAll('.feedback[data-tone="good"]')).toHaveLength(3)
    expect(document.querySelector<HTMLButtonElement>('[data-q="0"]')?.disabled).toBe(true)
  })

  test('knowledge check: two of three passes, one of three fails and can be retried', () => {
    const api = scormApi()
    launch(id, SCORM_FILES)
    for (let i = 0; i < 4; i++) click('[data-next]')
    const questions = (strings().s5?.questions as { correct: number }[]) ?? []
    click(`[data-q="0"][data-a="${questions[0]?.correct}"]`)
    click(`[data-q="1"][data-a="${((questions[1]?.correct ?? 0) + 1) % 3}"]`)
    click(`[data-q="2"][data-a="${((questions[2]?.correct ?? 0) + 1) % 3}"]`)
    expect(api.cmi.score.raw).toBe('33')
    expect(api.cmi.success_status).toBe('failed')
    expect(api.cmi.completion_status).toBe('incomplete')
    expect(document.querySelector('.result[data-pass="false"]')).not.toBeNull()
    click('[data-quiz-retry]')
    expect(document.querySelectorAll('.feedback')).toHaveLength(0)
  })

  test('without an LMS the package still runs and says nothing is saved', () => {
    launch(id, SCORM_FILES)
    expect(document.getElementById('preview-banner')?.hasAttribute('hidden')).toBe(false)
    expect(heading()).toBe(strings().s1?.h as string)
  })
})

describe('English and Arabic SCORM packages are two real authored versions', () => {
  test('same structure, own text, own package id', () => {
    scormApi()
    launch('wvq-en-scorm2004', SCORM_FILES)
    const en = strings()
    scormApi()
    launch('wvq-ar-scorm2004', SCORM_FILES)
    const ar = strings()
    expect(en.s1?.h).not.toBe(ar.s1?.h)
    expect(/[؀-ۿ]/.test(String(ar.s1?.h))).toBe(true)
    expect(/[؀-ۿ]/.test(String(en.s1?.h))).toBe(false)
    expect(len(ar.s5?.questions)).toBe(len(en.s5?.questions))
    expect(Object.keys(ar.s4?.nodes ?? {})).toEqual(Object.keys(en.s4?.nodes ?? {}))
    expect(len(ar.s2?.cards)).toBe(len(en.s2?.cards))
    expect(ar.packageId).toBe('wvq-ar-scorm2004')
    expect(en.packageId).toBe('wvq-en-scorm2004')
    // The Arabic package is not the English page in a mirrored frame: its shell is Arabic too.
    expect(read('wvq-ar-scorm2004', 'index.html')).toContain('أكاديمية قطر للسياحة')
    expect(read('wvq-ar-scorm2004', 'index.html')).not.toContain('Skip to content')
  })

  test('the equivalent screen carries across: an English bookmark opens the same screen in Arabic', () => {
    const en = scormApi()
    launch('wvq-en-scorm2004', SCORM_FILES)
    click('[data-next]')
    click('[data-next]')
    click('[data-next]')
    expect(en.cmi.location).toBe('screen-4')
    const mapped = JSON.stringify({ ...JSON.parse(en.cmi.suspend_data), lang: 'ar' })
    scormApi({ entry: 'resume', location: 'screen-4', suspend_data: mapped })
    launch('wvq-ar-scorm2004', SCORM_FILES)
    expect(heading()).toBe(strings().s4?.h as string)
    expect(document.documentElement.dir).toBe('rtl')
  })
})

// --- xAPI activities -----------------------------------------------------------------------------

type Sent = StatementInput

function bridge(packageId: string, state: { location: string; suspendData: string } | null = null) {
  const sent: Sent[] = []
  const saved: { location: string; json: string }[] = []
  window.QTA_LRS = {
    simulated: true,
    label: 'Simulated learning record store',
    endpoint: 'https://lrs.demo.invalid/xapi/',
    actor: {
      name: 'Mariam Al Nuaimi',
      homePage: 'https://academy.demo.invalid',
      account: 'LRN-0042',
    },
    activityId: `https://lrs.demo.invalid/activities/${packageId}`,
    state,
    sendStatement: async (statement: Sent) => {
      sent.push(statement)
    },
    setState: async (location: string, json: string) => {
      saved.push({ location, json })
    },
  }
  return { sent, saved }
}
const XAPI_FILES = ['qta-xapi.js', 'strings.js', 'activity.js']
const settle = () => new Promise((resolve) => setTimeout(resolve, 5))

describe.each([
  { id: 'pve-en-xapi', lang: 'en', dir: 'ltr' },
  { id: 'pve-ar-xapi', lang: 'ar', dir: 'rtl' },
] as const)('xAPI activity $id', ({ id, lang, dir }) => {
  test('has a tincan.xml with its own activity id and language', () => {
    const xml = read(id, 'tincan.xml')
    expect(xml).toContain(`activity id="https://lrs.demo.invalid/activities/${id}"`)
    expect(xml).toContain(`<launch lang="${lang}">index.html</launch>`)
    expect(read(id, 'index.html')).toContain(`<html lang="${lang}" dir="${dir}">`)
  })

  test('sends initialized, experienced, answered and completed statements with actor, object, result and timestamp', async () => {
    const { sent, saved } = bridge(id)
    launch(id, XAPI_FILES)
    await settle()
    expect(sent.map((s) => s.verb.id.split('/').pop())).toEqual(['initialized'])

    click('[data-go="2"]')
    click('[data-group="dest"][data-id="waterfront"]')
    click('[data-next]')
    click('[data-group="service"][data-id="confirmed"]')
    click('[data-next]')
    click('[data-complete]')
    await settle()

    const verbs = sent.map((s) => s.verb.id.split('/').pop())
    expect(verbs).toEqual(['initialized', 'experienced', 'answered', 'completed'])
    for (const statement of sent) {
      expect(String(statement.id)).toMatch(/^[0-9a-f-]{36}$/)
      expect(statement.actor.account.name).toBe('LRN-0042')
      expect(statement.object.id.startsWith(`https://lrs.demo.invalid/activities/${id}`)).toBe(true)
      expect(Number.isNaN(Date.parse(String(statement.timestamp)))).toBe(false)
    }
    expect(sent[1]?.object.id).toBe(`https://lrs.demo.invalid/activities/${id}/destination`)
    expect(sent[3]?.result).toMatchObject({ completion: true, success: true, score: { scaled: 1 } })
    // The state document follows the steps and ends on step 4, marked completed.
    expect(saved.at(-1)?.location).toBe('step-4')
    expect(JSON.parse(saved.at(-1)?.json ?? '{}')).toMatchObject({
      s: 'pve-bookmark-1',
      lang,
      completed: true,
      success: true,
    })
    expect(document.documentElement.dir).toBe(dir)
  })

  test('a weaker pair of choices completes without success and offers a retry', async () => {
    const { sent } = bridge(id)
    launch(id, XAPI_FILES)
    click('[data-go="2"]')
    click('[data-group="dest"][data-id="desert"]')
    click('[data-next]')
    click('[data-group="service"][data-id="refund"]')
    click('[data-next]')
    click('[data-complete]')
    await settle()
    expect(sent.at(-1)?.result).toMatchObject({ completion: true, success: false })
    expect(document.querySelector('[data-retry]')).not.toBeNull()
  })

  test('resumes from its state document and ignores one from another layout', () => {
    bridge(id, {
      location: 'step-3',
      suspendData: JSON.stringify({ v: 1, s: 'pve-bookmark-1', lang, step: 3, dest: 'waterfront' }),
    })
    launch(id, XAPI_FILES)
    expect(heading()).toBe(strings().s3?.h as string)
    expect(document.querySelector('[data-group="dest"]')).toBeNull()

    bridge(id, {
      location: 'step-3',
      suspendData: JSON.stringify({ v: 1, s: 'something-else', step: 3 }),
    })
    launch(id, XAPI_FILES)
    expect(heading()).toBe(strings().s1?.h as string)
    expect(document.getElementById('status-line')?.textContent).toBe(
      strings().incompatible as unknown as string,
    )
  })

  test('without a bridge it runs but records nothing', async () => {
    launch(id, XAPI_FILES)
    await settle()
    expect(document.getElementById('preview-banner')?.hasAttribute('hidden')).toBe(false)
    expect(document.querySelectorAll('#lrs-log li')).toHaveLength(0)
    click('[data-go="2"]')
    click('[data-group="dest"][data-id="waterfront"]')
    await settle()
    // The choice is logged as "not recorded": nothing reached a record store.
    expect(document.querySelectorAll('#lrs-log li')).toHaveLength(1)
    expect(document.getElementById('lrs-log')?.textContent).toContain(
      lang === 'ar' ? 'غير مسجَّلة' : 'not recorded',
    )
  })
})

describe('English and Arabic xAPI activities share choices but not text', () => {
  test('the state document of one language opens at the same step in the other', () => {
    const state = {
      location: 'step-3',
      suspendData: JSON.stringify({
        v: 1,
        s: 'pve-bookmark-1',
        lang: 'ar',
        step: 3,
        dest: 'heritage',
      }),
    }
    bridge('pve-ar-xapi', state)
    launch('pve-ar-xapi', XAPI_FILES)
    expect(heading()).toBe(strings().s3?.h as string)
    expect(/[؀-ۿ]/.test(heading())).toBe(true)
  })
})
