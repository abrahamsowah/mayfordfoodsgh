import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  GraduationCap,
  Handshake,
  Hotel,
  Lightbulb,
  Megaphone,
  Rocket,
  Store,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api';
import { CountUp, Reveal } from '../components/motion';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  IconTile,
  Input,
  LinkBtn,
  Section,
  SectionHeader,
  Select,
  Sheet,
  Textarea,
} from '../components/ui';

/* ------------------------------------------------------------------
   Accordion — a proper disclosure component (no native details styling)
------------------------------------------------------------------ */
function Accordion({ items }: { items: { title: string; points: string[] }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-ink-100 overflow-hidden rounded-tile border border-ink-200">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.title} className={isOpen ? 'bg-ink-50/60' : 'bg-white'}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-ink-50"
            >
              <span className="text-[13.5px] font-bold text-ink-800">{it.title}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                strokeWidth={2.4}
              />
            </button>
            {isOpen && (
              <ul className="space-y-1.5 px-4 pb-4">
                {it.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[13px] text-ink-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" strokeWidth={2.6} />
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SchoolCard({
  icon,
  title,
  blurb,
  children,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
  children: ReactNode;
  tone: 'brand' | 'flame' | 'dark';
}) {
  return (
    <Card className="flex h-full flex-col p-5 md:p-6">
      <div className="flex items-center gap-3.5">
        <IconTile icon={icon} tone={tone} />
        <h3 className="text-[15.5px] font-extrabold leading-snug tracking-tight text-ink-900">{title}</h3>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-500">{blurb}</p>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

const PATHWAYS = [
  {
    icon: CalendarDays,
    title: 'Short professional courses',
    duration: ['2 weeks', '4 weeks', '6 weeks'],
    audience: ['Working professionals', 'Entrepreneurs', 'Business owners'],
  },
  {
    icon: GraduationCap,
    title: 'Certificate programmes',
    duration: ['3 months', '6 months'],
    audience: ['School leavers', 'New hospitality entrants', 'Career changers'],
  },
  {
    icon: Briefcase,
    title: 'Executive masterclasses',
    duration: ['1 day', '2 days'],
    audience: ['Restaurant owners', 'Managers', 'Caterers', 'Hospitality executives'],
  },
];

const ENTREPRENEURSHIP = [
  { icon: Lightbulb, title: 'Business idea development' },
  { icon: TrendingUp, title: 'Business planning' },
  { icon: Wallet, title: 'Financial management' },
  { icon: Megaphone, title: 'Marketing strategies' },
  { icon: Store, title: 'Restaurant startup guide' },
  { icon: Handshake, title: 'Business mentorship' },
];

export default function TrainingPage() {
  const [params] = useSearchParams();
  const [formOpen, setFormOpen] = useState(params.get('form') === '1');
  const [successOpen, setSuccessOpen] = useState(params.get('success') === '1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.get('success') === '1') {
      const t = setTimeout(() => setSuccessOpen(false), 8000);
      return () => clearTimeout(t);
    }
  }, [params]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setError('');
    try {
      await api.post('/training-applications', fd);
      setFormOpen(false);
      setSuccessOpen(true);
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950">
        {/* Source image is a printed poster; blur it so our own message leads. */}
        <img
          src="/assets/images/trainingpic.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-ink-950/75" />
        <div className="absolute inset-0 bg-ink-950/60" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.15fr_1fr] lg:px-8">
          <div>
            <Badge tone="dark" icon={GraduationCap} className="!bg-ink-800 !text-white/70">
              Mayford Training Academy
            </Badge>
            <h1 className="mt-5 text-[2.25rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-white md:text-[3rem]">
              Learn hospitality in a real working kitchen
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-200">
              Three schools, one practical approach: 70% of your time is spent cooking, serving and running a live
              restaurant — not sitting in a classroom.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="accent" size="lg" icon={Rocket} onClick={() => setFormOpen(true)}>
                Apply now
              </Button>
              <LinkBtn href="/contact" variant="ghost" size="lg" className="!text-white hover:!bg-ink-800">
                Ask about fees
              </LinkBtn>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 70, suffix: '%', label: 'Practical training' },
              { value: 3, suffix: '', label: 'Training schools' },
              { value: 6, suffix: '', label: 'Career pathways' },
              { value: 100, suffix: '+', label: 'Students trained' },
            ].map((s) => (
              <div key={s.label} className="rounded-card border border-white/10 bg-ink-800 p-4">
                <p className="text-[1.75rem] font-extrabold leading-none tabular-nums text-mayford-600">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-ink-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schools */}
      <Section tone="white">
        <SectionHeader
          eyebrow="Three schools, one career"
          title="Choose your specialisation"
          text="Every school mixes hands-on service with the business skills you need to be paid properly for your craft."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal>
            <SchoolCard icon={ChefHat} tone="brand" title="School of Culinary Arts" blurb="Knife skills, cooking methods, pastry and the Ghanaian classics — taught in a working kitchen.">
              <Accordion
                items={[
                  { title: 'Basic culinary skills', points: ['Kitchen fundamentals', 'Food preparation', 'Knife skills', 'Cooking methods'] },
                  { title: 'Professional chef training', points: ['Menu planning', 'Food costing', 'Production management', 'Commercial kitchen operations'] },
                  { title: 'Baking & pastry', points: ['Bread making', 'Cakes', 'Desserts', 'Pastries'] },
                  { title: 'Traditional Ghanaian cuisine', points: ['Local dishes', 'Regional specialities', 'Recipe standardisation'] },
                ]}
              />
            </SchoolCard>
          </Reveal>
          <Reveal delay={90}>
            <SchoolCard icon={Building2} tone="flame" title="School of Restaurant Management" blurb="Run the front of house as confidently as the back — operations, costing and customer experience.">
              <Accordion
                items={[
                  { title: 'Restaurant operations', points: ['Outlet management', 'Customer service', 'Inventory management', 'Quality assurance'] },
                  { title: 'Food business management', points: ['Business planning', 'Financial management', 'Marketing', 'Pricing strategies'] },
                  { title: 'Catering management', points: ['Event catering', 'Corporate catering', 'Logistics planning'] },
                ]}
              />
            </SchoolCard>
          </Reveal>
          <Reveal delay={180}>
            <SchoolCard icon={Hotel} tone="dark" title="School of Hospitality Excellence" blurb="Front office, guest relations and leadership skills for hotels, lodges and service businesses.">
              <Accordion
                items={[
                  { title: 'Front office management', points: ['Front office operations', 'Reservation systems', 'Guest relations'] },
                  { title: 'Customer experience', points: ['Customer care', 'Service recovery', 'Complaint handling'] },
                  { title: 'Service excellence', points: ['Professional etiquette', 'Communication skills', 'Personal branding'] },
                  { title: 'Hospitality leadership', points: ['Team leadership', 'Staff development', 'Performance management'] },
                ]}
              />
            </SchoolCard>
          </Reveal>
        </div>
      </Section>

      {/* Practical band */}
      <section className="bg-ink-950 py-14 md:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[auto_1fr] lg:px-8">
          <div className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-tile bg-ink-800 ring-1 ring-inset ring-white/20">
            <span className="text-[2.5rem] font-extrabold leading-none tabular-nums text-mayford-600">
              <CountUp value={70} suffix="%" />
            </span>
            <span className="mt-1 text-[13px] font-extrabold uppercase tracking-[0.14em] text-white">Practical</span>
            <span className="text-[11.5px] font-semibold text-ink-300">30% theory</span>
          </div>
          <div>
            <h2 className="text-[1.6rem] font-extrabold leading-tight tracking-tight text-white md:text-[2rem]">
              You learn by doing — from day one
            </h2>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-200">
              Students rotate through our outlets, cater real events and serve real customers under supervision, so
              they graduate with experience employers can trust.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { icon: UtensilsCrossed, label: 'Culinary' },
                { icon: Store, label: 'Restaurant' },
                { icon: BellRing, label: 'Hospitality' },
                { icon: Briefcase, label: 'Business' },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2.5 rounded-tile border border-white/10 bg-ink-800 px-4 py-2.5"
                >
                  <b.icon className="h-4 w-4 text-mayford-600" strokeWidth={2.3} />
                  <span className="text-[13px] font-bold text-white">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pathways */}
      <Section>
        <SectionHeader
          eyebrow="Choose your pace"
          title="Training pathways"
          text="Study around work, school or family — pick the schedule that fits your life."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {PATHWAYS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <Card className="flex h-full flex-col p-6">
                <IconTile icon={p.icon} tone={i === 0 ? 'brand' : i === 1 ? 'flame' : 'dark'} size="lg" />
                <h3 className="mt-4 text-[15.5px] font-extrabold tracking-tight text-ink-900">{p.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.duration.map((d) => (
                    <Badge key={d} tone="brand" size="sm">
                      {d}
                    </Badge>
                  ))}
                </div>
                <p className="mt-5 text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                  Suitable for
                </p>
                <ul className="mt-2 space-y-1.5">
                  {p.audience.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-[13px] text-ink-600">
                      <span className="h-1 w-1 rounded-full bg-ink-300" />
                      {a}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Entrepreneurship */}
      <Section tone="white" className="!pt-0">
        <SectionHeader
          eyebrow="Entrepreneurship track"
          title="Turn your training into your own business"
          text="For students who want to launch a food, catering or hospitality business of their own."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENTREPRENEURSHIP.map((c, i) => (
            <Reveal key={c.title} delay={(i % 3) * 60}>
              <div className="flex h-full items-center gap-3.5 rounded-card border border-ink-200 bg-white p-4 transition hover:">
                <IconTile icon={c.icon} tone="light" size="sm" />
                <p className="text-[13.5px] font-bold text-ink-800">{c.title}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section className="!pt-0">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-card border border-ink-200 bg-ink-950 p-6 md:flex-row md:items-center md:p-8">
            <div className="flex items-start gap-4">
              <IconTile icon={Users} tone="glass" size="lg" />
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight text-white">Ready to start?</h2>
                <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-ink-300">
                  Applications take two minutes. Our admissions team will contact you with dates, fees and the next
                  intake.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Button variant="accent" size="lg" iconRight={ArrowRight} onClick={() => setFormOpen(true)}>
                Apply now
              </Button>
              <LinkBtn href="/contact" variant="ghost" size="lg" className="!text-white hover:!bg-ink-800">
                Contact us
              </LinkBtn>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* Application sheet */}
      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Training application"
        subtitle="Join the Mayford Training Academy"
      >
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={submit}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="full_name" placeholder="e.g. Yaw Mensah" required />
            </Field>
            <Field label="Phone number">
              <Input name="phone" inputMode="tel" placeholder="024 000 0000" required />
            </Field>
          </div>
          <Field label="Email address">
            <Input name="email" type="email" placeholder="you@example.com" required />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Training school">
              <Select name="training_school" required defaultValue="">
                <option value="" disabled>
                  Select a school
                </option>
                <option>School of Culinary Arts</option>
                <option>School of Restaurant Management</option>
                <option>School of Hospitality Excellence</option>
              </Select>
            </Field>
            <Field label="Preferred programme" hint="e.g. 4-week pastry course">
              <Input name="program" placeholder="Preferred programme" required />
            </Field>
          </div>
          <Field label="Anything else?" hint="Tell us about your experience and what you want to achieve.">
            <Textarea name="message" rows={3} placeholder="I would like to…" />
          </Field>
          <Button type="submit" variant="primary" size="lg" full loading={busy}>
            {busy ? 'Submitting…' : 'Submit application'}
          </Button>
        </form>
      </Sheet>

      {/* Success sheet */}
      <Sheet
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Application submitted"
        subtitle="Welcome to the Mayford family"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-success-50 text-success-600">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <p className="text-[14px] leading-relaxed text-ink-600">
            Thank you for applying to the Mayford Training Academy. Our admissions team will contact you shortly with
            intake dates and fees.
          </p>
          <div className="flex items-center justify-center gap-2 rounded-tile bg-ink-50 px-4 py-3 text-[12.5px] font-semibold text-ink-500">
            <BadgeCheck className="h-4 w-4 text-success-600" strokeWidth={2.4} />
            Keep your phone nearby — we usually reply within a day.
          </div>
          <Button variant="dark" size="lg" full onClick={() => setSuccessOpen(false)}>
            Close
          </Button>
        </div>
      </Sheet>
    </>
  );
}
