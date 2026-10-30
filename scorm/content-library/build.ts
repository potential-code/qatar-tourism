/**
 * Builds the four Content Library packages into client/public/content/<packageId>/.
 *
 *   bun scorm/content-library/build.ts
 *
 * Each package is a real, self-contained web package: SCORM 2004 (4th edition) with an
 * imsmanifest.xml, or xAPI with a tincan.xml. The English and Arabic variants of an item share
 * their logic and differ in strings, language, direction, package id and (for the video) the
 * default caption track. The sample video itself is served by the academy from /media (13 MB,
 * not copied into each package); see docs/ASSET_REGISTER.md.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

type Lang = 'en' | 'ar'
type Strings = {
  lang: Lang
  packageId: string
  wordmark: string
  title: string
  subtitle: string
  pill: string
  skip: string
  saveExit: string
  previewBanner: string
}
type Variant = {
  packageId: string
  kind: 'scorm' | 'xapi'
  source: 'wvq' | 'pve'
  lang: Lang
  courseKey: string
  version: string
  minScore?: number
}

const VERSION = '1.0'
const VARIANTS: Variant[] = [
  { packageId: 'wvq-en-scorm2004', kind: 'scorm', source: 'wvq', lang: 'en', courseKey: 'welcoming-visitors-to-qatar', version: VERSION, minScore: 0.67 },
  { packageId: 'wvq-ar-scorm2004', kind: 'scorm', source: 'wvq', lang: 'ar', courseKey: 'welcoming-visitors-to-qatar', version: VERSION, minScore: 0.67 },
  { packageId: 'pve-en-xapi', kind: 'xapi', source: 'pve', lang: 'en', courseKey: 'planning-a-visitor-experience', version: VERSION },
  { packageId: 'pve-ar-xapi', kind: 'xapi', source: 'pve', lang: 'ar', courseKey: 'planning-a-visitor-experience', version: VERSION },
]

const root = import.meta.dir
const out = resolve(root, '../../client/public/content')
const media = resolve(root, '../../client/public/media')
const ACTIVITY_BASE = 'https://lrs.demo.invalid/activities/'

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const stripTags = (html: string) => html.replace(/<[^>]*>/g, '')

/** The strings files assign window.QTA_STRINGS; evaluate them without a browser. */
function loadStrings(source: string, lang: Lang): Strings {
  const code = readFileSync(join(root, source, `strings.${lang}.js`), 'utf8')
  const sandbox: { QTA_STRINGS?: Strings } = {}
  new Function('window', code)(sandbox)
  if (!sandbox.QTA_STRINGS) throw new Error(`strings.${lang}.js did not define QTA_STRINGS`)
  return sandbox.QTA_STRINGS
}

function indexHtml(v: Variant, s: Strings): string {
  const dir = v.lang === 'ar' ? 'rtl' : 'ltr'
  const fonts =
    v.lang === 'ar'
      ? 'family=Noto+Kufi+Arabic:wght@400;500;600&family=Noto+Naskh+Arabic:wght@400;500;600'
      : 'family=Jost:wght@400;500;600&family=Spectral:wght@400;500'
  const runtime = v.kind === 'scorm' ? 'qta-scorm.js' : 'qta-xapi.js'
  const logic = v.kind === 'scorm' ? 'player.js' : 'activity.js'
  const log = v.kind === 'xapi' ? '\n      <details id="lrs-log" class="log"></details>' : ''
  return `<!doctype html>
<html lang="${v.lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeXml(stripTags(s.title))} | ${v.lang === 'ar' ? 'أكاديمية قطر للسياحة' : 'Qatar Tourism Academy'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <a class="skip-link" href="#app">${s.skip}</a>
    <header class="topbar">
      <div class="topbar__inner">
        <p class="wordmark">${s.wordmark}</p>
        <div class="topbar__right">
          <span class="pill">${s.pill}</span>
          <button type="button" class="btn btn--small btn--ghost" data-exit>${s.saveExit}</button>
        </div>
      </div>
    </header>

    <div id="preview-banner" class="banner" role="note" hidden>${s.previewBanner}</div>

    <main class="shell">
      <div class="intro-head">
        <h1 class="title">${s.title}</h1>
        <p class="subtitle">${s.subtitle}</p>
      </div>
      <div id="app"></div>${log}
      <p id="live" class="visually-hidden" aria-live="polite" aria-atomic="true"></p>
      <p id="status-line" class="status-line" role="status" hidden></p>
    </main>

    <script src="${runtime}"></script>
    <script src="strings.js"></script>
    <script src="${logic}"></script>
  </body>
</html>
`
}

