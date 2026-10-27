import '../../__tests__/helpers/env'

import { beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { db } from '@server/db/connection'
import { reseed } from '@server/db/seed'
import { sql } from 'drizzle-orm'

/**
 * Seed reconciliation (brief §15–16): every total, the status grid, the persona states, the
 * session rules, and determinism. Runs against qatar_tourism_test (see helpers/env.ts).
 */
setDefaultTimeout(120_000)

const REFERENCE_DATE = '2026-10-27'
const DAY = 86_400_000

async function rows<T extends Record<string, unknown>>(
  query: ReturnType<typeof sql>,
): Promise<T[]> {
  return (await db.execute(query)) as unknown as T[]
}

async function one<T = number>(query: ReturnType<typeof sql>): Promise<T> {
  const [row] = await rows(query)
  return Object.values(row as Record<string, unknown>)[0] as T
}

const TABLES = [
  'user',
  'account',
  'organisations',
  'profiles',
  'programmes',
  'courses',
  'content_packages',
  'learning_paths',
  'path_versions',
  'path_items',
  'assignment_rules',
  'enrolments',
  'unit_progress',
  'assessments',
  'assessment_attempts',
  'assessment_answers',
  'roleplay_attempts',
  'trainer_profiles',
  'trainer_programmes',
  'sessions',
  'session_reschedules',
  'rsvps',
  'attendance',
  'session_scores',
  'assignments',
  'submissions',
  'reviews',
  'certificates',
  'notifications',
  'audit_events',
]

async function fingerprint(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const table of TABLES) {
    out[table] = await one<string>(
      sql.raw(
        `select coalesce(md5(string_agg(t::text, '|' order by t::text)), '') from "${table}" t`,
      ),
    )
  }
  return out
}

let firstRun: Record<string, string>

beforeAll(async () => {
  await reseed({ referenceDate: REFERENCE_DATE })
  firstRun = await fingerprint()
})

describe('learners and enrolments (brief §15)', () => {
  test('1,200 unique learners with the documented emails', async () => {
    expect(await one(sql`select count(*)::int from "user" where role = 'learner'`)).toBe(1200)
    expect(await one(sql`select count(distinct learner_id)::int from enrolments`)).toBe(1200)
    expect(
      await one(
        sql`select count(*)::int from "user" where email ~ '^learner(0[0-9]{3}|1[01][0-9]{2}|1200)@example\\.com$' and role = 'learner'`,
      ),
    ).toBe(1200)
    expect(
      await one(sql`select count(*)::int from "user" where email = 'learner0001@example.com'`),
    ).toBe(1)
    expect(
      await one(sql`select count(*)::int from "user" where email = 'learner1200@example.com'`),
    ).toBe(1)
  })

  test('360 A-only, 600 B-only, 180 C-only and 60 in both A and B', async () => {
    const groups = await rows<{ combo: string; n: number }>(sql`
      select combo, count(*)::int as n from (
        select learner_id, string_agg(p.code::text, '' order by p.code) as combo
        from enrolments e join programmes p on p.id = e.programme_id group by learner_id
      ) t group by combo`)
    const byCombo = Object.fromEntries(groups.map((g) => [g.combo, g.n]))
    expect(byCombo).toEqual({ A: 360, B: 600, C: 180, AB: 60 })
  })

  test('enrolments: A 420, B 660, C 180, total 1,260', async () => {
    const counts = await rows<{ code: string; n: number }>(
      sql`select p.code::text, count(*)::int as n from enrolments e join programmes p on p.id = e.programme_id group by 1`,
    )
    expect(Object.fromEntries(counts.map((c) => [c.code, c.n]))).toEqual({ A: 420, B: 660, C: 180 })
    expect(await one(sql`select count(*)::int from enrolments`)).toBe(1260)
  })

  test('the status grid matches exactly', async () => {
    const grid = await rows<{ code: string; status: string; n: number }>(sql`
      select p.code::text, e.status::text, count(*)::int as n
      from enrolments e join programmes p on p.id = e.programme_id group by 1, 2`)
    const lookup = (code: string, status: string) =>
      grid.find((g) => g.code === code && g.status === status)?.n ?? 0
    const expected = {
      A: { not_started: 60, in_progress: 180, awaiting_review: 60, completed: 120 },
      B: { not_started: 90, in_progress: 240, awaiting_review: 30, completed: 300 },
      C: { not_started: 30, in_progress: 90, awaiting_review: 0, completed: 60 },
    }
    for (const [code, statuses] of Object.entries(expected)) {
      for (const [status, n] of Object.entries(statuses)) {
        expect(lookup(code, status)).toBe(n)
      }
    }
  })

  test('organisation types 420/240/180/120/120/120', async () => {
    const counts = await rows<{ type: string; n: number }>(sql`
      select o.type::text, count(*)::int as n from profiles p
      join organisations o on o.id = p.organisation_id group by 1`)
    const by = Object.fromEntries(counts.map((c) => [c.type, c.n]))
    expect(by.hotel_accommodation).toBe(420)
    expect(by.tour_operator).toBe(240)
    expect(by.transport).toBe(180)
    expect(by.travel_trade).toBe(120)
    expect(by.attraction_venue).toBe(120)
    expect((by.independent ?? 0) + (by.other ?? 0)).toBe(120)
  })

  test('seniority 180/300/420/180/120', async () => {
    const counts = await rows<{ seniority: string; n: number }>(
      sql`select seniority::text, count(*)::int as n from profiles group by 1`,
    )
    const by = Object.fromEntries(counts.map((c) => [c.seniority, c.n]))
    expect(by.student_trainee).toBe(180)
    expect(by.entry_level).toBe(300)
    expect(by.experienced_professional).toBe(420)
    expect(by.supervisor).toBe(180)
    expect((by.manager ?? 0) + (by.senior_leader ?? 0)).toBe(120)
  })

  test('at least 20 fictional "Demo" organisations; learners use them or a labelled pseudo-organisation', async () => {
    expect(
      await one(sql`select count(*)::int from organisations where name like 'Demo %'`),
    ).toBeGreaterThanOrEqual(20)
    expect(
      await one(
        sql`select count(*)::int from profiles p join organisations o on o.id = p.organisation_id where o.name not like 'Demo %' and not o.is_pseudo`,
      ),
    ).toBe(0)
  })

  test('no real contact data: no mobile numbers, every email ends in example.com', async () => {
    expect(await one(sql`select count(*)::int from profiles where mobile is not null`)).toBe(0)
    expect(
      await one(sql`select count(*)::int from "user" where email not like '%@example.com'`),
    ).toBe(0)
  })
})

