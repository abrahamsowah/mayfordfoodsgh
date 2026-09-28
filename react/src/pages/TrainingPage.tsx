import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  BellRing,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  GraduationCap,
  Handshake,
  Hotel,
  Lightbulb,
  Megaphone,
  Rocket,
  Store,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { CountUp, Reveal } from '../components/motion';
import { Alert, Btn, Card, Eyebrow, Input, LinkBtn, Section, Select, Textarea } from '../components/ui';

function Details({ title, items }: { title: string; items: string[] }) {
  return (
    <details className="group rounded-2xl border border-stone-200 bg-stone-50/60 p-4 transition open:border-flame-500/40 open:bg-white open:shadow-soft">
      <summary className="cursor-pointer list-none font-bold text-mayford-700 group-open:mb-3">
        {title}
      </summary>
      <ul className="list-inside list-disc text-sm text-stone-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </details>
  );
}

function SchoolCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Card className="h-full p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mayford-600 text-white shadow-glow">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-extrabold leading-tight tracking-tight text-stone-900">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

const PATHWAYS = [
  {
    icon: CalendarDays,
    title: 'Short Professional Courses',
    duration: ['2 Weeks', '4 Weeks', '6 Weeks'],
    audience: ['Working Professionals', 'Entrepreneurs', 'Business Owners'],
  },
  {
    icon: GraduationCap,
    title: 'Certificate Programmes',
    duration: ['3 Months', '6 Months'],
    audience: ['School Leavers', 'New Hospitality Entrants', 'Career Changers'],
  },
  {
    icon: Briefcase,
    title: 'Executive Masterclasses',
    duration: ['1 Day', '2 Days'],
    audience: ['Restaurant Owners', 'Managers', 'Caterers', 'Hospitality Executives'],
  },
];

