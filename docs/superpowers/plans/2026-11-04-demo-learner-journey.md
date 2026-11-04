# Demo Learner Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the learner demo believable and easy to present: name-based emails, one fresh learner (Noor Haddad) who starts at the profile wizard, and every persona reachable from the sign-in page.

**Architecture:** Frontend-only mock (seed in `client/src/mocks/seed`, services in `client/src/services`, IndexedDB snapshot). Emails come from one shared slug helper. Noor is a new seeded persona with a blank draft profile and Program B `not_started`. One shared list of demo learners feeds both the sign-in page and the facilitator toolbar. `DB_VERSION` is bumped so existing browsers reseed.

**Tech Stack:** Bun 1.4, React 19, TanStack Router/Query, i18next (en/ar), Vite 8, bun test + happy-dom, Playwright.

**Spec:** No separate spec file. Decisions agreed with Aliya on 2026-11-04 in chat:
1. All seeded learners and trainers use `firstname.lastname@example.com`. This deviates from brief §15/§16 (`learner0001@example.com`…, `trainer01@example.com`…). Log it in `docs/DEVIATIONS.md`.
2. A seeded learner **Noor Haddad** starts at the profile wizard: blank draft profile, Program B not started. Admin **Reset demo** makes her fresh again.
3. Keep all brief §15 personas. Present one story: Noor runs the full journey, the other personas are "see this state" shortcuts.
4. The sign-in page lists all demo learners (Noor first), so no one needs the admin toolbar to reach Omar etc.
5. The "Exam learners" question is dropped.

## Global Constraints

- Every seeded address ends in `@example.com` (brief §4: "use fictional addresses ending in example.com for all seeded accounts").
- `admin@example.com` stays unchanged.
- Demo password stays `DEMO_PASSWORD = 'password'` (`shared/constants/demo.ts`).
- Auth pages are bilingual: every new sign-in string has an `en` and an `ar` key in `client/src/i18n/locales/{en,ar}/auth.json`. Trainer and admin UI stay English only.
- No backend. No new dependencies.
- Learner codes (`L0001`, `LRN-0042`) and user ids (`user-l0001`) do not change. Only emails change.
- Brief §15 persona identities, stages and scores do not change.

## Review Focus

1. **Old browser snapshot.** A browser that already holds the v3 seed has `learner0001@example.com`, so the new sign-in buttons would fail. Expected: bump `DB_VERSION` to 4 so it reseeds (Task 2 test).
2. **Noor reused after a demo run.** After one walkthrough Noor is mid-journey. Expected: admin Reset demo returns her to a blank draft at wizard step 1 (Task 2 test).
3. **Slug collisions.** Two generated names can slug to one address (e.g. spacing variants), or a learner and trainer can share one. Expected: every seeded email is unique (Task 1 test over all users).
4. **Registering a seeded address.** A presenter who types `noor.haddad@example.com` on `/register` must get the existing "account exists" error, not a second Noor (Task 1 registration test with the new address).
5. **Arabic sign-in page.** The new "More demo learners" list and purposes must render in Arabic with RTL and no missing keys (Task 4 test).

---

### Task 0: Commit the in-progress sign-in work (ask Aliya first)

The working tree has Aliya's uncommitted edits to `client/src/features/auth/components/SignInPage.tsx`, `client/src/features/public-site/components/HowItWorks.tsx` and both `auth.json` files. They add the `DEMO_ACCOUNTS` buttons that Task 4 builds on.

- [ ] **Step 1:** Ask Aliya to commit or approve committing those four files as they are. Do not start Task 4 on an unknown base.
- [ ] **Step 2:** Run `bun run typecheck && bun run test`. Expected: pass.

---

### Task 1: Name-based emails for every seeded learner and trainer