describe('certificates and assessments', () => {
  test('120 issued A certificates, one per completed A enrolment, none for B or C', async () => {
    expect(await one(sql`select count(*)::int from certificates where status = 'issued'`)).toBe(120)
    expect(
      await one(sql`
        select count(*)::int from certificates c
        join enrolments e on e.id = c.enrolment_id join programmes p on p.id = e.programme_id
        where p.code = 'A' and e.status = 'completed'`),
    ).toBe(120)
    expect(
      await one(
        sql`select count(*)::int from certificates c join programmes p on p.id = c.programme_id where p.code <> 'A'`,
      ),
    ).toBe(0)
    expect(await one(sql`select count(distinct enrolment_id)::int from certificates`)).toBe(120)
    expect(await one(sql`select certification_enabled::int from programmes where code = 'B'`)).toBe(
      0,
    )
  })

  test('completed A and B enrolments have a matched pre/post pair; others have no post', async () => {
    const withPair = await one(sql`
      select count(*)::int from enrolments e join programmes p on p.id = e.programme_id
      where p.code in ('A', 'B') and e.status = 'completed'
        and exists (select 1 from assessment_attempts a join assessments s on s.id = a.assessment_id where a.enrolment_id = e.id and s.kind = 'pre')
        and exists (select 1 from assessment_attempts a join assessments s on s.id = a.assessment_id where a.enrolment_id = e.id and s.kind = 'post')`)
    expect(withPair).toBe(420)
    const strayPost = await one(sql`
      select count(*)::int from assessment_attempts a join assessments s on s.id = a.assessment_id
      join enrolments e on e.id = a.enrolment_id
      where s.kind = 'post' and e.status <> 'completed'`)
    expect(strayPost).toBe(0)
    expect(
      await one(
        sql`select count(*)::int from assessment_attempts a join enrolments e on e.id = a.enrolment_id join programmes p on p.id = e.programme_id where p.code = 'C'`,
      ),
    ).toBe(0)
  })

  test('A completion rules hold: post at least 80, assignment approved at 70+, session passed', async () => {
    expect(
      await one(sql`
        select count(*)::int from assessment_attempts a join assessments s on s.id = a.assessment_id
        where s.kind = 'post' and a.score < 80 and a.enrolment_id in (
          select e.id from enrolments e join programmes p on p.id = e.programme_id where p.code = 'A')`),
    ).toBe(0)
    expect(
      await one(sql`
        select count(*)::int from enrolments e join programmes p on p.id = e.programme_id
        where p.code = 'A' and e.status = 'completed' and not exists (
          select 1 from submissions s join reviews r on r.submission_id = s.id
          where s.enrolment_id = e.id and r.status = 'approved' and r.rubric_score >= 70)`),
    ).toBe(0)
    expect(
      await one(sql`
        select count(*)::int from enrolments e join programmes p on p.id = e.programme_id
        join unit_progress u on u.enrolment_id = e.id join courses c on c.id = u.course_id
        where p.code = 'A' and e.status = 'completed' and c.code = 'C06' and u.status = 'completed'`),
    ).toBe(120)
  })

  test('improvement is positive on average (pre/post pairs)', async () => {
    const gain = await one<number>(sql`
      select avg(po.score - pr.score)::float from assessment_attempts pr
      join assessments sp on sp.id = pr.assessment_id and sp.kind = 'pre'
      join assessment_attempts po on po.enrolment_id = pr.enrolment_id
      join assessments so on so.id = po.assessment_id and so.kind = 'post'`)
    expect(gain).toBeGreaterThan(20)
  })
})

