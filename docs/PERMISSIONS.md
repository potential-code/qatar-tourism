# Permission matrix

The brief §11 matrix as implemented. The single source is `shared/permissions.ts`
(`PERMISSION_MATRIX`). The admin "Roles and permissions" screen (`/admin/manage/roles`) reads
the same data from the governance service (`client/src/services/admin/governance.service.ts`).

## How access is enforced

There is no server. Every check runs in the **browser services** (`client/src/services`), the
only code that reads or writes the demo data. Hiding a button is never the check (brief §11),
and changing an ID in the URL never grants access. Because the services run in the visitor's
browser, this models the rules faithfully but is not a security boundary (see
`docs/DEVIATIONS.md`).

1. **Role gate.** Every service function starts with `requireUser()` or `requireRole(...)`
   (`services/session-context.ts`). A wrong role gets `ApiError` 403 `FORBIDDEN`; signed out
   gets 401.
2. **Record scope.** `services/scope.ts` resolves the caller's scope: `all` (admin), `trainer`
   (own sessions, learners booked on them, submissions assigned to them) or `self` (a learner's
   own records). Services call `assertSessionInScope`, `assertLearnerInScope` and
   `assertSubmissionInScope` next to their read. Trainer 1 asking for Trainer 2's session,
   roster, marks or submission gets 403 whatever ID is in the URL, and the screen shows an
   access message.
3. **Field visibility.** `visibleLearnerFields(role)` and `pickVisibleLearnerFields` in
   `shared/permissions.ts`. Trainers get learner ID and display name only. Admins get profile
   fields; contact fields (email, mobile) are stripped from reports, report exports and the audit
   export. Learners see their own contact details.
4. **Audit.** Every audited write and every export attempt, allowed or denied, writes an audit
   event with actor, role, time, object, action, before/after, reason and outcome
   (`services/audit.service.ts`).
5. **Route guards.** Portal routes redirect a wrong role to its own home and a signed-out
   visitor to sign-in (`requireRole` in `client/src/lib/route-guards.ts`). Convenience only:
   the services check again.

## The nine rows of §11

| Action (brief wording)             | Learner              | Trainer                            | Admin                                            | Enforced in                                                                                                                                                                                      | Proved by                                                                                                                                                                                                         |
| ---------------------------------- | -------------------- | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View profile and learning          | Own only             | Assigned learners; limited fields  | Authorised Academy scope                         | `profiles.service.ts` (own profile, id from the session); `progress`, `assessments`, `roleplay` services are learner only; trainer learners via `attendance.service.ts` + `assignedLearnerIds` | `scope.test.ts`; `attendance.test.ts` "assigned learners stay inside the trainer's scope"; `roleplay.test.ts` "another learner's enrolment and attempts are not reachable"                                        |
| View email, phone or identity data | Own permitted fields | Hidden by default; no QID          | Controlled fields; no real identity data in demo | `shared/permissions.ts` field lists, applied in `attendance`, `assignments/dto.ts`, `reports`, `exports`, `admin/governance`                                                                     | `permissions.test.ts` field visibility; `attendance.test.ts` "never contact fields"; `reports.test.ts` "contact fields are stripped"; `catalogue.test.ts`  |
| Create sessions                    | No                   | Own permitted programmes           | All authorised programmes                        | `sessions/policy.ts` `assertCanCreate` (own trainer id, approved programme)                                                                                                                      | `sessions.test.ts` "a trainer cannot create a session for another trainer", "a learner cannot reach the trainer workspace"                                                                                        |
| Mark attendance and work           | No                   | Assigned sessions/submissions      | Review and administer                            | `attendance.service.ts`, `assignments.marking.service.ts` + `assertSessionInScope` / `assertSubmissionInScope`                                                                                             | `attendance.test.ts` "a trainer cannot mark another trainer's learners"; `assignments.test.ts` "Trainer 1 gets 403 for another trainer's submission", "learners cannot reach marking"; `sessions.test.ts` "Trainer 1 gets 403 for Trainer 2's session, roster and edits"; e2e `07`                                   |
| Export learner personal data       | No                   | Blocked                            | Permitted report scope                           | `exports.service.ts` `exportAllowed`; `reports/policy.ts` (`canExportReports`). Denials throw the §11 message and are audited                                                    | `exports.test.ts` "a personal-data export is blocked for trainers and audited as denied", "learners are blocked; admins keep authorised access"; `reports.test.ts`; e2e `04` |
| Export marks                       | Own results only     | Optional learner ID and score only | Authorised reports                               | `exports.service.ts` with `TRAINER_MARKS_EXPORT_FIELDS` and session scope                                                                                                                        | `exports.test.ts` "a trainer may export learner ID and score only, for their own session", "Trainer 1 cannot export Trainer 2's marks by changing the ID"; e2e `04`                                                                                 |
| Change paths or certificates       | No                   | No                                 | Yes with audit trail                             | `admin/paths.service.ts`, `admin/programmes.service.ts`, `certificates.service.ts` (revoke and reissue admin only)                                                                                  | `admin-paths.test.ts`; `learning-engine.test.ts` "a revoked certificate stays revoked"; `permissions.test.ts` "only admins change paths and certificates"                                                                                   |
| Use AI Analytics                   | No                   | No Academy-wide access             | Authorised read-only analytics                   | `ai-analytics.service.ts`, `analytics.service.ts` (admin only); intents refuse writes and hidden fields                                                                                            | `ai-analytics.test.ts` "personal fields, writes and raw queries are refused"; `analytics.test.ts`                                                                                     |
| Manage permissions                 | No                   | No                                 | Authorised admin only                            | `users.service.ts` (role changes, suspension), `admin/trainers.service.ts`, `admin/governance.service.ts`                                                                                           | `users.test.ts` "a role change is audited as a permission change", "a suspended learner cannot sign in again until reactivated"; `admin-workspace.test.ts`                                                                      |