**Files:**
- Modify: `shared/utils/identity.ts` (add helper)
- Modify: `client/src/mocks/seed/ids.ts:50-51` (delete `learnerEmail`, `trainerEmail`)
- Modify: `client/src/mocks/seed/learners.ts:529` (use helper with dedupe)
- Modify: `client/src/mocks/seed/trainers.ts:231`
- Modify: `client/src/mocks/seed/personas.ts:30-31,148` (drop the `email` override; Mariam's slug already gives `mariam.alnuaimi@example.com`)
- Modify tests that hard-code old emails: `client/src/services/__tests__/{seed,auth,users,registration}.test.ts`, `shared/permissions.test.ts`, plus any other hit from `grep -rn "learner[0-9]\{4\}@\|trainer[0-9]\{2\}@" client shared e2e`
- Modify: `client/src/features/design-showcase/DesignShowcase.tsx:264`, placeholders in `LearnerFormDialog.tsx` and `TrainerFormDialog.tsx` if they show the old pattern
- Test: `shared/utils/identity.test.ts` (create)

**Interfaces:**
- Produces: `demoEmail(fullName: string): string` in `shared/utils/identity.ts`.
  Rule: lowercase; strip everything except `a-z` and spaces; first word, then `.`, then the remaining words joined with no separator; append `@example.com`.
- Produces: `uniqueDemoEmail(fullName: string, used: Set<string>): string` in the same file. Returns `demoEmail(fullName)`, or inserts `2`, `3`, … before `@` until unused. Adds the result to `used`.

- [ ] **Step 1: Write failing tests** in `shared/utils/identity.test.ts`:

```ts
expect(demoEmail('Maha Al Nouri')).toBe('maha.alnouri@example.com')
expect(demoEmail('Mariam Al Nuaimi')).toBe('mariam.alnuaimi@example.com')
expect(demoEmail('Daniel Costa')).toBe('daniel.costa@example.com')
expect(demoEmail("Rafael D'Sousa-Lima")).toBe('rafael.dsousalima@example.com')
const used = new Set(['sara.mansour@example.com'])
expect(uniqueDemoEmail('Sara Mansour', used)).toBe('sara.mansour2@example.com')
expect(used.has('sara.mansour2@example.com')).toBe(true)
```

- [ ] **Step 2:** Run `bun test shared/utils/identity.test.ts`. Expected: FAIL, `demoEmail` not exported.
- [ ] **Step 3:** Implement both helpers.
- [ ] **Step 4:** Wire the seed. In `learners.ts` and `trainers.ts`, share one `used` set so trainer and learner addresses never collide. Build trainers first, because `learners.ts` already imports `TRAINERS`. Seed `used` with `admin@example.com`.
- [ ] **Step 5: Update seed tests** in `seed.test.ts`:
  - The test at line 236 becomes "L0001–L0005 have the documented identities and name-based emails". Expect `maha.alnouri@`, `omar.alsafi@`, `leila.rahman@`, `daniel.costa@`, `sara.mansour@` (all `@example.com`).
  - Add: `new Set(db.users.map((u) => u.email)).size === db.users.length`.
  - Add: every email matches `/^[a-z]+\.[a-z]+\d*@example\.com$/`, except `admin@example.com`.
  - Line 64: count `maha.alnouri@example.com`.
- [ ] **Step 6:** Swap old addresses in the other listed tests: `learner0001@` becomes `maha.alnouri@`, `trainer01@` becomes the T01 slug (Amal Al Nouri: `amal.alnouri@example.com`). `registration.test.ts:90` keeps asserting 409 ACCOUNT_EXISTS, now with `maha.alnouri@example.com`.
- [ ] **Step 7:** Run `bun run typecheck && bun run test`. Expected: all pass.
- [ ] **Step 8:** Add row 6 to the table in `docs/DEVIATIONS.md`. Brief says: "§15/§16: `learner0001@example.com`… and `trainer01@example.com`…". What we did: "Every seeded learner and trainer uses `firstname.lastname@example.com` (Maha: `maha.alnouri@example.com`). Codes L0001/T01 are unchanged." Why: "The customer sees the address on the sign-in page and in the profile menu. A name-based address is believable; `learner0001` is not."
- [ ] **Step 9: Commit**

```bash
git add shared/utils client/src/mocks/seed client/src/services/__tests__ shared/permissions.test.ts client/src/features docs/DEVIATIONS.md
git commit -m "feat(seed): name-based example.com emails for every learner and trainer"
```

---

### Task 2: Seed Noor Haddad, a learner who starts at the profile wizard

**Files:**
- Modify: `client/src/mocks/seed/personas.ts` (add persona, add `fresh?: true` to `PersonaSeed`, export `NOOR_N = 6`)
- Modify: `client/src/mocks/seed/plan.ts:116` (`PERSONA_AGE` add `6: 0`) and the age loop (fresh persona sets `learner.profileComplete = false`)
- Modify: `client/src/mocks/seed/learners.ts` (`LearnerSeed` gains `fresh: boolean`)
- Modify: `client/src/mocks/seed/accounts.ts:80-120` (`buildProfiles`: fresh profile is blank)
- Modify: `client/src/mocks/db.ts:33` (`DB_VERSION = 4`)
- Modify: `docs/WALKTHROUGH.md:63-64` (the live-registration example name becomes "Fatima Hassan", so it does not clash with seeded Noor)
- Test: `client/src/services/__tests__/seed.test.ts`, `client/src/services/__tests__/demo.test.ts`

**Interfaces:**
- Produces: `NOOR_N = 6`; user id `user-l0006`; code `L0006`; email `noor.haddad@example.com` (from Task 1).
- Persona values: fullName `Noor Haddad`, organisation `Demo Coastal Travel`, orgType `travel_trade` (both only for pool accounting; the profile shows none), jobTitle `Travel Consultant`, seniority `entry_level`, experience `1_3`, language `English`, goals `[]`, weeklyMinutes `30`, Qatar / Doha, `enrolments: [{ programme: 'B', stage: 'not_started' }]`, `fresh: true`, note `Fresh learner: starts at the profile wizard`.

- [ ] **Step 1: Write failing tests** in `seed.test.ts`:

```ts
test('Noor (L0006) starts fresh: blank draft profile, Program B not started', () => {
  const noor = profileOf('L0006')
  expect(noor).toMatchObject({
    fullName: 'Noor Haddad', status: 'draft', wizardStep: 1, completeness: 0,
    organisationId: null, jobTitle: null, goals: [], consentAcceptedAt: null,
  })
  const user = db.users.find((u) => u.id === noor?.userId)
  expect(user?.email).toBe('noor.haddad@example.com')
  const enrolments = db.enrolments.filter((e) => e.learnerId === noor?.userId)
  expect(enrolments.map((e) => [programmeCodeOf(e), e.status])).toEqual([['B', 'not_started']])
  // No baseline, units, practice, sessions or notifications yet.
})
```

Use the file's existing helpers for programme lookup and for attempts. Assert zero assessment attempts, unit progress, role-play attempts, bookings and notifications for `user-l0006`.

- [ ] **Step 2:** In `demo.test.ts`, add: sign in as Noor, call `saveDraft({ wizardStep: 2, … })` from `profiles.service.ts:141` with valid step 1 values, then sign in as admin and call `resetDemoData()` (`demo.service.ts:30`). Expect Noor's profile back at `wizardStep: 1`, `status: 'draft'`. Also expect `DB_VERSION === 4`.
- [ ] **Step 3:** Run `bun test client/src/services/__tests__/seed.test.ts client/src/services/__tests__/demo.test.ts`. Expected: FAIL.
- [ ] **Step 4:** Implement. For a fresh learner, `buildProfiles` returns `organisationId: null`, `jobTitle/jobFunction/seniority/experience/country/city/preferredLanguage/captionsPreference/accessibilityRequest/weeklyMinutes: null`, `goals: []`, `wizardStep: 1`, `completeness: 0`, `status: 'draft'`, `consentAcceptedAt: null`, `marketingOptIn: false`. This matches what `register()` writes in `registration.service.ts:114`. Check `activity.ts`: a `not_started` B enrolment already makes no attempts. If notifications or audit events are generated per learner, skip `fresh` learners.
- [ ] **Step 5:** Run `bun run test`. Expected: pass. The §15 grid counts stay exact, because Noor takes one `B not_started` from the 90. If an org-type or completeness report test changes by one, check that the new value is correct and update it. Do not loosen it.
- [ ] **Step 6: Commit**

```bash
git add client/src/mocks client/src/services/__tests__ docs/WALKTHROUGH.md
git commit -m "feat(seed): Noor Haddad, a fresh learner who starts at the profile wizard"
```

---

### Task 3: One shared demo-learner list for sign-in and the facilitator toolbar

**Files:**
- Create: `shared/constants/demo-accounts.ts`
- Modify: `shared/constants/index.ts` (re-export)
- Modify: `shared/schemas/profile-account.ts:41-59` (`FACILITATOR_TARGETS` add `'persona-6'`, `'persona-42'`)
- Modify: `client/src/services/auth/facilitator.ts:16-42` (derive learner emails and purposes from the list)
- Test: `client/src/services/__tests__/seed.test.ts` (each listed email exists), `client/src/services/__tests__/auth.test.ts` (facilitator targets)

**Interfaces:**
- Produces:

```ts
export type DemoLearner = {
  key: 'persona-6' | 'persona-1' | 'persona-2' | 'persona-3' | 'persona-4' | 'persona-5' | 'persona-42'
  name: string
  email: string
  /** auth.json key under demo.learners.<key>.purpose */
  purposeKey: string
}
export const DEMO_LEARNERS: readonly DemoLearner[]
```

Order: Noor (`persona-6`) first, then Maha, Omar, Leila, Daniel, Sara, Mariam (`persona-42`). Each email is the Task 1 slug, written as a literal.
- `TARGET_EMAILS` in `facilitator.ts` builds its learner entries from `DEMO_LEARNERS`. Trainer emails use `TRAINERS` from the seed, not literals. `PERSONA_PURPOSE` gains Noor ("Fresh learner: profile wizard, then Program B baseline") and Mariam ("A and B unified record, CRM-0042").

- [ ] **Step 1: Write failing tests:**
  - `seed.test.ts`: `for (const l of DEMO_LEARNERS) expect(db.users.find((u) => u.email === l.email)?.name).toBe(l.name)`.
  - `auth.test.ts`: as admin, `getFacilitatorStatus()` learner targets equal the 7 names in `DEMO_LEARNERS` order. Switching to `'persona-6'` signs in `user-l0006`.
- [ ] **Step 2:** Run both. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun run typecheck && bun run test`. Expected: pass.
- [ ] **Step 5: Commit**

```bash
git add shared client/src/services
git commit -m "feat(demo): one demo learner list for sign-in and the facilitator toolbar"
```

---

### Task 4: Sign-in page: Noor first, "More demo learners" for the rest

**Files:**
- Modify: `client/src/features/auth/components/SignInPage.tsx` (the `DEMO_ACCOUNTS` block from Task 0)
- Modify: `client/src/i18n/locales/en/auth.json`, `client/src/i18n/locales/ar/auth.json` (`demo` section)
- Test: `client/src/features/auth/__tests__/sign-in-demo.test.tsx` (create; follow the happy-dom setup in `client/src/features/public-site/__tests__/arabic.test.tsx`)

**Interfaces:**
- Consumes: `DEMO_LEARNERS` (Task 3), `DEMO_PASSWORD`.
- Behaviour:
  - The learner button signs in as `DEMO_LEARNERS[0]` (Noor). Its title is `demo.learner.title` = "Learner: start the journey". It shows her email. `useAfterSignIn` already sends a draft profile to `/onboarding`.
  - Below the three role buttons, a disclosure (`<details>` or the project's Collapsible) titled `demo.more.title` = "More demo learners". It lists `DEMO_LEARNERS.slice(1)` with name, email (`dir="ltr"`) and `t(purposeKey)`. One click signs in through the same `openDemo` path.
  - Trainer button email comes from the T01 slug (`amal.alnouri@example.com`), via the seed's `TRAINERS[0].email` or a constant in `demo-accounts.ts`.
- en purposes (`demo.learners.<key>.purpose`):
  - persona-1: "Program B, baseline 40, service recovery practice"
  - persona-2: "Program A, Level 1 complete, ready to book a session"
  - persona-3: "Programs A and B, separate progress in each"
  - persona-4: "Program A, assignment returned for revision"
  - persona-5: "Program B completed, pre 60 and post 100"
  - persona-42: "Unified record: A and B, upcoming session, expiring credential"
- ar: the same meaning in Arabic, plus `demo.more.title` = "متعلمون تجريبيون آخرون" and `demo.learner.title` = "متعلم: ابدأ الرحلة".

- [ ] **Step 1: Write failing tests:**
  - en: renders `noor.haddad@example.com`. After opening the disclosure, it renders all 6 other emails and the Omar purpose text.
  - ar (`i18n.changeLanguage('ar')`): the disclosure title is "متعلمون تجريبيون آخرون". No rendered text contains `demo.`, which would mean a missing key.
- [ ] **Step 2:** Run `bun test client/src/features/auth/__tests__/sign-in-demo.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement. Reuse the existing button markup for list rows; do not create a new visual style.
- [ ] **Step 4:** Run `bun run typecheck && bun run lint && bun run test`. Expected: pass.
- [ ] **Step 5:** Check it by eye. Run `bun run dev`, sign in with `admin` / `Potential` Basic Auth, then open `/login` at 1440 and 390 px in en and ar. Click Noor: you land on `/onboarding` step 1. Click Omar: you land on `/learner` as Omar Al Safi with `omar.alsafi@example.com` in the profile menu.
- [ ] **Step 6: Commit**

```bash
git add client/src/features/auth client/src/i18n
git commit -m "feat(auth): Noor-first demo sign-in with a list of every demo learner"
```

---

### Task 5: e2e and docs

**Files:**
- Modify: `e2e/support/env.ts:32-37` (`EMAILS`: `maha: 'maha.alnouri@example.com'`, add `noor: 'noor.haddad@example.com'`, add `noor: 'user-l0006'` to `ACCOUNTS`; `trainer(n)` reads the T-slug list)
- Modify: `e2e/10-update-checklist.spec.ts:283,297` (`learner0002@` becomes `omar.alsafi@`)
- Create: `e2e/11-fresh-journey.spec.ts`
- Modify: `README.md:88-96` (demo accounts table), `docs/UPDATE_29OCT_CHECKLIST.md:15,21`, `docs/WALKTHROUGH.md` (open with Noor: sign-in, wizard, Program B welcome, baseline; then the personas as state shortcuts; Reset demo before each run)

- [ ] **Step 1: Write the e2e spec:** on `/login`, click the learner demo button. Expect URL `/onboarding` and the wizard step 1 heading. Complete step 1 to step 3 with valid values. Expect the Program B welcome at `/onboarding/welcome`. Start the baseline, and expect the first baseline question to be visible. Then open `/login` in a fresh context, open "More demo learners", click Omar, and expect `/learner` with "Omar Al Safi".
- [ ] **Step 2:** Run `bun run test:e2e`. Expected: all specs pass, including 01–10 with the new emails.
- [ ] **Step 3:** Update the docs listed above. In the README table: `noor.haddad@example.com` = "Fresh learner L0006, starts at the profile wizard"; `maha.alnouri@example.com` = "Principal persona L0001"; other learners and trainers use `firstname.lastname@example.com` (see Sign in > More demo learners).
- [ ] **Step 4: Commit**

```bash
git add e2e README.md docs
git commit -m "test(e2e): fresh Noor journey and name-based demo emails; docs"
```

---

## After the plan

- Tell Rawzaba in the next update: emails are now name-based (deviation 6), and the walkthrough opens with Noor.
- Push only when Aliya asks.