describe('personas (brief §15)', () => {
  const persona = (n: number) =>
    rows<{ full_name: string; email: string }>(
      sql`select p.full_name, u.email from profiles p join "user" u on u.id = p.user_id where p.learner_code = ${`L000${n}`}`,
    )

  test('L0001–L0005 have the documented identities and emails', async () => {
    const names = ['Maha Al Nouri', 'Omar Al Safi', 'Leila Rahman', 'Daniel Costa', 'Sara Mansour']
    for (const [index, name] of names.entries()) {
      const [row] = await persona(index + 1)
      expect(row?.full_name).toBe(name)
      expect(row?.email).toBe(`learner000${index + 1}@example.com`)
    }
  })

  test('Maha: B, baseline 40, Demo Pearl Hospitality, guest relations officer, 4–7 years', async () => {
    const [maha] = await rows<Record<string, unknown>>(sql`
      select p.job_title, p.experience::text, p.weekly_minutes, p.goals, o.name as org, o.type::text as org_type,
        p.seniority::text, p.preferred_language
      from profiles p join organisations o on o.id = p.organisation_id where p.learner_code = 'L0001'`)
    expect(maha).toMatchObject({
      job_title: 'Guest Relations Officer',
      experience: '4_7',
      weekly_minutes: 60,
      org: 'Demo Pearl Hospitality',
      org_type: 'hotel_accommodation',
      seniority: 'experienced_professional',
      preferred_language: 'English',
    })
    expect(maha?.goals).toEqual(['complaint_handling', 'communication'])
    const enrolments = await rows<{ code: string; status: string; path: string }>(sql`
      select p.code::text, e.status::text, lp.code as path from enrolments e
      join programmes p on p.id = e.programme_id join learning_paths lp on lp.id = e.path_id
      where e.learner_id = 'user-l0001'`)
    expect(enrolments).toEqual([{ code: 'B', status: 'in_progress', path: 'B-HOTEL' }])
    const pre = await one(sql`
      select a.score from assessment_attempts a join assessments s on s.id = a.assessment_id
      where a.learner_id = 'user-l0001' and s.kind = 'pre'`)
    expect(pre).toBe(40)
    expect(
      await one(
        sql`select count(*)::int from assessment_attempts a join assessments s on s.id = a.assessment_id where a.learner_id = 'user-l0001' and s.kind = 'post'`,
      ),
    ).toBe(0)
    expect(
      await one(sql`select count(*)::int from roleplay_attempts where learner_id = 'user-l0001'`),
    ).toBe(0)
  })

  test('Omar: A, Level 1 complete, eligible but with no booking', async () => {
    const [e] = await rows<{ status: string; code: string }>(sql`
      select e.status::text, p.code::text from enrolments e join programmes p on p.id = e.programme_id where e.learner_id = 'user-l0002'`)
    expect(e).toEqual({ status: 'in_progress', code: 'A' })
    expect(
      await one(
        sql`select count(*)::int from assessment_attempts a join assessments s on s.id = a.assessment_id where a.learner_id = 'user-l0002' and s.kind = 'formative' and a.score >= 80`,
      ),
    ).toBe(1)
    expect(await one(sql`select count(*)::int from rsvps where learner_id = 'user-l0002'`)).toBe(0)
  })

  test('Leila: A and B with distinct progress', async () => {
    const e = await rows<{ code: string; progress: number }>(sql`
      select p.code::text, e.progress_percent as progress from enrolments e
      join programmes p on p.id = e.programme_id where e.learner_id = 'user-l0003' order by 1`)
    expect(e.map((x) => x.code)).toEqual(['A', 'B'])
    expect(e[0]?.progress).not.toBe(e[1]?.progress)
  })

  test('Daniel: A assignment returned for revision', async () => {
    const [row] = await rows<{ status: string; review: string; version: number }>(sql`
      select s.status::text, r.status::text as review, s.version from submissions s
      join reviews r on r.submission_id = s.id where s.learner_id = 'user-l0004'`)
    expect(row).toEqual({ status: 'returned', review: 'returned', version: 1 })
  })

  test('Sara: B completed, pre 60, post 100, no certificate', async () => {
    const attempts = await rows<{ kind: string; score: number }>(sql`
      select s.kind::text, a.score from assessment_attempts a join assessments s on s.id = a.assessment_id
      where a.learner_id = 'user-l0005' order by a.submitted_at`)
    expect(attempts).toEqual([
      { kind: 'pre', score: 60 },
      { kind: 'post', score: 100 },
    ])
    expect(
      await one<string>(sql`select status::text from enrolments where learner_id = 'user-l0005'`),
    ).toBe('completed')
    expect(
      await one(sql`select count(*)::int from certificates where learner_id = 'user-l0005'`),
    ).toBe(0)
  })
})

