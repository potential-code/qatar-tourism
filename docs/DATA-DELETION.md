# Data deletion plan

Brief §1: "Eiman requested written confirmation that all dummy data will be deleted after the
trial. Include a deletion plan covering records, uploads, recordings, generated certificates and
exported files; agree the trial end date with Potential before distribution."

## Details the client still has to confirm

| Item                                | Value                                                       |
| ----------------------------------- | ----------------------------------------------------------- |
| Hosting location (provider, region) | **[TO BE CONFIRMED]**                                       |
| Hosted demo URL                     | **[TO BE CONFIRMED]**                                       |
| Trial end date                      | **[TO BE CONFIRMED]**                                       |
| Deletion completed by (date)        | **[Trial end date + N days, TO BE AGREED]**                 |
| Person responsible for deletion     | **[TO BE CONFIRMED]** (Potential.com)                       |
| Who receives written confirmation   | Eiman (Qatar Tourism), via Rawzaba Alhalabi (Potential.com) |

## What data exists

All seeded data is fictional. Names, organisations, submissions, results and sessions are
invented. Every seeded email address ends in `example.com`. There are no real phone numbers and
no identity documents (no passport or QID fields exist). The customer's internal content,
workflow documents and personal data are not imported.

The seed creates 1,211 accounts (1 admin, 10 trainers, 1,200 learners), 20+ fictional "Demo"
organisations, 30 sessions, 1,260 enrolments and 120 demonstration certificates, plus their
progress, attempts, submissions, reviews, notifications and audit events.

**Data created during the trial.** Anyone with the demo URL can register. Public registration
accepts fictional `example.com` addresses only, and accounts can only be created through the
Academy's registration route. People demonstrating the platform should still use fictional
names and must not enter real personal data. Data entered during the trial is still covered by this plan.

## Where it is stored

| Data                                                    | Where                                                                                                                                                      | Notes                                                                                                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accounts, sessions, password hashes, verification codes | PostgreSQL: `user`, `session`, `account`, `verification`                                                                                                   | Better Auth tables                                                                                                                               |
| Learner profiles, organisations                         | PostgreSQL: `profiles`, `organisations`                                                                                                                    |                                                                                                                                                  |
| Programmes, courses, paths, rules, assessments          | PostgreSQL: `programmes`, `courses`, `content_packages`, `learning_paths`, `path_versions`, `path_items`, `assignment_rules`, `assessments`, `assignments` | Fictional curriculum                                                                                                                             |
| Learning records                                        | PostgreSQL: `enrolments`, `unit_progress`, `assessment_attempts`, `assessment_answers`, `roleplay_attempts`                                                | Role-play transcripts are stored as text                                                                                                         |
| Trainers and sessions                                   | PostgreSQL: `trainer_profiles`, `trainer_programmes`, `sessions`, `session_reschedules`, `rsvps`, `attendance`, `session_scores`                           |                                                                                                                                                  |
| Assignment submissions and reviews                      | PostgreSQL: `submissions`, `reviews`                                                                                                                       | Seeded file submissions are metadata only; no file exists                                                                                        |
| Certificate records                                     | PostgreSQL: `certificates`                                                                                                                                 |                                                                                                                                                  |
| Notifications and simulated emails                      | PostgreSQL: `notifications`                                                                                                                                | No email leaves the system                                                                                                                       |
| Audit events (including export attempts)                | PostgreSQL: `audit_events`                                                                                                                                 |                                                                                                                                                  |
| Demo clock and seed counts                              | PostgreSQL: `demo_meta`                                                                                                                                    |                                                                                                                                                  |
| **Uploaded files** (PDF, DOCX, MP4)                     | Server file system: `uploads/submissions/<submission id>/` and `uploads/tmp/` (in Docker: `/app/uploads`)                                                  | Only files learners upload during the trial                                                                                                      |
| **Generated certificates (PDF)**                        | Not stored. Generated on request                                                                                                                           | Copies exist wherever someone downloaded them                                                                                                    |
| **Exported files (CSV)**                                | Not stored. Generated on request                                                                                                                           | Copies exist wherever someone downloaded them                                                                                                    |
| **Voice recordings**                                    | Not stored. No audio is saved or uploaded                                                                                                                  | Speech-to-text runs in the browser. Chrome and Edge send the audio to their vendor's speech service; only the edited transcript reaches the demo |
| Server request logs                                     | Container stdout (Dokploy logs)                                                                                                                            | Method, path, status and request ID. Query strings are not logged                                                                                |
| Browser storage                                         | Each visitor's browser: auth cookies, `localStorage` (assignment drafts, active programme), `sessionStorage` (AI Analytics chat history)                   | Cleared by signing out and clearing site data                                                                                                    |
| Backups                                                 | **[TO BE CONFIRMED]**: whatever the hosting provider backs up                                                                                              | Must be included in deletion                                                                                                                     |

Third parties that see requests from visitors' browsers: Google Fonts (the Spectral and Jost
fonts), and the browser vendor's speech service when voice practice is used.

## Reset (during the trial)

A reset restores the deterministic snapshot. It removes everything created during a
walkthrough (registered visitors, bookings, marks, certificates issued, audit events) and
reseeds the fictional data.

- Admin screen: Academy Management → Audit and demo reset → **Reset demo data**.
- API: `POST /api/demo/reset` with `{ "confirm": true }`, as the admin.
- Command line: `bun run db:reset`.

**A reset also empties uploaded demo files** inside the uploads directory. At the end of the
trial, still remove the uploads volume itself (step 2 below).

## Full deletion (end of trial)

Do these in order and record the date and person for each step.

1. **Take the demo offline.** Stop the client and server services in Dokploy so no new data
   arrives.
2. **Delete uploaded files.** Remove the uploads directory and any volume mounted for it:
   `rm -rf /app/uploads` in the container (or `uploads/` in a local checkout), then delete the
   volume in Dokploy if one was created.
3. **Drop the databases.**

   ```sql
   DROP DATABASE qatar_tourism_db;     -- or the hosted database's name
   DROP DATABASE qatar_tourism_test;   -- where a test database exists
   ```

   If the database is a managed service, delete the instance and its automated backups and
   snapshots.
4. **Remove the deployment.** Delete the Dokploy application (both services), its environment
   variables (including `BETTER_AUTH_SECRET` and `SEED_DEMO_PASSWORD`), container logs, built
   images and the DNS records for the demo domains.
5. **Delete backups** held by the hosting provider for the demo database and server.
6. **Delete downloaded copies.** Ask everyone who ran the demo to delete exported CSV files and
   downloaded certificate PDFs, and to clear site data for the demo domain in their browsers.
7. **Local development copies.** On each developer machine: `bun run db:reset` is not enough.
   Drop the local databases, delete `uploads/`, `e2e/.results` and `e2e/.report`.
8. **Confirm in writing** to Potential.com, listing steps 1 to 7 with dates, for onward
   confirmation to Qatar Tourism.

The source code repository contains only fictional seed logic and no trial data, so it does not
need deleting. Delete it too if the client asks.
