# Asset register: Content Library (29 Oct update)

Every asset used by the bilingual packaged learning (SPEC section 3 and 10): where it comes from,
who owns it, under what licence or permission, how to attribute it, its language and where it is
used. This register covers the Content Library packages and their player and admin screens. The
older assets (photographs, trainer portraits, the C01 and C03 videos) are listed in
`ASSET-INVENTORY.md`; the ones the Content Library reuses are repeated here.

"Original" means written or drawn for this demonstration, with no third-party text, image or
code. The demo uses dummy data only and the original content is labelled as demonstration
material wherever a learner or admin meets it.

## Original authored content

| Asset | URL or path | Owner | Licence or permission | Attribution | Language | Where used |
| --- | --- | --- | --- | --- | --- | --- |
| Welcoming visitors to Qatar: screens, scenario tree, three-question check, feedback text | `scorm/content-library/wvq/strings.en.js`, built into `client/public/content/wvq-en-scorm2004/` | Demo project team (original) | Original. Demonstration use for the Qatar Tourism Academy trial | None needed | English | Content Library, unit C08 in Program A and B paths, course player |
| Welcoming visitors to Qatar, Arabic: the same five screens authored in Modern Standard Arabic (not a mirrored English page) | `scorm/content-library/wvq/strings.ar.js`, built into `client/public/content/wvq-ar-scorm2004/` | Demo project team (original) | Original. Demonstration use. **Final Arabic content review by Qatar Tourism is still required** (handover flag) | None needed | Arabic | Content Library, unit C08, course player |
| Arabic caption track for the C01 sample video | `scorm/content-library/wvq/captions/c01.ar.vtt`, copied into both WVQ packages as `captions/c01.ar.vtt` | Demo project team (original translation of the C01 narration) | Original | None needed | Arabic | Video screen of both WVQ packages |
| English caption track for the C01 sample video | `client/public/media/c01-welcoming-every-visitor.en.vtt`, copied into both WVQ packages as `captions/c01.en.vtt` | Project brief section 7 narration script | Supplied with the brief | None needed | English | Video screen of both WVQ packages; C01 unit |
| Planning a visitor experience: visitors Noor, Daniel and Sami (fictional), three experience options, the changed-plan response, feedback text | `scorm/content-library/pve/strings.en.js`, built into `client/public/content/pve-en-xapi/` | Demo project team (original) | Original. The three experience types (an old-market evening, a museum and waterfront day, a desert-edge day) are generic ideas written from scratch. No text, names or images were copied from visitqatar.com | None needed | English | Content Library, unit C09 in Program A and B paths, course player |
| Planning a visitor experience, Arabic (authored in Modern Standard Arabic) | `scorm/content-library/pve/strings.ar.js`, built into `client/public/content/pve-ar-xapi/` | Demo project team (original) | Original. Final Arabic review by Qatar Tourism still required | None needed | Arabic | Content Library, unit C09, course player |
| SCORM runtime wrapper for the packages | `scorm/content-library/shared/qta-scorm.js` | Demo project team (adapted from this project's own `scorm/qta-sample-c04/runtime.js`) | Original | None needed | n/a | Both SCORM packages |
| In-browser xAPI client (builds statements, sends them to the launch bridge) | `scorm/content-library/shared/qta-xapi.js` | Demo project team (original) | Original | None needed | n/a | Both xAPI activities |
| Package styles (logical properties, right-to-left layout) | `scorm/content-library/shared/styles.css` | Demo project team (original) | Original | None needed | n/a | All four packages |
| Package scripts and manifests | `scorm/content-library/wvq/player.js`, `scorm/content-library/pve/activity.js`, `scorm/content-library/build.ts` (generates `imsmanifest.xml`, `tincan.xml`, `index.html`, `package-info.json`) | Demo project team (original) | Original | None needed | n/a | All four packages |
| Player, language control, switch prompt, admin Content Library, tracking test | `client/src/features/scorm-player/`, `client/src/features/xapi-player/`, `client/src/features/academy-mgmt/content/` | Demo project team (original) | Original | None needed | English and Arabic (learner screens), English (admin) | Learner course player and Admin Content Library |
| Learner player text in both languages | `client/src/i18n/locales/en/content.json`, `client/src/i18n/locales/ar/content.json` | Demo project team (original) | Original. Arabic subject to final review | None needed | English and Arabic | Course player |
| Articulate row wireframe (grey blocks) | `client/src/features/academy-mgmt/content/components/ArticulateRow.tsx` | Demo project team (original) | Original. Decorative and labelled "Simulated preview — no Articulate export available". It is not a package | None needed | English | Admin Content Library |

## Existing project assets reused

| Asset | URL or path | Owner | Licence or permission | Attribution | Language | Where used |
| --- | --- | --- | --- | --- | --- | --- |
| C01 sample video (1 min 15 s, no audio track) | `client/public/media/c01-welcoming-every-visitor.mp4`, loaded by both WVQ packages from `/media/` (not copied into each package: 13 MB) | **Not recorded in the repository** (see `ASSET-INVENTORY.md`) | **To be confirmed by the developer before handover**: generated, stock or produced, and under what licence | To be confirmed | None (silent). Captions in English and Arabic | Video screen of both WVQ packages; C01 unit |
| C01 poster frame | `client/public/media/c01-poster.jpg` | **Not recorded in the repository** | **To be confirmed** | To be confirmed | n/a | Video screen of both WVQ packages |

## Third-party software and fonts

| Asset | URL | Owner | Licence | Attribution | Language | Where used |
| --- | --- | --- | --- | --- | --- | --- |
| scorm-again 3.5.0 (SCORM 2004 runtime in the host page) | https://github.com/jcputney/scorm-again | Jonathan Putney | MIT | Retained in the package licence | n/a | Learner player and admin preview |
| Jost and Spectral (English package type) | https://fonts.google.com | Google Fonts contributors | SIL Open Font License 1.1 | None required. Not bundled: loaded from Google Fonts | English | English packages |
| Noto Kufi Arabic and Noto Naskh Arabic (Arabic package type) | https://fonts.google.com/noto | Google | SIL Open Font License 1.1 | None required. Not bundled: loaded from Google Fonts | Arabic | Arabic packages, Arabic portal |

## References only (nothing copied)

| Reference | URL | Owner | Licence or permission | Attribution | Language | Where used |
| --- | --- | --- | --- | --- | --- | --- |
| Visit Qatar, things to do | https://visitqatar.com/intl-en/things-to-do | Qatar Tourism | Public page, **inspiration only**. No text, image or structure reproduced | None | English | Informed the kinds of experience in "Planning a visitor experience" |
| Articulate guidance on right-to-left courses | https://community.articulate.com/blog/articles/easily-adapt-rise-and-storyline-courses-for-right-to-left-languages-with-articul/1222985 | Articulate | Public article, reference only | None | English | Linked from the Articulate row; informed the right-to-left checks |
| ADL xAPI verb identifiers (`initialized`, `experienced`, `answered`, `completed`) | http://adlnet.gov/expapi/verbs/ | ADL | Public identifiers | None | n/a | Statement verbs in the xAPI activities |
| Activity and actor identifiers on `lrs.demo.invalid` and `academy.demo.invalid` | n/a | Demo project team | `.invalid` is a reserved name that never resolves, so these are illustrative and no real system is contacted | None | n/a | xAPI statements and `tincan.xml` |

## Not available, so not present

- **Articulate Rise or Storyline export.** None was supplied and no authoring access exists. The
  Content Library shows an Articulate row labelled "Simulated preview — no Articulate export
  available" and lists the package tests that cannot be run without an export. No Articulate
  asset, template or branding is used anywhere.
- **Customer or third-party restricted courses.** None were copied.

## Rebuilding the packages

`bun run content:build` regenerates `client/public/content/<packageId>/` from `scorm/content-library/`.
The output is deterministic and committed, so a rebuild with no source change produces no diff.
The built packages, the preview store (`qta-content-preview:*` and `qta-content-language` in browser storage) and the `xapiStatements` rows belong in the dummy-data deletion plan.