const ENTRE_CARD = [
  { icon: Lightbulb, title: 'Business Idea Development' },
  { icon: TrendingUp, title: 'Business Planning' },
  { icon: Wallet, title: 'Financial Management' },
  { icon: Megaphone, title: 'Marketing Strategies' },
  { icon: Store, title: 'Restaurant Startup Guide' },
  { icon: Handshake, title: 'Business Mentorship' },
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
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setError('');
    try {
      await api.post('/training-applications', fd);
      setFormOpen(false);
      setSuccessOpen(true);
      e.currentTarget.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[28rem] items-center justify-center overflow-hidden">
        <img
          src="/assets/images/trainingpic.png"
          alt="Mayford Training Academy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-mayford-900/80 via-mayford-900/55 to-stone-950/85" />
        <div className="relative z-10 px-4 py-20 text-center">
          <p className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-flame-300">
            <span className="h-px w-8 bg-flame-300" />
            Learn The Craft
            <span className="h-px w-8 bg-flame-300" />
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">
            Mayford Training <span className="text-gradient">Academy</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-stone-200 md:text-lg">
            Building Future Hospitality Professionals Through Practical Training.
          </p>
          <div className="mt-8">
            <Btn type="button" onClick={() => setFormOpen(true)} className="!px-8 !py-3.5 !text-base">
              Apply Now →
            </Btn>
          </div>
        </div>
      </section>

      {/* TRAINING SCHOOLS */}
      <Section>
        <div className="mb-12 text-center">
          <Eyebrow>Three Schools, One Career</Eyebrow>
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            Our Training <span className="text-flame-600">Schools</span>
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal>
            <SchoolCard icon={ChefHat} title="School of Culinary Arts">
              <div className="space-y-3">
                <Details title="Basic Culinary Skills" items={['Kitchen Fundamentals', 'Food Preparation', 'Knife Skills', 'Cooking Methods']} />
                <Details
                  title="Professional Chef Training"
                  items={['Menu Planning', 'Food Costing', 'Production Management', 'Commercial Kitchen Operations']}
                />
                <Details title="Baking & Pastry" items={['Bread Making', 'Cakes', 'Desserts', 'Pastries']} />
                <Details
                  title="Traditional Ghanaian Cuisine"
                  items={['Local Dishes', 'Regional Specialties', 'Recipe Standardization']}
                />
              </div>
            </SchoolCard>
          </Reveal>
          <Reveal delay={90}>
            <SchoolCard icon={Building2} title="School of Restaurant Management">
              <div className="space-y-3">
                <Details
                  title="Restaurant Operations"
                  items={['Outlet Management', 'Customer Service', 'Inventory Management', 'Quality Assurance']}
                />
                <Details
                  title="Food Business Management"
                  items={['Business Planning', 'Financial Management', 'Marketing', 'Pricing Strategies']}
                />
                <Details title="Catering Management" items={['Event Catering', 'Corporate Catering', 'Logistics Planning']} />
              </div>
            </SchoolCard>
          </Reveal>
          <Reveal delay={180}>
            <SchoolCard icon={Hotel} title="School of Hospitality Excellence">
              <div className="space-y-3">
                <Details
                  title="Front Office Management"
                  items={['Introduction to Front Office Operations', 'Reservation Systems', 'Guest Relations']}
                />
                <Details
                  title="Customer Experience Management"
                  items={['Customer Care', 'Service Recovery', 'Complaint Handling']}
                />
                <Details
                  title="Service Excellence"
                  items={['Professional Etiquette', 'Communication Skills', 'Personal Branding']}
                />
                <Details
                  title="Hospitality Leadership"
                  items={['Team Leadership', 'Staff Development', 'Performance Management']}
                />
              </div>
            </SchoolCard>
          </Reveal>
        </div>
      </Section>

      {/* PRACTICAL TRAINING HIGHLIGHT */}
      <section className="bg-gradient-to-br from-mayford-700 via-mayford-800 to-mayford-900 py-16 md:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 text-center md:flex-row md:text-left">
          <div className="flex h-48 w-48 shrink-0 flex-col items-center justify-center rounded-full bg-white/10 ring-8 ring-white/15 backdrop-blur">
            <div className="text-5xl font-extrabold text-flame-400">
              <CountUp value={70} suffix="%" />
            </div>
            <p className="text-lg font-bold text-white">Practical</p>
            <small className="text-stone-300">30% Theory</small>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Hands-On Industry Training
            </h2>
            <p className="mt-3 leading-relaxed text-stone-200">
              Learn by doing. Students spend most of their time in real kitchen, restaurant and hospitality
              environments.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
              {[
                { icon: UtensilsCrossed, label: 'Culinary' },
                { icon: Store, label: 'Restaurant' },
                { icon: BellRing, label: 'Hospitality' },
                { icon: Briefcase, label: 'Business' },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center rounded-2xl bg-white/10 px-6 py-3 backdrop-blur">
                  <b.icon className="h-6 w-6 text-flame-400" />
                  <span className="mt-1.5 text-sm font-semibold text-white">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TRAINING PATHWAYS */}
      <Section>
        <div className="mb-12 text-center">
          <Eyebrow>Choose Your Pace</Eyebrow>
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            Training <span className="text-flame-600">Pathways</span>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PATHWAYS.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <Card className="h-full p-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-tight text-stone-900">{p.title}</h3>
                <ul className="mt-3 text-sm font-bold text-mayford-700">
                  {p.duration.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <h4 className="mt-4 text-xs font-extrabold uppercase tracking-widest text-stone-400">
                  Suitable For
                </h4>
                <ul className="mt-2 text-sm text-stone-700">
                  {p.audience.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ENTREPRENEURSHIP TRACK */}
      <section className="bg-stone-950 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center text-white">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-flame-500 text-white shadow-glow">
            <Rocket className="h-8 w-8" />
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Entrepreneurship Track</h2>
          <p className="mx-auto mt-4 max-w-2xl text-stone-300">
            For students who want to start and manage their own food, catering or hospitality businesses.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENTRE_CARD.map((c, i) => (
              <Reveal key={c.title} delay={i * 60}>
                <div className="h-full rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10">
                  <c.icon className="h-6 w-6 text-flame-400" />
                  <h3 className="mt-3 text-sm font-bold">{c.title}</h3>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <Section>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            Start Your Hospitality <span className="text-flame-600">Career Today</span>
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Btn type="button" onClick={() => setFormOpen(true)} className="!px-8 !py-3.5 !text-base">
              Apply Now →
            </Btn>
            <LinkBtn variant="dark" href="/contact">
              Contact Us
            </LinkBtn>
          </div>
        </div>
      </Section>

      {/* APPLICATION FORM POPUP */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-8 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setFormOpen(false)}
              className="absolute right-5 top-4 text-2xl leading-none text-stone-400 transition hover:text-stone-700"
            >
              ×
            </button>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-flame-600">Join The Academy</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">Training Application</h2>
            {error && <Alert tone="red">{error}</Alert>}
            <form onSubmit={submit} className="mt-5">
              <div className="space-y-3">
                <Input name="full_name" placeholder="Full Name" required />
                <Input name="phone" placeholder="Phone Number" required />
                <Input name="email" type="email" placeholder="Email Address" required />
                <Select name="training_school" required defaultValue="">
                  <option value="" disabled>
                    Select Training School
                  </option>
                  <option>School of Culinary Arts</option>
                  <option>School of Restaurant Management</option>
                  <option>School of Hospitality Excellence</option>
                </Select>
                <Input name="program" placeholder="Preferred Program" required />
                <Textarea name="message" rows={3} placeholder="Additional Information" />
              </div>
              <Btn type="submit" disabled={busy} className="mt-4 w-full !py-3.5">
                {busy ? 'Submitting…' : 'Submit Application →'}
              </Btn>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {successOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSuccessOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[2rem] bg-white p-10 text-center shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-9 w-9" />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-mayford-700">Application Submitted!</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Thank you for applying to Mayford Training Academy. Our team will contact you soon.
            </p>
            <button
              type="button"
              onClick={() => setSuccessOpen(false)}
              className="mt-6 rounded-full bg-mayford-700 px-8 py-2.5 text-sm font-bold text-white transition hover:bg-mayford-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
