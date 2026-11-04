# Walkthrough script (15–20 minutes)

The connected demonstration from brief §17. Each step matches a Playwright spec in `e2e/`, so
the same story is tested on every run. Times are a guide.

All accounts use the password `password`. Account list: `README.md` → Demo accounts.

**Use one browser window for the whole demo.** The demo data lives in that browser (IndexedDB).
Learner, trainer and admin views connect because they share it: switch roles with the **Demo
toolbar**, never with a second browser or a private window, which would start from the seed.

## Before you start

1. **Reset the demo.** Sign in as `admin@example.com`, open Academy Management → **Audit and
   demo reset**, choose **Reset demo data** and confirm. Clearing the site data in the browser
   does the same.
2. **Check the dashboard.** `/admin` should show 1,200 unique learners, 1,260 enrolments and
   120 A certificates issued.
3. **The reference date** is fixed (`shared/constants/demo.ts`, Tuesday 27 October 2026), so
   every browser shows the same dataset and Day +2 is Thursday 29 October. A build can move it
   with `VITE_DEMO_REFERENCE_DATE`.
4. **Use Chrome** if you want to show voice practice with speech-to-text.
5. **Prepare a fresh visitor email** ending in `@example.com` (for example
   `visitor.demo1@example.com`). Reusing one gives the duplicate-account message.
6. **Have a response plan ready to paste** (300–500 words). A fictional one is in
   `e2e/support/content.ts`.
7. Keep one browser window. After the visitor registration (2–5 minutes), sign out and sign in
   as the admin; the **Demo toolbar** then switches between personas, trainers and the admin
   without passwords.

**Correct assessment answers** (options are shuffled on screen):

| Competency          | Baseline answer                            | Post answer                                          |
| ------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Discover needs      | Ask about interests and available time     | Ask about their priorities, then recommend           |
| Verify information  | Verify from an authorised source           | Verify availability before confirming                |
| Communicate clearly | Use plain language and check understanding | Give clear steps, then confirm they understood       |
| Recover service     | Acknowledge and offer feasible options     | Acknowledge the impact and explain realistic choices |
| Protect information | Use an authorised contact route            | Use the permitted platform channel                   |

---

## 0–2 minutes: homepage and programmes

_Spec: `e2e/01-public-and-registration.spec.ts`, first test._

1. Open the homepage (`/`). Signed out.
2. Point out the Qatar Tourism logo, the hero "Build the skills to create memorable visitor
   experiences." and the motion.
3. Scroll to **Find your next learning journey**: three cards.
   - Program A, Tourism Service Professional: **Demonstration certificate**.
   - Program B, Visitor Service Essentials: **No certificate**.
   - Program C, Destination Storytelling: **Illustrative sample**.
4. Choose **View programme** on Program A to show the detail page (`/programmes/a`).
5. Back on the homepage, choose **Start your journey**. It opens registration.

**Evidence to show:** branding, animation, meaningful programme differences and public entry.

## 2–5 minutes: register a visitor and generate a Program B path

_Spec: `e2e/01-public-and-registration.spec.ts`, second test._

1. On `/register`, note "New accounts start with Program B". Enter a full name (for example
   Fatima Hassan), the fresh email and a password. Choose **Create account**.
2. **Verify your email.** Choose **Show my demo code**, then **Use the demo code**, then
   **Verify**. Point out the "Simulated email" label: nothing was sent.
3. Profile wizard:
   - Step 1: organisation "Demo Pearl Hospitality", job title "Front Office Agent", job function
     Front office, seniority Entry level, experience 1–3 years. **Continue**.
   - Step 2: country Qatar, language English. **Continue**.
   - Step 3: goals Complaint handling and Communication, 60 minutes a week, accept the demo
     terms. **Finish my profile**.
4. Welcome page: "Program B: Visitor Service Essentials" and "Your starting path: Hotel guest
   services" (chosen by the profile rules).
5. **Start pre-assessment.** Answer two questions correctly and three wrongly for a 40 percent
   baseline. Results show by competency.
6. **Build my learning path.** Point out the "Demo mode: scripted recommendation" label, the
   inputs (Baseline 40%), the rationale ("lowest baseline areas"), suggested units including
   "AI complaint scenario" and a **Recommended extra**. Choose **Start this path**.
7. Open **Welcoming every visitor** (C01). Play the captioned sample video and show the
   transcript.
8. Open C04 **Recovering a difficult service moment** (`/learner/learning/C04?programme=B`).
   Note the "SCORM 2004 sample package" label. **Launch**, **Start**, then **Save and exit** at
   step 2. The page now offers **Resume**: the package saved its place.