`Access` levels in code: `none`, `own`, `assigned`, `authorised`. The note column above is the
brief's wording, stored as `note` on each row.

## Operational rights the journeys need

These are not rows in the brief's table. They are derived from §6, §10, §11 and §14 and shown
on the Roles screen as "Operational right".

| Action                                   | Learner                                 | Trainer                                                      | Admin                   | Enforced in                                                                                                   |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Edit, reschedule or cancel sessions      | No                                      | Own assigned sessions; programme reassignment needs an admin | All sessions            | `sessions/policy.ts` `assertEditAllowed`; `sessions.test.ts` "programme reassignment is admin only"           |
| Book, cancel and reschedule own sessions | Own bookings, within the 24-hour policy | No                                                           | Administrative changes  | `rsvps.service.ts`; `rsvps.test.ts` "trainers cannot book", "a learner cannot touch another learner's booking" |
| Submit assignments                       | Own submissions                         | No                                                           | No                      | `assignments.service.ts` (learner only)                                                                        |
| Revoke or reissue certificates           | No                                      | No                                                           | Admin only, audited     | `certificates.service.ts` (admin only)                                                              |
| Reset demo data                          | No                                      | No                                                           | Demo administrator only | `demo.service.ts`; `demo.test.ts` (401 signed out, 403 learner and trainer, audited, two resets identical); e2e `08`    |
| View audit events                        | No                                      | No                                                           | Authorised admin        | `audit.service.ts`, `admin/governance.service.ts`                                                               |

## Other rules

- **Role cannot be self-assigned.** Public registration always creates a learner
  (`registration.service.ts`). Sign-in mode never grants a role. Proved by e2e `07` ("the
  Trainer sign-in mode works but never grants trainer access").
- **Demo toolbar.** Only the seeded admin can start it (`services/auth/facilitator.ts`). It
  reaches only the fixed list of seeded personas, trainers and the admin. Learners and trainers
  never see it (e2e `07`, `08`).
- **Simulated SSO** signs in only as two fixed seeded learners and refuses if either account is
  suspended (`registration.test.ts`).
- **Program B certification** is locked off in the services (`admin/programmes.service.ts`),
  not only in the UI.
- **Blocked export message** (brief §11, verbatim): "Your role does not allow this export.
  Contact the Academy administrator."
- **Matrix is fixed for the trial.** The Roles screen displays it. Role changes and trainer
  programme approvals are made in User and Trainer management.

## Service tests that prove the rules

All in `client/src/services/__tests__/` unless noted.

| File                          | What it proves                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `shared/permissions.test.ts`  | The matrix: every action for all three roles, field visibility, the blocked-export wording       |
| `sessions.test.ts`            | Own sessions only; Trainer 1 gets 403 for Trainer 2's session, roster and edits; learners refused |
| `attendance.test.ts`          | Learner ID and display name only; scope; no marking of another trainer's learners                |
| `assignments.test.ts`         | 403 for another trainer's submission; own queue only; learners cannot reach marking              |
| `exports.test.ts`             | Marks export ID and score only; personal export denied and audited; Trainer 1 cannot export T02  |
| `reports.test.ts`             | Admin reports, contact fields stripped                                                           |
| `rsvps.test.ts`               | Trainers cannot book; a learner cannot touch another learner's booking                           |
| `notifications.test.ts`       | Own messages only; trainers see their own sessions' messages; learners refused the log           |
| `roleplay.test.ts`            | Another learner's attempts not reachable; trainers and admins cannot use learner practice        |
| `learning-engine.test.ts`     | Signed-out users and other roles refused; another learner's attempt not found                    |
| `profiles.test.ts`            | Own-profile functions need a learner session                                                     |
| `users.test.ts`               | Role changes audited; suspension blocks sign-in; admin cannot suspend an administrator           |
| `auth.test.ts`                | A suspended account cannot sign in                                                               |
| `ai-analytics.test.ts`        | Personal fields, writes and raw queries refused                                                  |
| `demo.test.ts`                | Reset: 401 signed out, 403 learner and trainer, audited, two resets identical                    |

## Gaps

- There is no learner-facing export. Learners see their own results on Progress, which
  satisfies "own results only" without a download.
- Certificate revoke and reissue are guarded by role and audited. Only the "stays revoked after
  recompute" path has an automated test.
- The checks run in the browser. Anyone with developer tools can change their own copy of the
  demo data. This is accepted for a mockup with fictional data (`docs/DEVIATIONS.md`).

## Running the proofs

```bash
bun run test                 # service and shared tests named above
bun run test:e2e             # e2e/04-marking-and-exports, e2e/07-permissions, e2e/08-reset
```
