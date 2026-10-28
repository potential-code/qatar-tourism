# Permission matrix

The brief §11 matrix as implemented. The single source is `shared/permissions.ts`
(`PERMISSION_MATRIX`). The admin "Roles and permissions" screen (`/admin/manage/roles`) reads
the same data from `GET /api/admin/governance/permissions`.

## How access is enforced

Every check happens on the server. Hiding a button is never the check (brief §11).

1. **Role gate.** `requireRole(...)` in each module's routes file, with the allowed roles
   declared in that module's `<domain>.policy.ts`. A wrong role gets `403 FORBIDDEN`.
2. **Record scope.** `server/middleware/scope.middleware.ts` resolves the viewer's scope: `all`
   (admin), `trainer` (own sessions, learners booked on them, submissions assigned to them) or
   `self` (a learner's own records). Services call `assertSessionInScope`,
   `assertLearnerInScope` and `assertSubmissionInScope` next to their query. Trainer 1 asking
   for Trainer 2's session, roster, marks or submission gets 403 whatever ID is in the URL.
3. **Field visibility.** `visibleLearnerFields(role)` and `pickVisibleLearnerFields` in
   `shared/permissions.ts`. Trainers get learner ID and display name only. Admins get profile
   fields; contact fields (email, mobile) are stripped from reports, report exports and the audit
   export. Learners see their own contact details.
4. **Audit.** Every audited write and every export attempt, allowed or denied, writes an
   `audit_events` row with actor, role, time, object, action, before/after, reason and outcome.

Portal routes in the client also redirect a wrong role to its own home (`requireRole` in
`client/src/lib/route-guards.ts`), but that is convenience only.

## The nine rows of §11

| Action (brief wording)             | Learner              | Trainer                            | Admin                                            | Enforced in                                                                                                                                                                                      | Proved by                                                                                                                                                                                                         |
| ---------------------------------- | -------------------- | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View profile and learning          | Own only             | Assigned learners; limited fields  | Authorised Academy scope                         | `profiles.policy.ts` (own profile, id from the session); `progress`, `assessments`, `roleplay` learner-only routes; trainer learners via `attendance/learners.service.ts` + `assignedLearnerIds` | `scope.test.ts`; `attendance.test.ts` "assigned learners stay inside the trainer's scope"; `roleplay.test.ts` "another learner's enrolment and attempts are not reachable"                                        |
| View email, phone or identity data | Own permitted fields | Hidden by default; no QID          | Controlled fields; no real identity data in demo | `shared/permissions.ts` field lists, applied in `attendance`, `assignments.dto.ts`, `reports`, `exports`, `admin-governance`                                                                     | `permissions.test.ts` field visibility; `attendance.test.ts` "never contact fields"; `reports.test.ts` "contact fields are stripped"; `programmes.test.ts` "trainer profiles are public without contact details"  |
| Create sessions                    | No                   | Own permitted programmes           | All authorised programmes                        | `sessions.policy.ts` `assertCanCreate` (own trainer id, approved programme)                                                                                                                      | `sessions.test.ts` "a trainer cannot create a session for another trainer"; "a learner cannot reach the trainer workspace"                                                                                        |
| Mark attendance and work           | No                   | Assigned sessions/submissions      | Review and administer                            | `attendance.policy.ts`, `assignments.policy.ts` + `assertSessionInScope` / `assertSubmissionInScope`                                                                                             | `attendance.test.ts` "a trainer cannot mark another trainer's learners"; `assignments.test.ts` "Trainer 1 gets 403 for Trainer 4's submission"; "learners cannot reach marking"                                   |
| Export learner personal data       | No                   | Blocked                            | Permitted report scope                           | `exports.policy.ts` `exportAllowed`; `reports.routes.ts` `requireExport` (`canExportReports`). Denials return the §11 message and are audited                                                    | `exports.test.ts` "blocked for trainers and audited as denied", "learners are blocked; admins keep authorised access"; `reports.test.ts` "blocked with the brief's message, and the attempt is audited"; e2e `04` |
| Export marks                       | Own results only     | Optional learner ID and score only | Authorised reports                               | `exports.service.ts` with `TRAINER_MARKS_EXPORT_FIELDS` and session scope                                                                                                                        | `exports.test.ts` "learner ID and score only, for their own session", "Trainer 1 cannot export Trainer 2's marks"; e2e `04`, `07`                                                                                 |
| Change paths or certificates       | No                   | No                                 | Yes with audit trail                             | `admin-paths.policy.ts`, `admin-programmes.policy.ts`, `certificates.policy.ts` (revoke and reissue admin only)                                                                                  | `admin-paths.test.ts`, `admin-programmes.test.ts` "gets 403"; `permissions.test.ts` "only admins change paths and certificates"                                                                                   |
| Use AI Analytics                   | No                   | No Academy-wide access             | Authorised read-only analytics                   | `ai-analytics.policy.ts`, `analytics.policy.ts` (admin only); intents refuse writes and hidden fields                                                                                            | `ai-analytics.test.ts` "gets 403", "writes are refused", "hidden personal fields are refused"; `analytics.test.ts` "gets 403"                                                                                     |
| Manage permissions                 | No                   | No                                 | Authorised admin only                            | `users.policy.ts` (role changes, suspension), `admin-trainers.policy.ts`, `admin-governance.policy.ts`                                                                                           | `users.test.ts` "gets 403", "suspension revokes sessions and both changes are audited"; `admin-trainers.test.ts`; e2e `07` "cannot escalate"                                                                      |

`Access` levels in code: `none`, `own`, `assigned`, `authorised`. The note column above is the
brief's wording, stored as `note` on each row.

## Operational rights the journeys need

These are not rows in the brief's table. They are derived from §6, §10, §11 and §14 and shown
on the Roles screen as "Operational right".

| Action                                   | Learner                                 | Trainer                                                      | Admin                   | Enforced in                                                                                                   |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Edit, reschedule or cancel sessions      | No                                      | Own assigned sessions; programme reassignment needs an admin | All sessions            | `sessions.policy.ts` `assertEditAllowed`; `sessions.test.ts` "programme reassignment is admin only"           |
| Book, cancel and reschedule own sessions | Own bookings, within the 24-hour policy | No                                                           | Administrative changes  | `rsvps.policy.ts`; `rsvps.test.ts` "trainers cannot book", "a learner cannot touch another learner's booking" |
| Submit assignments                       | Own submissions                         | No                                                           | No                      | `assignments.policy.ts` `SUBMIT_ROLES`                                                                        |
| Revoke or reissue certificates           | No                                      | No                                                           | Admin only, audited     | `certificates.policy.ts` `certificateAdminRoles`                                                              |
| Reset demo data                          | No                                      | No                                                           | Demo administrator only | `demo.policy.ts`; `demo.test.ts` (401, 403 learner, 403 trainer, confirmation required, audited); e2e `08`    |
| View audit events                        | No                                      | No                                                           | Authorised admin        | `audit.policy.ts`, `admin-governance.policy.ts`                                                               |

## Other rules

- **Role cannot be self-assigned.** Better Auth's `role` field is `input: false`
  (`server/auth/auth.ts`). Public registration always creates a learner. Sign-in mode never
  grants a role. Proved by e2e `07` ("the Trainer sign-in mode works but never grants trainer
  access", "cannot escalate").
- **Demo toolbar.** Only the seeded admin can start it (`profiles.policy.ts`
  `assertFacilitator`). It reaches only the fixed list of seeded personas, trainers and the admin.
- **Simulated SSO** signs in only as two fixed seeded learners and refuses if either account is
  no longer a learner.
- **Program B certification** is locked off on the server (`admin-programmes.policy.ts`
  `canCertify`), not only in the UI.
- **Blocked export message** (brief §11, verbatim): "Your role does not allow this export.
  Contact the Academy administrator."
- **Matrix is fixed for the trial.** The Roles screen displays it. Role changes and trainer
  programme approvals are made in User and Trainer management.

## Gaps

- There is no learner-facing export. Learners see their own results on Progress, which
  satisfies "own results only" without a download.
- Certificate revoke and reissue are guarded by role and audited, but there is no automated
  test for them.

## Running the proofs

```bash
bun run test                 # unit and integration tests named above
bun run test:e2e             # e2e/04-marking-and-exports, e2e/07-permissions, e2e/08-reset
```
