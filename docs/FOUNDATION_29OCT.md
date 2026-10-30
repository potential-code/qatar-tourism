# Foundation for the 29 Oct update

Shared data model, permissions, navigation and i18n scaffolding. Feature lanes build on this and
should not edit shared files without telling the foundation owner. Source of truth for behaviour:
the SPEC (SPEC-29oct.md). All thresholds are "Demo settings — subject to Qatar Tourism
confirmation".

Versions: `DB_VERSION` 3 (`client/src/mocks/db.ts`), `SEED_VERSION` `qta-demo-1.2-29oct`
(`client/src/mocks/seed/reference-date.ts`). A bump reseeds; there is no migration.

## Adding to the data model later

Interface in `shared/types/db.ts`, then `client/src/mocks/tables.ts` (`DemoTables`,
`TABLE_NAMES`), `defaults.ts` (`COLUMN_DEFAULTS`), `seed/rows.ts` (`InstantColumns`) and
`seed/index.ts`. Bump both versions. Seeded ids come from `stableUuid(ns, key)`.

## Identity

| Item | Where | Notes |
| --- | --- | --- |
| Mariam Al Nuaimi | `seed/personas.ts` (`MARIAM_N` 42) | user `user-l0042`, `mariam.alnuaimi@example.com`, profile code `L0042`, password `password`, e2e `ACCOUNTS.mariam`. Replaces generated learner 42; totals stay 1,200 learners, 360/600/180/60 groups. |
| `learnerDisplayId('L0042')` -> `LRN-0042`, `crmLearnerId` -> `CRM-0042` | `shared/utils/identity.ts` | Show the display id in 29 Oct screens; the stored `learnerCode` stays `L0042` (existing code and tests depend on that shape). |
| Mariam's states | `seed/personas.ts`, `sessions.ts`, `credentials.ts` | A at `l1_done` (Level 1 quiz passed, pre/formative attempts) and B at `b_mid` (two lessons completed); confirmed seat on `SES-T01-2`; prior-cycle A credential expiring 25 days after the reference date; one pending external certificate and request; licence `active`; CRM mapping `CRM-0042`. |

## Tables and fields

All in `shared/types/db.ts`; seeds in `client/src/mocks/seed/`.