describe('trainers and sessions (brief §16)', () => {
  test('ten trainers with the documented emails; T04 is renamed', async () => {
    expect(
      await one(
        sql`select count(*)::int from "user" where role = 'trainer' and email ~ '^trainer(0[1-9]|10)@example\\.com$'`,
      ),
    ).toBe(10)
    expect(await one<string>(sql`select full_name from trainer_profiles where code = 'T04'`)).toBe(
      'Rafael Sousa',
    )
    expect(
      await one(sql`select count(*)::int from trainer_profiles where full_name = 'Daniel Costa'`),
    ).toBe(0)
    const languages = await one<string[]>(
      sql`select languages from trainer_profiles where code = 'T04'`,
    )
    expect(languages).toEqual(['English', 'Portuguese'])
  })

  test('30 sessions, 3 per trainer, 60 minutes, Asia/Qatar', async () => {
    expect(await one(sql`select count(*)::int from sessions`)).toBe(30)
    const perTrainer = await rows<{ n: number }>(
      sql`select count(*)::int as n from sessions group by trainer_id`,
    )
    expect(perTrainer).toHaveLength(10)
    expect(perTrainer.every((r) => r.n === 3)).toBe(true)
    expect(
      await one(
        sql`select count(*)::int from sessions where ends_at - starts_at <> interval '60 minutes'`,
      ),
    ).toBe(0)
    expect(await one(sql`select count(*)::int from sessions where timezone <> 'Asia/Qatar'`)).toBe(
      0,
    )
  })

  test('each trainer has one completed (Day -14..-5), one upcoming (per table) and one later (Day +9..+18) session', async () => {
    const reference = new Date(`${REFERENCE_DATE}T00:00:00+03:00`).getTime()
    const list = await rows<{ code: string; starts_at: Date; status: string }>(
      sql`select s.code, s.starts_at, s.status::text from sessions s order by s.code`,
    )
    for (const session of list) {
      const slot = session.code.at(-1)
      const offset = Math.floor((new Date(session.starts_at).getTime() - reference) / DAY)
      if (slot === '1') expect(offset >= -14 && offset <= -5).toBe(true)
      if (slot === '2') expect(offset >= 2 && offset <= 6).toBe(true)
      if (slot === '3') expect(offset >= 9 && offset <= 18).toBe(true)
    }
    // Table spot checks (brief §16): T01 Day +2 09:00, T10 Day +6 13:00, Qatar time.
    const t01 = list.find((s) => s.code === 'SES-T01-2') as { starts_at: Date }
    expect(new Date(t01.starts_at).toISOString()).toBe('2026-10-29T06:00:00.000Z')
    const t10 = list.find((s) => s.code === 'SES-T10-2') as { starts_at: Date }
    expect(new Date(t10.starts_at).toISOString()).toBe('2026-11-02T10:00:00.000Z')
  })

  test('upcoming session capacities and venues follow the table', async () => {
    const expected: Record<string, [number, string]> = {
      'SES-T01-2': [24, 'in_person'],
      'SES-T02-2': [30, 'online'],
      'SES-T03-2': [20, 'in_person'],
      'SES-T04-2': [30, 'online'],
      'SES-T05-2': [24, 'in_person'],
      'SES-T06-2': [40, 'online'],
      'SES-T07-2': [20, 'in_person'],
      'SES-T08-2': [35, 'online'],
      'SES-T09-2': [30, 'online'],
      'SES-T10-2': [24, 'in_person'],
    }
    const list = await rows<{ code: string; capacity: number; format: string }>(
      sql`select code, capacity, format::text from sessions where code like '%-2'`,
    )
    for (const row of list)
      expect([row.capacity, row.format]).toEqual(expected[row.code] as [number, string])
    expect(await one<string>(sql`select room from sessions where code = 'SES-T01-2'`)).toBe(
      'Room 1',
    )
    expect(await one<string>(sql`select venue from sessions where code = 'SES-T07-2'`)).toBe(
      'Demo Training Studio',
    )
  })

  test('includes a full session, a waitlist, a cancelled historical session and a rescheduled one', async () => {
    expect(await one(sql`select count(*)::int from sessions where status = 'full'`)).toBe(1)
    expect(
      await one(sql`select count(*)::int from rsvps where status = 'waitlisted'`),
    ).toBeGreaterThan(0)
    expect(
      await one(
        sql`select count(*)::int from sessions where status = 'cancelled' and starts_at < now()`,
      ),
    ).toBe(1)
    expect(await one(sql`select count(*)::int from session_reschedules`)).toBe(1)
    expect(await one(sql`select affected_rsvps from session_reschedules`)).toBe(18)
  })

  test('capacity is never exceeded and the full session is exactly full', async () => {
    const over = await one(sql`
      select count(*)::int from sessions s where s.capacity < (select count(*) from rsvps r where r.session_id = s.id and r.status = 'confirmed')`)
    expect(over).toBe(0)
    const full = await one<boolean>(sql`
      select (select count(*) from rsvps r where r.session_id = s.id and r.status = 'confirmed') = s.capacity from sessions s where s.status = 'full'`)
    expect(full).toBe(true)
    // Waitlists exist only on full sessions.
    expect(
      await one(
        sql`select count(*)::int from rsvps r join sessions s on s.id = r.session_id where r.status = 'waitlisted' and s.status <> 'full'`,
      ),
    ).toBe(0)
  })

  test('no trainer overlap', async () => {
    expect(
      await one(sql`
        select count(*)::int from sessions a join sessions b
          on a.trainer_id = b.trainer_id and a.id < b.id and a.starts_at < b.ends_at and b.starts_at < a.ends_at`),
    ).toBe(0)
  })

  test('no learner holds two overlapping active reservations', async () => {
    expect(
      await one(sql`
        select count(*)::int from rsvps ra join sessions sa on sa.id = ra.session_id
        join rsvps rb on rb.learner_id = ra.learner_id and rb.id < ra.id
        join sessions sb on sb.id = rb.session_id
        where ra.status in ('confirmed', 'waitlisted') and rb.status in ('confirmed', 'waitlisted')
          and sa.starts_at < sb.ends_at and sb.starts_at < sa.ends_at`),
    ).toBe(0)
  })

  test('RSVPs come from eligible learners (A sessions need Level 1 complete); optional sessions are not gates', async () => {
    expect(
      await one(sql`
        select count(*)::int from rsvps r join sessions s on s.id = r.session_id
        join programmes p on p.id = s.programme_id
        join enrolments e on e.learner_id = r.learner_id and e.programme_id = s.programme_id
        where p.code = 'A' and r.status in ('confirmed', 'waitlisted') and s.starts_at > now() - interval '1000 days'
          and e.status = 'not_started'`),
    ).toBe(0)
    expect(
      await one(sql`
        select count(*)::int from rsvps r join sessions s on s.id = r.session_id
        join programmes p on p.id = s.programme_id
        where p.code = 'A' and r.status <> 'cancelled' and not exists (
          select 1 from assessment_attempts a join assessments x on x.id = a.assessment_id
          join enrolments e on e.id = a.enrolment_id
          where e.learner_id = r.learner_id and x.kind = 'formative' and a.score >= 80)`),
    ).toBe(0)
    expect(
      await one(
        sql`select count(*)::int from sessions where prerequisite is null and is_completion_gate`,
      ),
    ).toBe(0)
    expect(
      await one(
        sql`select count(*)::int from sessions s join programmes p on p.id = s.programme_id where p.code <> 'A' and s.is_completion_gate`,
      ),
    ).toBe(0)
  })

  test('completed sessions have attendance, scores and feedback; cancelled ones have none', async () => {
    expect(
      await one(sql`
        select count(*)::int from rsvps r join sessions s on s.id = r.session_id
        where s.status = 'completed' and r.status = 'confirmed' and not exists (select 1 from attendance a where a.rsvp_id = r.id)`),
    ).toBe(0)
    expect(
      await one(sql`
        select count(*)::int from attendance a join sessions s on s.id = a.session_id where s.status = 'cancelled'`),
    ).toBe(0)
    expect(
      await one(sql`
        select count(*)::int from attendance a where a.status in ('attended', 'late') and not exists (select 1 from session_scores x where x.rsvp_id = a.rsvp_id and x.feedback is not null)`),
    ).toBe(0)
    // Absence never becomes a pass.
    expect(
      await one(
        sql`select count(*)::int from attendance a join session_scores x on x.rsvp_id = a.rsvp_id where a.status in ('absent', 'excused')`,
      ),
    ).toBe(0)
    // Rubric rows add up and respect their maxima.
    expect(
      await one(
        sql`select count(*)::int from session_scores where total <> preparation + communication + practical + professionalism or preparation > 20 or communication > 30 or practical > 30 or professionalism > 20`,
      ),
    ).toBe(0)
  })

  test('rescheduled session keeps its ID, RSVPs and one notification pair per affected RSVP', async () => {
    const [change] = await rows<{ session_id: string; event_id: string }>(
      sql`select session_id, event_id from session_reschedules`,
    )
    const rsvpCount = await one(
      sql`select count(*)::int from rsvps where session_id = ${change?.session_id as string} and status = 'confirmed'`,
    )
    expect(rsvpCount).toBe(18)
    const notes = await rows<{ channel: string; n: number }>(sql`
      select channel::text, count(*)::int as n from notifications where event_id = ${change?.event_id as string} group by 1`)
    expect(Object.fromEntries(notes.map((n) => [n.channel, n.n]))).toEqual({
      in_app: 18,
      email: 18,
    })
    expect(
      await one(
        sql`select count(*)::int from notifications where channel = 'email' and state <> 'simulated' and kind like 'session_%'`,
      ),
    ).toBe(0)
  })
})

