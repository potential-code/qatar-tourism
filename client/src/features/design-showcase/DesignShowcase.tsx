import { ArrowRight, BookOpen, CalendarDays, GraduationCap, Users } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { ArchFrame, Logo, PhotoPanel, SectionHeading, SwoopReveal } from '@/components/brand'
import { ChartCard, ColumnChart, ProgressRing, StatCard } from '@/components/data'
import { DemoBadge, PageHeader, SimulatedTag } from '@/components/layout'
import { cardHover, LenisProvider, Reveal, Stagger, StaggerItem, spring } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

const PROGRAMMES = [
  {
    code: 'Program A',
    title: 'Tourism Service Professional',
    meta: 'Two levels · Hybrid · Certification track',
    image: '/images/official/museum-family.jpg',
  },
  {
    code: 'Program B',
    title: 'Visitor Service Essentials',
    meta: 'One stage · Self-paced · 60 to 90 minutes',
    image: '/images/official/dhow-boat-min.jpg',
  },
  {
    code: 'Program C',
    title: 'Destination Storytelling',
    meta: 'Additional sample programme',
    image: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
  },
]

const ENROLMENTS = [
  { key: 'a', label: 'Program A', value: 420 },
  { key: 'b', label: 'Program B', value: 660 },
  { key: 'c', label: 'Program C', value: 180 },
]

export function DesignShowcase() {
  return (
    <LenisProvider>
      <div className="min-h-[100dvh] bg-sand">
        <Hero />
        <div className="mx-auto flex max-w-[1400px] flex-col gap-24 px-4 py-20 md:px-8">
          <Palette />
          <ProgrammeCards />
          <Swoop />
          <PortalPieces />
          <Controls />
        </div>
      </div>
    </LenisProvider>
  )
}