| Table / field | Meaning | Seeded | Lane |
| --- | --- | --- | --- |
| `seatOffers` | Offer of a freed seat: `sessionId, rsvpId, learnerId, offeredAt, expiresAt, status offered/accepted/declined/expired, resolvedAt`. | Empty (created at run time). | C |
| RSVP status `offered` | Waitlisted learner holding an offer. The seat counts as reserved. Appended to `RSVP_STATUSES`; treat it as occupying capacity. | none | C |
| `approvalRequests` | `code REQ-0001`, `type enrolment/external_certificate`, `learnerId`, `programmeId`, `sessionId`, `externalCertificateId`, `submittedAt`, `reviewerId`, `evidence {note,fileName}`, `status pending/approved/rejected/info_requested`, `reason`, `decidedAt/By`. | 3 pending + 1 rejected enrolment (Program A; REQ-0003 names full session SES-T03-2), 2 pending external-certificate (REQ-0001 is Mariam's). | C, F |
| Profile `accountStatus`, `lockReason`, `lockedAt`, `lockedBy` | `active/locked/disabled`. The older `suspended` flag stays; `accountStatusOf(profile)` (`shared/utils/identity.ts`) maps `suspended` to `disabled`. `users.service setSuspended` keeps both in step. Sign-in does not block locked accounts yet: lane D adds that and the "This account is locked. Contact Academy support" message (`auth` namespace key `locked`). | 1 locked learner (chosen from the Program C-only learners, highest number; not a persona). | D |
| `questionBank` | `questionId`, `sharedId` (links EN/AR), `competency, programme (A/B/all), difficulty, language, type single/multiple/scenario, prompt, options[{key,text}], correct[], feedback, points, version, status draft/published`. | The 10 existing baseline/post questions, English, published. TODO lane E: author the 24 questions with Arabic variants (`seed/question-bank.ts`). | E |
| `assessmentRules` | Per programme (A, B) and kind (pre, post): `drawCount, draws[{competency,difficulty,count}], randomiseQuestions, randomiseOptions, passPercent, attemptLimit, timeLimitMinutes, feedbackRelease, scorePolicy best/latest, version, status, assessmentId`. | Pre: 5 questions, 1 attempt, no gate. Post: 10 questions, 80 %, 2 attempts, best, 15 min. | E |
| `assessmentAttempts` new fields | `ruleId, ruleVersion, snapshot {items[{questionId,version,optionOrder,language}], seed}, deadlineAt`. Null on seeded history. | null | E |
| `attemptGrants` | One extra attempt with reason: `assessmentId, enrolmentId, learnerId, grantedBy, reason, grantedAt, consumedByAttemptId`. | Empty. | E |
| `certificates` new fields | `expiresAt, ruleVersion, cpdHours, supersedesId`. Lifecycle is derived: `credentialLifecycle()` in `shared/utils/credentials.ts` (revoked, superseded, expired, expiring_soon, active). The 120 current certificates gain a 12-month expiry and 4 CPD hours. | Four prior-cycle rows (`evidence.priorCycle`, codes `QTA-DEMO-A-P25-000n`): Mariam (expires +25 d, expiring soon), an expired one (-40 d), a superseded one (renewed by its holder's current certificate via `supersedesId`), a revoked one (-30 d). Totals are now 124 rows, 123 issued, 120 current. | F |
| `cpdLedger` | `learnerId, source academy/external, hours (amount in unit), unit, status earned/pending/approved/rejected, title, earnedOn, certificateId, externalCertificateId, enrolmentId`. Only earned and approved count. Hours and credits convert only with `settings.cpdHoursPerCredit`. | One line per non-revoked credential, Mariam's workshop (2 h), one line per external certificate. Mariam: 6 h earned, 1.5 h pending, target 8 h. | F, G |
| `externalCertificates` | `learnerId, title, issuer, externalRef, issuedOn, expiresOn, claimedAmount, unit, competency, evidenceFileId/Name, verificationUrl, status pending/verified/rejected/info_requested, recognisedAmount, reviewerId, reviewedAt, reason, submittedAt`. | Mariam pending, one more pending, one verified (3 of 4 h recognised), one rejected. Evidence id `sample-evidence-demo-1` / `sample-certificate-evidence.pdf` is a reserved sample: lane F provides the file. Decided ones have no request row; list them from this table. | F |
| `licenceStatus` | `learnerId, status active/expired/suspended/pending, source 'crm', pendingRequest`. Separate from certificates. No row means not tracked. | 5 rows (Mariam active, expired, suspended, pending-with-request, active). | F, H |
| `contentPackages` new fields | `packageId, courseKey, language, accessGroup, publishedAt`; type `xapi` added. | Four library variants, `isCurrent: false`: `wvq-en-scorm2004`, `wvq-ar-scorm2004` (course C01 placeholder), `pve-en-xapi`, `pve-ar-xapi` (C02 placeholder). Launch URL `/content/<packageId>/index.html`; lane B creates the files in `client/public/content/<packageId>/` and may repoint `courseId`. | B |
| `xapiStatements` | `statementId, actorLearnerId, verb, activityId, packageId, timestamp, result, simulatedLrs: true`. | 3 statements for Mariam on `pve-en-xapi`. Always label as simulated. | B |
| `crmMappings` | `kind field/learner`; field rows: `crmField, lmsField, dataType, direction, transformation, required, authoritative`; learner rows: `learnerId, externalLearnerId, matchState matched/review`. | 6 field rows (programme code map lacks QT-A), Mariam linked to `CRM-0042`, one learner in `review`. | H |
| `crmEvents` | `eventId` (immutable `EVT-0001`), `type, direction, learnerId, externalLearnerId, entityId, status processed/queued/failed/conflict, attempts, error, payload, occurredAt, processedAt`. | EVT-0001 processed, EVT-0002 queued, EVT-0003 failed (QT-A unmapped, copy per SPEC §9), EVT-0004 conflict. | H |
| `integrationSettings` | One row per `area` (`sso, api, contentHosting, dataResidency, crm`): `config, state, lastTestAt`. Illustrative; `.invalid` hosts, masked secrets. | Five rows; data residency six rows all "To be confirmed". | G, H |
| `db.settings` (`DemoSettings`) | `seatOfferWindowHours 24, credentialValidityMonths 12, cpdTarget 8, cpdUnit hours, cpdHoursPerCredit 1, reminderDaysBefore [60,30,7], programmeBCpdEnabled false, programmeBCpdPerCourse 0.5`. Read with `demoSettings()` in services or `getDemoSettings()`; edit with `updateDemoSettings()` (`credential.manage`, audited) in `services/demo-settings.service.ts`. Never hard-code these numbers. | defaults in `seed/settings.ts` | all |
| `db.meta.clockOffsetDays` | Days the presenter advanced the clock. `services/clock.ts now()` adds it. | 0 | F |

Seeded audit rows were added for credential issue, renewal and revocation, the account lock, the
rejected request and the decided external certificates.

## Demo clock

`services/clock.service.ts`: `getDemoClock()`, `advanceDemoClock(days)` (1 to 730),
`resetDemoClock()`. Admin only (`demo.clock`), audited (`demo.clock.advance`, `demo.clock.reset`).
`resetDemoData()` reseeds `meta`, so the offset returns to 0. Never change `meta.referenceDate`.
Lifecycle helpers: `credentialLifecycle`, `supersededIds`, `expiringSoonDays`, `daysToExpiry`,
`addMonths` in `shared/utils/credentials.ts`.

## Permissions (`shared/permissions.ts`)

Added, admin only (`authorised`; learners and trainers `none`): `account.lock`, `approval.review`,
`assessment.grant_attempt`, `credential.manage`, `integration.configure`, `demo.clock`,
`content.manage`. Check with `requireCapability(action)` in services.

## Navigation, routes and stubs

Each stub renders the real frame with an "In progress" body (`components/layout/InProgress`).
Replace the component body only; keep the route files thin.

| Nav | URL | Stub component (lane folder) |
| --- | --- | --- |
| Learner: My Learning Record | `/learner/record` | `features/learner-record/components/LearnerRecordPage.tsx` |
| Admin: Integrations and Security (renamed, same URL) | `/admin/manage/integrations` | `features/academy-mgmt/integrations/components/IntegrationsPage.tsx` (existing page; lanes G and H extend) |
| Admin: Content Library | `/admin/manage/content` | `features/academy-mgmt/content/components/ContentLibraryPage.tsx` |
| Admin: Enrolments and Approvals | `/admin/manage/approvals` | `features/academy-mgmt/approvals/components/ApprovalsPage.tsx` |
| Admin: Certificates and CPD | `/admin/manage/certificates` | `features/academy-mgmt/certificates/components/CertificatesAdminPage.tsx` |

Navigation lives in `app/navigation.ts`; hub tiles in `HubOverview.tsx` (counts from
`getHubOverview` in `services/admin/governance.service.ts`). Sub-tabs, child routes and
the Reports/Dashboard additions belong to the lanes.

Shared notes (`components/layout`, exported from `index.ts`): `DemoSettingsNote` (next to every
demo threshold), `IllustrativeNote` (exact SPEC §2 copy via `ILLUSTRATIVE_COPY`, optional
children), `InProgress`.

## i18n

Languages `en`, `ar`. Namespaces `common` (default), `public`, `auth`, `learner`, plus one per
feature lane: `record` (learner record and certificates), `sessions` (learner booking and waitlist),
`assessments` (learner assessment taking), `content` (course player and packages). One JSON file
each under `client/src/i18n/locales/en/` and `ar/`.

- Use `const { t } = useTranslation('public')` then `t('nav.signIn')`. Cross-namespace:
  `t('brand.name', { ns: 'public' })`. Keys are typed from the English files (`i18next.d.ts`).
- Key names: `area.element` in camelCase (`signIn.title`, `programmeSwitcher.label`). Add a key to
  the English file and the Arabic file in the same change: `i18n/__tests__/i18n.test.ts` fails when
  the key sets or `{{placeholders}}` differ. New namespaces: add both JSON files, import them in
  `i18n/index.ts` `resources` and `NAMESPACES`.
- Language: `setAppLanguage('ar')` saves `qta-lang` in localStorage (guarded), changes the i18next
  language and sets `<html lang dir>`. Direction is handled centrally; do not set `dir` in
  components. Use Tailwind `rtl:` variants and logical utilities (`ms-`, `me-`, `ps-`, `pe-`,
  `start-`, `end-`, `text-start`) for direction-specific styling; flip directional icons with
  `rtl:-scale-x-100`.
- Trainer and admin portals stay English/LTR: `PortalShell` calls `usePortalLanguage(portal)`,
  which pins English while mounted and restores the saved choice on leaving. A choice made while
  pinned is saved and shown afterwards. Public, auth and learner follow the choice.
- `LanguageSwitcher` (`@/components/LanguageSwitcher`): EN / العربية group with `aria-pressed` and a
  `lang` attribute on each button. Not placed in any header yet (lanes A1 and A2 place it).
- Fonts: Noto Kufi Arabic (UI) and Noto Naskh Arabic (display) load from `client/index.html`;
  `styles/tokens.css` overrides `--qt-font-display` and `--qt-font-sans` under `:root[lang="ar"]`.
- `client/index.html` stays `lang="en" dir="ltr"` as the initial state; `main.tsx` applies the saved
  language before the first paint.

## Test updates caused by the new seed

`seed.test.ts` (Mariam's address; 120 current certificates plus 4 prior-cycle), and the certificate
counts in `analytics`, `reports`, `admin-workspace`, `demo`, `ai-analytics` and `learning-engine`
tests. New: `foundation-29oct.test.ts`, `i18n/__tests__/i18n.test.ts`,
`__tests__/LanguageSwitcher.test.tsx`, and the new actions in `shared/permissions.test.ts`.

## Learner portal Arabic and RTL (lane A2)

- Shell: `PortalHeader` shows `LanguageSwitcher` in the learner portal only (desktop and mobile; one
  instance, always visible). Learner nav labels use `labelKey` -> `learner:nav.*` in
  `app/navigation.ts` (English `label` stays the fallback; trainer/admin items have no key).
  Shell strings live under `learner:shell.*`. The `Logo` "Academy" wordmark stays English (brand).
- Sidebar: `components/ui/sidebar.tsx` maps `side` to the logical edge, so the desktop sidebar and
  the mobile sheet open from the right in Arabic. `components/ui` uses logical utilities
  (`ms-`, `pe-`, `start-`, `end-`, `text-start`, `border-s`) or `rtl:` variants. `Sheet` `side`
  stays physical (a caller asking for `right` gets the right edge); centred dialogs are symmetric.
- Charts: no learner screen uses recharts. Learner competency bars are CSS and start from the
  start edge, so they mirror. Recharts (admin/trainer only) stays English/LTR.
- Seed copy: Arabic map keyed by the exact English text in `shared/content/curriculum-ar.ts`;
  `tr(text, lang)` and `localised(row, lang)` in `client/src/i18n/localised.ts` apply it (fall back
  to English; ids, codes, counts untouched). `tr` also rebuilds sentences the mock services
  assemble from templates ("Continue: <title>", the recommendation rationale).
- Dates and times: `lib/format/qatar-time.ts` follows the active language (`ar-QA` with
  `nu-latn` Latin digits, `en-GB` otherwise), always in Asia/Qatar. Components that call these must
  use `useTranslation` so they re-render when the language changes.
- Plurals: no `_one`/`_other` keys (Arabic has more categories and the parity test compares key
  sets); use separate keys or `{{n}}`.

## Wave 2a notes (cross-lane wiring, reports, AI Analytics)

- LMS to CRM events all go through `services/crm/lms-events.ts` (`reportLmsEvent`, keyed by `payload.dedupeKey`):
  enrolment decisions (`approvals/decide.ts`), exam results (`assessments/attempts.ts`), completions
  (`progress/units.ts`, `progress/recompute.ts`), certification (`credentials/events.ts`, now also on issue and
  reissue) and licence review requests (`licence.service.requestLicenceReview`). Linked learners only, except
  certification, which reports for every learner. The CRM scenario reuses an existing event for the same fact.
- Program A pass mark: `Evidence.finalPassPercent` is the published post rule (`publishedPassPercent('A','post')`);
  `finalPassMark(evidence)` falls back to `THRESHOLDS.finalAssessmentPass`.
- New reports: `approvals`, `external-review`, `waitlist`, `account-status`, `cpd`, `content`, `crm-sync`
  (`services/reports/definitions/workflow.ts`); Certification gains validity and renewal; Assessment Results gains
  "Attempt limit reached". Dashboard counts equal the matching status filters (see `wave2a.test.ts`).
- Public "Join Program A" still enrols directly (registration to profile, e2e 01). Approval-gated enrolment is only used
  where a session or the CRM requires it (`requestEnrolment`); routing the public journey through approval would
  hold every new learner at "Pending review" and break that walkthrough.