describe('activity window and review cases', () => {
  test('registrations fall within the 90-day window of the reference date', async () => {
    const [range] = await rows<{ min_days: number; max_days: number }>(sql`
      select min(extract(epoch from (${REFERENCE_DATE}::date + interval '8 hours' - registered_at)) / 86400)::float as min_days,
             max(extract(epoch from (${REFERENCE_DATE}::date + interval '8 hours' - registered_at)) / 86400)::float as max_days
      from profiles`)
    expect(range?.min_days).toBeGreaterThanOrEqual(-1)
    expect(range?.max_days).toBeLessThanOrEqual(91)
  })

  test('some learners are inactive for 14+ days; most are active', async () => {
    const inactive = await one(sql`
      select count(*)::int from enrolments where status in ('in_progress') and last_activity_at < (${REFERENCE_DATE}::date + interval '8 hours') - interval '14 days'`)
    expect(inactive).toBeGreaterThan(20)
    const active = await one(sql`
      select count(distinct learner_id)::int from enrolments where last_activity_at >= (${REFERENCE_DATE}::date + interval '8 hours') - interval '30 days'`)
    expect(active).toBeGreaterThan(300)
  })

  test('no timestamp is in the future of the demo "now"', async () => {
    const future = await one(sql`
      select (select count(*) from enrolments where last_activity_at > ${REFERENCE_DATE}::date + interval '8 hours')
           + (select count(*) from submissions where submitted_at > ${REFERENCE_DATE}::date + interval '8 hours')
           + (select count(*) from certificates where issued_at > ${REFERENCE_DATE}::date + interval '8 hours')
           + (select count(*) from assessment_attempts where submitted_at > ${REFERENCE_DATE}::date + interval '8 hours')`)
    expect(Number(future)).toBe(0)
  })

  test('review cases exist: absent learners, failed prerequisite, resubmissions, overdue marking', async () => {
    expect(
      await one(sql`select count(*)::int from attendance where status = 'absent'`),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await one(sql`
        select count(*)::int from enrolments e where e.status = 'in_progress' and exists (
          select 1 from assessment_attempts a join assessments s on s.id = a.assessment_id where a.enrolment_id = e.id and s.kind = 'formative' and a.score < 80)
        and not exists (select 1 from assessment_attempts a join assessments s on s.id = a.assessment_id where a.enrolment_id = e.id and s.kind = 'formative' and a.score >= 80)`),
    ).toBe(15)
    expect(
      await one(
        sql`select count(*)::int from submissions where version = 2 and status = 'submitted'`,
      ),
    ).toBe(15)
    expect(
      await one(
        sql`select count(*)::int from submissions where status in ('submitted', 'under_review') and submitted_at < ${REFERENCE_DATE}::date + interval '8 hours' - interval '5 days'`,
      ),
    ).toBeGreaterThanOrEqual(10)
  })

  test('awaiting-review enrolments all have a pending submission; B has none for certificates', async () => {
    expect(
      await one(sql`
        select count(*)::int from enrolments e where e.status = 'awaiting_review' and not exists (
          select 1 from submissions s where s.enrolment_id = e.id and s.status in ('submitted', 'under_review'))`),
    ).toBe(0)
  })
})