function Hero() {
  const reduce = useReducedMotion()
  return (
    <PhotoPanel
      src="/images/official/westbay-skyline-007.jpg"
      alt="Doha West Bay skyline at dusk"
      fade="start"
      priority
      className="min-h-[88dvh]"
    >
      <div className="mx-auto flex min-h-[88dvh] max-w-[1400px] flex-col justify-between px-4 py-8 md:px-8">
        <Logo variant="white" withAcademy className="h-12" />
        <motion.div
          className="flex max-w-2xl flex-col gap-6 pb-12"
          initial={reduce ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-4xl leading-[1.08] font-light text-white md:text-6xl">
            Build the skills to create memorable visitor experiences
          </h1>
          <p className="max-w-xl text-lg text-white/85">
            Explore flexible learning, practise real situations and progress through a journey
            shaped around your role.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">
              Explore programmes <ArrowRight className="rtl:-scale-x-100" />
            </Button>
            <Button size="lg" variant="glass">
              Start your journey
            </Button>
          </div>
        </motion.div>
      </div>
    </PhotoPanel>
  )
}

function Palette() {
  const swatches = [
    ['Teal', 'bg-teal', '#00627B'],
    ['Teal deep', 'bg-teal-deep', '#035367'],
    ['Teal soft', 'bg-teal-soft', '#7FB0BC'],
    ['Maroon', 'bg-maroon', '#7D002A'],
    ['Maroon deep', 'bg-maroon-deep', '#5F0020'],
    ['Sand', 'bg-sand border', '#FAF8F4'],
    ['Ink', 'bg-ink', '#1A1919'],
  ] as const
  return (
    <Reveal className="flex flex-col gap-8">
      <SectionHeading
        title="Brand palette and type"
        description="Taken from qatartourism.com. Spectral stands in for Orchidea Pro; Jost for the VisitQatar sans."
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {swatches.map(([name, cls, hex]) => (
          <div key={name} className="flex flex-col gap-2">
            <div className={`h-20 rounded-xl ${cls}`} />
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{hex}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <p className="font-display text-5xl font-light">Display · Spectral Light</p>
        <p className="font-display text-2xl italic">Learn at your pace. Practise with AI.</p>
        <p className="text-base">
          Body and UI · Jost. Track your progress across every learning journey.
        </p>
      </div>
    </Reveal>
  )
}

function ProgrammeCards() {
  const reduce = useReducedMotion()
  return (
    <section className="flex flex-col gap-10">
      <SectionHeading title="Find your next learning journey" />
      <Stagger className="grid gap-6 md:grid-cols-3">
        {PROGRAMMES.map((p, i) => (
          <StaggerItem key={p.code}>
            <motion.article
              initial="rest"
              whileHover={reduce ? undefined : 'hover'}
              whileTap={reduce ? undefined : 'press'}
              variants={cardHover}
              className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-white"
            >
              {i === 0 ? (
                <ArchFrame className="mx-6 mt-6 aspect-[4/5] overflow-hidden">
                  <img
                    src={p.image}
                    alt=""
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </ArchFrame>
              ) : (
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={p.image}
                    alt=""
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-3 p-6">
                <Badge variant="outline" className="w-fit border-teal/30 text-teal-deep">
                  {p.code}
                </Badge>
                <h3 className="font-display text-2xl font-normal">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.meta}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-teal">
                  View programme{' '}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
                </span>
              </div>
            </motion.article>
          </StaggerItem>
        ))}
      </Stagger>
      <p className="text-sm text-muted-foreground">
        The arch frame is an accent: one per view at most.
      </p>
    </section>
  )
}

function Swoop() {
  return (
    <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
      <SwoopReveal className="aspect-[16/10]">
        <img
          src="/images/official/fuwairit-kite-beach.jpg"
          alt="Kite surfers over turquoise water at Fuwairit beach"
          className="size-full object-cover"
        />
      </SwoopReveal>
      <Reveal className="flex flex-col gap-4">
        <SectionHeading
          title="Practise real situations"
          description="Swoop-in reveal: the image opens from a band in the middle, like the qatartourism.com section imagery."
        />
      </Reveal>
    </section>
  )
}

function PortalPieces() {
  return (
    <section className="flex flex-col gap-8 rounded-2xl border bg-white/60 p-6 md:p-10">
      <PageHeader
        title="Welcome back, Maha"
        description="Next action: Practise responding to a disappointed visitor."
        breadcrumbs={[{ label: 'Learner', to: '/learner' }, { label: 'Overview' }]}
        actions={<Button>Continue learning</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Unique learners" value={1200} icon={Users} onClick={() => undefined} />
        <StatCard label="Enrolments" value={1260} icon={BookOpen} tone="maroon" />
        <StatCard
          label="Upcoming sessions"
          value={10}
          icon={CalendarDays}
          delta={{ value: '+3 this week', direction: 'up' }}
        />
        <StatCard label="A certificates issued" value={120} icon={GraduationCap} tone="neutral" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ChartCard title="Enrolments by programme" description="Seeded demo data">
          <ColumnChart data={ENROLMENTS} label="Enrolments" />
        </ChartCard>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-6">
          <ProgressRing value={64} size={120} strokeWidth={10} label="Program B" />
          <div className="w-full">
            <div className="mb-2 flex justify-between text-sm">
              <span>Baseline 40</span>
              <span className="font-medium text-teal">Post 80</span>
            </div>
            <Progress value={80} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <DemoBadge />
        <SimulatedTag label="Simulated AI practice" />
        <SimulatedTag label="Demo email, not sent" />
      </div>
    </section>
  )
}

function Controls() {
  return (
    <Reveal className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <motion.div whileHover={{ scale: 1.03 }} transition={spring}>
          <Button size="lg">Start Program B</Button>
        </motion.div>
      </div>
      <div className="grid max-w-sm gap-2">
        <Label htmlFor="demo-email">Email</Label>
        <Input id="demo-email" type="email" defaultValue="learner0001@example.com" />
        <p className="text-xs text-muted-foreground">
          Use fictional addresses ending in example.com.
        </p>
      </div>
    </Reveal>
  )
}