function scormManifest(v: Variant, s: Strings): string {
  const id = v.packageId.toUpperCase()
  const title = escapeXml(stripTags(s.title))
  const files = ['index.html', 'styles.css', 'qta-scorm.js', 'strings.js', 'player.js', 'captions/c01.en.vtt', 'captions/c01.ar.vtt']
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="${v.version}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                      http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                      http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                      http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
                      http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd"
  xml:lang="${v.lang}">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="${id}-ORG">
    <organization identifier="${id}-ORG">
      <title>${title}</title>
      <item identifier="${id}-ITEM" identifierref="${id}-RES">
        <title>${title}</title>
        <imsss:sequencing>
          <imsss:objectives>
            <imsss:primaryObjective objectiveID="${id}-OBJ" satisfiedByMeasure="true">
              <imsss:minNormalizedMeasure>${v.minScore}</imsss:minNormalizedMeasure>
            </imsss:primaryObjective>
          </imsss:objectives>
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${id}-RES" type="webcontent" adlcp:scormType="sco" href="index.html">
${files.map((f) => `      <file href="${f}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`
}

function tincan(v: Variant, s: Strings): string {
  const title = escapeXml(stripTags(s.title))
  return `<?xml version="1.0" encoding="utf-8"?>
<tincan xmlns="http://projecttincan.com/tincan.xsd">
  <activities>
    <activity id="${ACTIVITY_BASE}${v.packageId}" type="http://adlnet.gov/expapi/activities/lesson">
      <name lang="${v.lang}">${title}</name>
      <description lang="${v.lang}">${escapeXml(stripTags(s.subtitle))}</description>
      <launch lang="${v.lang}">index.html</launch>
    </activity>
  </activities>
</tincan>
`
}

function build(v: Variant) {
  const strings = loadStrings(v.source, v.lang)
  if (strings.packageId !== v.packageId) {
    throw new Error(`${v.source}/strings.${v.lang}.js is for ${strings.packageId}, not ${v.packageId}`)
  }
  const dir = join(out, v.packageId)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const put = (name: string, body: string) => writeFileSync(join(dir, name), body)
  const copy = (from: string, name: string) => {
    mkdirSync(join(dir, name, '..'), { recursive: true })
    copyFileSync(from, join(dir, name))
  }

  put('index.html', indexHtml(v, strings))
  copy(join(root, 'shared/styles.css'), 'styles.css')
  copy(join(root, `${v.source}/strings.${v.lang}.js`), 'strings.js')
  if (v.kind === 'scorm') {
    copy(join(root, 'shared/qta-scorm.js'), 'qta-scorm.js')
    copy(join(root, 'wvq/player.js'), 'player.js')
    copy(join(media, 'c01-welcoming-every-visitor.en.vtt'), 'captions/c01.en.vtt')
    copy(join(root, 'wvq/captions/c01.ar.vtt'), 'captions/c01.ar.vtt')
    put('imsmanifest.xml', scormManifest(v, strings))
  } else {
    copy(join(root, 'shared/qta-xapi.js'), 'qta-xapi.js')
    copy(join(root, 'pve/activity.js'), 'activity.js')
    put('tincan.xml', tincan(v, strings))
  }
  put(
    'package-info.json',
    `${JSON.stringify(
      {
        packageId: v.packageId,
        courseKey: v.courseKey,
        language: v.lang,
        direction: v.lang === 'ar' ? 'rtl' : 'ltr',
        format: v.kind === 'scorm' ? 'SCORM 2004 4th Edition' : 'xAPI (tincan.xml)',
        version: v.version,
        launch: 'index.html',
        origin: 'Original demonstration content authored for the Qatar Tourism Academy mockup',
      },
      null,
      2,
    )}\n`,
  )
  return dir
}

for (const variant of VARIANTS) console.log(`built ${variant.packageId} -> ${build(variant)}`)