describe('accounts', () => {
  test('an admin, ten trainers and 1,200 learners, all verified and with a credential account', async () => {
    expect(
      await one(
        sql`select count(*)::int from "user" where role = 'admin' and email = 'admin@example.com'`,
      ),
    ).toBe(1)
    expect(await one(sql`select count(*)::int from "user" where email_verified = false`)).toBe(0)
    expect(
      await one(
        sql`select count(*)::int from account where provider_id = 'credential' and password is not null`,
      ),
    ).toBe(1211)
  })
})

describe('seeded activity', () => {
  test('timestamps fall in Qatar working hours', async () => {
    const outside = await one(sql`
      SELECT (SELECT count(*) FROM assessment_attempts
              WHERE EXTRACT(hour FROM submitted_at AT TIME ZONE 'Asia/Qatar') NOT BETWEEN 8 AND 19)
           + (SELECT count(*) FROM certificates
              WHERE EXTRACT(hour FROM issued_at AT TIME ZONE 'Asia/Qatar') NOT BETWEEN 8 AND 19)
           + (SELECT count(*) FROM session_scores
              WHERE EXTRACT(hour FROM finalised_at AT TIME ZONE 'Asia/Qatar') NOT BETWEEN 8 AND 19)`)
    expect(Number(outside)).toBe(0)
  })

  test('two late change requests wait for the admin', async () => {
    expect(
      Number(
        await one(sql`SELECT count(*) FROM audit_events WHERE action = 'rsvp.change_requested'`),
      ),
    ).toBe(2)
  })
})

describe('determinism', () => {
  test('a second reseed produces byte-identical rows in every table', async () => {
    await reseed({ referenceDate: REFERENCE_DATE })
    const secondRun = await fingerprint()
    expect(secondRun).toEqual(firstRun)
  })

  test('a different reference date shifts the dates but not the counts', async () => {
    await reseed({ referenceDate: '2027-02-01' })
    expect(await one(sql`select count(*)::int from enrolments`)).toBe(1260)
    expect(await one(sql`select count(*)::int from certificates`)).toBe(120)
    const first = await one<Date>(sql`select starts_at from sessions where code = 'SES-T01-2'`)
    expect(new Date(first).toISOString()).toBe('2027-02-03T06:00:00.000Z')
    await reseed({ referenceDate: REFERENCE_DATE })
  })
})