**Evidence to show:** default B routing, tailored recommendation, playable video and
interactive module.

## 5–7 minutes: practice and the completed Program B example

_Spec: `e2e/02-practice-and-completed-b.spec.ts`._

1. Sign out (account menu), then sign in as `admin@example.com` with the Academy admin mode.
   Demo toolbar → **Maha Al Nouri**. Open My learning (Program B) → **AI complaint scenario:
   Changed booking**.
2. Note the "Simulated AI practice" label. Choose Text (or Voice in Chrome), then **Start
   conversation**. Reply four to six times: acknowledge, ask a question, verify and offer two
   options, escalate, confirm follow-up. Choose **Get feedback**.
3. Feedback page: score out of 100, five rubric criteria each with an evidence excerpt, the
   transcript, and "Visitor (simulated)".
4. Demo toolbar → **Sara Mansour**. Her Overview says "You have completed Program B." with
   baseline 60%, post 100% and +40 percentage points.
5. **Full progress**: points per competency (for example Recover service 0 → 20).
6. AI practice → open her attempt: rubric and conversation transcript.
7. There is no Certificates item in her navigation. `/learner/certificates` explains that
   Program B has no certificate.

**Evidence to show:** transcript, criterion scores, pre/post improvement and no certificate.

## 7–10 minutes: book a session, reschedule it as the trainer

_Spec: `e2e/03-booking-and-reschedule.spec.ts`._

1. Demo toolbar → **Omar Al Safi**. My sessions (Program A) says "Level 1 complete. You are
   eligible to book."
2. Open **Welcoming every visitor** (SES-T01-2, Amal Al Nouri, Day +2 09:00 Qatar time,
   in person). It shows 19 of 24 seats remaining. **Confirm booking**.
3. **Your bookings** shows it as Confirmed. The card now says "You are booked" and 18 seats.
4. Demo toolbar → **Amal Al Nouri**. My sessions → SES-T01-2 → **Reschedule**.
5. Move it one day later, 11:00 to 12:00, reason "The room is needed for an Academy briefing."
   Before confirming, the dialog shows **6 registered learners** will be notified.
6. **Confirm reschedule.** The modal reads: "In-app notifications have been created for 6
   registered learners. Demo emails have been generated in the notification log; no external
   emails were sent." with a "Demo email, not sent" tag.
7. **View notification log.** Each learner has one in-app notice ("Delivered in app") and one
   demo email ("Simulated: no email sent").
8. Demo toolbar → **Omar Al Safi**. My sessions shows the new time, "Rescheduled by your
   trainer" and the reason. The bell holds the notice.

**Optional (spec second test):** as Amal, open SES-T01-3 and **Cancel session**. The dialog
says the session and its history are kept, and the modal uses the equivalent cancellation
wording.

**Evidence to show:** eligibility, capacity, My sessions update and the simulated
notification log.

## 10–13 minutes: attendance, scoring, marking and a denied export

_Spec: `e2e/04-marking-and-exports.spec.ts`._

1. Demo toolbar → **Amal Al Nouri**. Attendance and scores → SES-T01-2.
2. Set **L0002 Omar Al Safi** to Attended. Choose **Score**: Preparation 17, Communication 25,
   Practical application 24, Professionalism 18 (total 84), short feedback, **Submit final
   score**. The row shows "84 Pass Final".
3. Demo toolbar → **Omar Al Safi**. My learning (Program A): "Delivering service in practice"
   is now Complete.
4. Demo toolbar → **Daniel Costa**. Assignments → **Visitor service response plan**. Version 1
   was returned for revision at 62/100 with trainer feedback. Paste the response plan and
   **Submit version 2**. It goes back to Noura Al Saleh, who marked version 1.
5. Demo toolbar → **Noura Al Saleh**. Assignments → Daniel Costa → **Mark version 2**. Score the
   four parts (for example 20, 19, 21, 20), write feedback, **Save draft**, then choose
   **Approve** and **Finalise**. The confirmation mentions the simulated demo email.
6. Demo toolbar → **Daniel Costa**. The assignment shows Approved with the new feedback.
7. Demo toolbar → **Amal Al Nouri**. Attendance and scores → SES-T01-2.
   - **Export marks (learner ID and score)** downloads a CSV. Allowed.
   - **Export personal data** shows: "Your role does not allow this export. Contact the Academy
     administrator." and notes the attempt is recorded in the audit log as denied.
8. Demo toolbar → **Academy Admin**. Reports → Sessions and attendance → **Export CSV**
   downloads. Academy Management → Audit and demo reset: search `export.personal`. Amal's
   attempt shows Denied. Search `export.report_csv`: the admin's report export shows Allowed.

