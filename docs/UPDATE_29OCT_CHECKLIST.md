# 29 Oct update: handover and acceptance checklist

This page is for the facilitator running the walkthrough and for Qatar Tourism reviewers. All
thresholds, rules and settings shown in the demo are "Demo settings — subject to Qatar Tourism
confirmation". Everything runs in the browser; no live system is connected.

## 1. Access

Password for every account: `password`.

| Role | Email | Deep link (signs in without the form) |
| --- | --- | --- |
| Academy admin | `admin@example.com` | `/?demo-as=user-admin` |
| Fresh learner Noor Haddad (LRN-0036), starts at the profile wizard | `noor.haddad@example.com` | `/onboarding?demo-as=user-l0036` |
| Demonstration learner Mariam Al Nuaimi (LRN-0042, CRM-0042) | `mariam.alnuaimi@example.com` | `/learner?demo-as=user-l0042` |
| Learner Maha (Program B path) | `maha.alnouri@example.com` | `/learner?demo-as=user-l0001` |
| Learner Omar (Program A, joins the waitlist) | `omar.alsafi@example.com` | `/learner?demo-as=user-l0002` |
| Waitlist, seat-offer learner (LRN-0096) | `olivia.issa@example.com` | `?demo-as=user-l0096` |
| Confirmed learner who cancels (LRN-0060) | `ali.khalil@example.com` | `?demo-as=user-l0060` |
| Assessment retake learner (LRN-0679, Program B) | `samira.hussein@example.com` | `?demo-as=user-l0679` |
| Assessment demo learner, 50% baseline and 80% post (LRN-0022) | `nadia.haddad@example.com` | `?demo-as=user-l0022` |
| Trainer 1 (Amal Al Nouri) | `amal.alnouri@example.com` | `/trainer?demo-as=user-t01` |

Append `?demo-as=<userId>` to any path, for example `/admin/manage/approvals?demo-as=user-admin`.
The seeded locked learner is LRN-1199 (Rashid Menon). The full session is SES-T03-2.

**Reset demo**: Admin, Academy Management, Audit and demo reset, "Reset demo data". It restores the
seed, the CRM event queue, approvals, attempts and the demo clock. Demo data lives in each browser
(IndexedDB), so a reset affects only that browser.

## 2. Walkthrough script (SPEC section 10)

| # | Check | Where | What to do and see |
| --- | --- | --- | --- |
| 1 | One account, A and B, one record | Sign in as Mariam; `/learner`, `/learner/record` | Use "My programmes" to switch A and B with no new sign-in. My Learning Record: combined Training History; Program B rows read "Completed — no programme certificate"; Certificates and CPD tab shows the credential wallet and CPD ledger. |
| 2 | Bilingual packages | `/learner/learning/C08`, `/learner/learning/C09`, `/admin/manage/content` | Launch C08 in English, go to screen 3, reload and Resume. Pick the Arabic content language: "Your progress has been saved. Open the Arabic version?" Complete the 3-question check; reload shows Unit complete (credit once). C09 xAPI statements are labelled "Simulated learning record store". Content Library: package IDs, versions, Preview, Tracking test; Articulate preview is labelled simulated. |
| 3 | Waitlist, approvals, lock | `/learner/sessions` (Omar), cancel as LRN-0060, accept as LRN-0096, `/admin/manage/sessions`, `/admin/manage/approvals`, `/admin/manage/users/<id>` | Omar joins the SES-T03-2 waitlist (position 4). LRN-0060 cancels; LRN-0096 is offered the seat for 24 hours and accepts; the roster updates. Approve REQ-0004. Lock a learner (reason required), sign-in shows "This account is locked. Contact Academy support"; unlock restores access with history intact. |
| 4 | Assessment banks and rules | `/admin/manage/assessments`, `/learner/assessments/post` (LRN-0679) | Builder tab: Preview shows the rule used and drawn questions; Draw again or Preview in Arabic. The learner retakes (new draw), fails, sees "Attempt limit reached — request support". Admin: Attempts tab, View, Grant extra attempt with a reason; the audit page shows it. |
| 5 | Clock, renewal, external CPD | `/admin/manage/certificates`, `/learner/record` | Advance the demo clock 20 days (reminder created). Mariam: Start renewal, Complete refresher, renewal check, Complete renewal. Old credential Superseded, new Active. Add an external certificate (Use sample file); Pending review adds no CPD; admin approves with the recognised amount; the ledger counts it once. |
| 6 | Hosting, SSO, CRM | `/admin/manage/integrations` | Illustrative copy, tabs Overview, SSO, API Access, Content Hosting, Data Residency, CRM Integration. SSO Test sign in: simulate a failed login, Retry, continue as Mariam (same account, no duplicate). CRM: Run scenario; step 1 pauses on the QT-A mapping error; Resolve mapping, Save, Retry event: "Event processed. Existing enrolment updated; no duplicate record created." Advance steps 2 to 7 (steps 3 to 5 need "Continue with simulated evidence" because Mariam has unmet gates; nothing is skipped silently). |
| 7 | Counts agree; reset | `/admin`, reports, `/admin/ai-analytics` | Dashboard Pending approvals, Waitlisted learners, Locked accounts and CRM Failed events equal the matching report tiles and the AI Analytics answers for the four new prompts. Reset demo and repeat any path above. |

