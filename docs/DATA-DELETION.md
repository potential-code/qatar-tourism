# Data deletion plan

Brief §1: "Eiman requested written confirmation that all dummy data will be deleted after the
trial. Include a deletion plan covering records, uploads, recordings, generated certificates and
exported files; agree the trial end date with Potential before distribution."

## Details the client still has to confirm

| Item                                | Value                                                       |
| ----------------------------------- | ----------------------------------------------------------- |
| Hosting location (provider, region) | **[TO BE CONFIRMED]** (static files only)                   |
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

**There is no server-side data.** The demo is a static website. The hosting serves files and
stores nothing that visitors enter. Each visitor's browser builds its own copy of the fictional
dataset on first load and keeps it in IndexedDB. Nobody else, including Potential.com, can see
or collect it.

**Data created during the trial.** Anyone with the demo URL can register, in their own browser
only. Public registration
accepts fictional `example.com` addresses only, and accounts can only be created through the
Academy's registration route. People demonstrating the platform should still use fictional
names and must not enter real personal data. Data entered during the trial is still covered by this plan.

## Where it is stored

| Data                                                                       | Where                                                                                                                 | Notes                                                                                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accounts, profiles, learning records, sessions, marks, certificates, audit | Each visitor's browser: IndexedDB database `qta-demo`, object store `snapshots`                                       | One copy per browser and site address. Never sent anywhere                                                                                       |
| Notifications and simulated emails                                         | Same IndexedDB snapshot                                                                                               | No email leaves the browser                                                                                                                      |
| **Uploaded files** (PDF, DOCX, MP4)                                        | Each visitor's browser: IndexedDB `qta-demo`, object store `uploads`                                                  | Only files submitted during the trial. Files chosen but not submitted are lost on reload. Seeded file submissions are metadata only              |
| **Generated certificates (PDF)**                                           | Not stored. Drawn in the browser on request                                                                           | Copies exist wherever someone downloaded them                                                                                                    |
| **Exported files (CSV)**                                                   | Not stored. Generated in the browser on request                                                                       | Copies exist wherever someone downloaded them                                                                                                    |
| **Voice recordings**                                                       | Not stored. No audio is saved or uploaded                                                                             | Speech-to-text runs in the browser. Chrome and Edge send the audio to their vendor's speech service; only the edited transcript reaches the demo |
| Other browser storage                                                      | `localStorage` (assignment drafts, active programme), `sessionStorage` (AI Analytics chat history, celebration flags) | Cleared with the site data                                                                                                                       |
| Web server access logs                                                     | nginx in the container (Dokploy logs), where enabled                                                                  | Request lines only. Visitors' demo data is never sent to the server                                                                              |
| Backups                                                                    | **[TO BE CONFIRMED]**: whatever the hosting provider backs up                                                         | Only the built site files and logs. No visitor data                                                                                              |

Third parties that see requests from visitors' browsers: Google Fonts (the Spectral and Jost
fonts), and the browser vendor's speech service when voice practice is used.

## Reset (during the trial)

A reset restores the deterministic snapshot **in that browser**. It removes everything created
during a walkthrough (registered visitors, bookings, marks, certificates issued, audit events,
uploaded files) and reseeds the fictional data.

- Admin screen: Academy Management → Audit and demo reset → **Reset demo data**.
- Or clear the site data for the demo's address in the browser settings. The next visit seeds a
  fresh copy.

## Full deletion (end of trial)

Do these in order and record the date and person for each step.

1. **Take the demo offline.** Stop the service in Dokploy so nobody can load it.
2. **Remove the deployment.** Delete the Dokploy application, its environment variables
   (including the Basic Auth credentials), container logs, built images and the DNS records for
   the demo domain.
3. **Delete backups** held by the hosting provider for the demo (site files and logs only).
4. **Clear browsers.** Ask everyone who ran the demo to clear site data for the demo's address
   (this deletes their IndexedDB copy, uploaded files and drafts), and to delete exported CSV
   files and downloaded certificate PDFs.
5. **Local development copies.** On each developer machine, clear site data for the local dev
   address (for example `http://localhost:5173`) and delete `e2e/.results` and `e2e/.report`.
   The e2e suite uses throwaway browsers, so it leaves nothing behind.
6. **Confirm in writing** to Potential.com, listing steps 1 to 5 with dates, for onward
   confirmation to Qatar Tourism.

The source code repository contains only fictional seed logic and no trial data, so it does not
need deleting. Delete it too if the client asks.