**Evidence to show:** changes propagate, export denied, admin retains authorised access.

## 13–16 minutes: complete Program A, then the admin Dashboard and reports

_Spec: `e2e/05-certification-and-admin.spec.ts`._

1. Demo toolbar → **Omar Al Safi**. My learning (Program A) → **Planning a helpful visitor
   response** (C05): tick the checklist, write a short plan (at least the minimum words shown)
   and choose **Mark complete**. It is a required Level 2 unit.
2. My learning (Program A) → **Practical assignment** →
   Visitor service response plan. Paste the plan and submit. It goes to Amal Al Nouri.
3. Demo toolbar → **Amal Al Nouri**. Assignments → Omar Al Safi. Score (for example 22, 20,
   20, 20), feedback, **Approve**, **Finalise**.
4. Demo toolbar → **Omar Al Safi**. My learning → **Final assessment** ("You need at least 80
   percent."). **Start** and answer all five correctly. "Passed. The pass mark is 80 percent."
5. **Certificates**: one certificate, QTA-DEMO-A-000121. Open it: the watermarked
   demonstration certificate. **Download PDF**, then **Verification page**.
6. Demo toolbar → **Academy Admin**. The Dashboard now shows **A certificates issued 121**,
   the Program A funnel includes 121, **Unique learners 1,201** and **Enrolments 1,261**
   (the new visitor joined Program B, so B has 661).
7. Choose the **A certificates issued** card. It opens the Certification report with 121
   records. Search QTA-DEMO-A-000121 and open the row: the eligibility evidence reads
   "Foundation quiz 80+, session 70+, assignment 70+, final assessment 100". Download the PDF,
   then **Open learner record**.
8. Reports → **Program A users**: 420 enrolments. Filter Organisation type = Tour operator; the
   count drops. **Reset filters** returns to 420.

**Evidence to show:** certificate eligibility, updated totals, filtered tables and
drill-down.

## 16–19 minutes: AI Analytics and a new path variant

_Spec: `e2e/06-analytics-and-paths.spec.ts`._

1. Dashboard → **AI Analytics**. Note the "Demo analytics assistant" label and at least seven
   suggested prompts.
2. Choose **How many learners are in each programme?** The results canvas shows "Learners by
   programme" with a chart, a data table (Program A 420, Program B 661) and the sample size.
3. Type **Compare pre and post scores for Program B.** and send. The canvas shows "Pre and post
   scores, Program B" with paired learners. Choose **View underlying records**: the
   Assessments and improvement report opens, already filtered to Program B.
4. Academy Management → **Learning path management** (Program B) → **New path variant**. Name
   it (for example "B Tour operator welcome"), add a description, **Create draft**.
5. Make "Planning a helpful visitor response" optional, **Save draft**. In **Learner preview**
   enter L0001 and **Preview**: Maha's learning path in the variant.
6. **Publish v1**. The dialog shows the impact on existing learners. Add a version note and
   publish.
7. Back on Learning path management → **Add rule**: name it, wording "Organisation type = tour
   operator", assign the new variant, priority 15, status Published, value Tour operator. The
   rule reads "Organisation type is Tour operator". Preview with L0002: Omar (Demo Horizon
   Tours) resolves to the variant. **Save rule**.
8. In **Preview the match**, L0002 resolves to the variant; L0001 (Maha) still resolves to "B
   Hotel guest services".

**Evidence to show:** charts from actual data, underlying records, profile rules and learner
preview.

## 19–20 minutes: permissions recap (optional)

_Spec: `e2e/07-permissions.spec.ts`._

- As Maha, open `/trainer` or `/admin/reports/program-a`: she is sent back to `/learner`.
- Sign out, open `/login?mode=trainer`: "Choosing this mode does not grant trainer access." The
  connected sign-in buttons are labelled Simulated.
- As Amal, open another trainer's session by URL (`/trainer/attendance/<SES-T02-2 id>`): an
  access message, no roster.
- The demo toolbar is only there for the admin. Signed in with the form as a learner or a
  trainer, it does not appear.

## After the demo

Reset again (Audit and demo reset → **Reset demo data**). The dashboard returns to 1,200 /
1,260 / 120 (`e2e/08-reset.spec.ts` checks that two resets give identical numbers). The reset
also removes the visitor account you registered and any uploaded files. It only affects this
browser; see `docs/DATA-DELETION.md`.

## Running the script automatically

```bash
bun run test:e2e
```

This starts its own Vite server and a fresh browser (so it starts from the seed), runs every
step above in order at 1440 px in one shared browser context, then resets through the admin
screen and checks that two resets give identical dashboard numbers.