Automated equivalents: `e2e/10-update-checklist.spec.ts` (checks 1 to 7), `e2e/11-arabic-rtl.spec.ts`,
`e2e/09-accessibility.spec.ts`. Run with `bunx playwright test`.

LMS to CRM licence review: Admin, Users, learner detail, "Request licence review in CRM". It stays
pending until the CRM acknowledges it. A certificate or exam result never changes licence status.

## 3. Working and simulated

| Area | Working in the demo | Simulated |
| --- | --- | --- |
| Single sign-on | Role mapping, account matching, failure and retry states, audit trail | The identity provider. No IdP is contacted. |
| CRM | Field mapping edits, event queue, dedup by event ID, retry, resolve mapping, reconcile, identity review, scenario | The CRM itself and every endpoint. No network calls. |
| Learning record store | SCORM runtime (real packages, bookmarks, score, completion); xAPI statements recorded | The LRS: statements are stored in the browser and labelled simulated. |
| Hosting and data residency | Package catalogue, access settings, protected-launch preview states | All regions and providers read "To be confirmed". Nothing is hosted outside the demo. |
| Email | Notification log with recipient, template, trigger, time | No email is sent; every row is marked simulated. |
| Account lock | Blocks sign-in in the app, ends the session, keeps history | Enforced client-side only; no identity system is changed. |
| Articulate | Preview shows what is missing | No Articulate export is available; the package tests are listed as Not run. |
| Learner data | Waitlist offers, approvals, assessments, credentials, CPD, renewal, external review | Fictional records, kept per browser. |

## 4. Asset register

See `docs/ASSET_REGISTER.md` (URL, owner, licence or permission, attribution, language, where used).

## 5. Decisions needed from Qatar Tourism

1. Hosting regions and providers for LMS records, uploaded content, backups, logs, LRS and AI or voice processing.
2. SSO provider and protocol (SAML or OpenID Connect) and the group-to-role mapping.
3. CRM ownership, field mapping and source of truth, including the programme code map (QT-A, QT-B, QT-C).
4. Approval roles: who reviews enrolments and external certificates, and who may lock accounts or grant attempts.
5. Assessment rules: draw counts, pass percentage, attempt limit, time limit, score policy.
6. CPD and renewal policy: validity period, annual target, units, reminder intervals, whether Program B earns CPD.
7. Final review of the Arabic content by a native reviewer.

## 6. Known limitations

- Data is stored in each browser. A different device or profile starts from the seed.
- Program A public enrolment is not approval-gated by design: it would hold every new learner at Pending review. Approval applies where a session or the CRM requires it.
- The admin portal is built for desktop; some admin pages scroll sideways at 390 px width.
- A few Arabic strings stay English: the SCORM status line in the learner player, and the stage names "Level 1" and "Level 2".
- Lock, SSO and CRM controls are demonstrations; they do not protect anything beyond the prototype.
