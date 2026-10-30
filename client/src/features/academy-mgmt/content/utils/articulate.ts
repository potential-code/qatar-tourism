/**
 * The Articulate row of the Content Library. No Articulate authoring access or export is
 * available for this trial, so the preview is a labelled visual simulation and these package
 * tests are listed as not run. Nothing here is a working Articulate package.
 */
export const ARTICULATE_LABEL = 'Simulated preview — no Articulate export available'

export const ARTICULATE_RTL_GUIDANCE =
  'https://community.articulate.com/blog/articles/easily-adapt-rise-and-storyline-courses-for-right-to-left-languages-with-articul/1222985'

export const ARTICULATE_MISSING_TESTS: { title: string; detail: string }[] = [
  {
    title: 'Import an Articulate export',
    detail:
      'Upload a Rise 360 or Storyline SCORM 2004 or xAPI zip and read its imsmanifest.xml or tincan.xml.',
  },
  {
    title: 'Launch the export in the preview frame',
    detail:
      'Open the export’s own entry file and confirm it finds the LMS API (SCORM) or receives the launch parameters (xAPI).',
  },
  {
    title: 'Right-to-left rendering of an Arabic course',
    detail:
      'Publish an Arabic course with Articulate’s right-to-left setting and check layout, navigation, controls and mixed numbers.',
  },
  {
    title: 'Reporting options',
    detail:
      'Check that the export’s chosen reporting (completed or incomplete, passed or failed) maps to completion and success.',
  },
  {
    title: 'Bookmark and resume on a long course',
    detail:
      'Check suspend data size and resume after closing, and across an English to Arabic switch.',
  },
  {
    title: 'xAPI statements from the export',
    detail:
      'Check the verbs, activity ids and results that an Articulate xAPI export sends to the learning record store.',
  },
]
