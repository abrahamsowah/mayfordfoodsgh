import { useState, type FormEvent } from 'react';
import {
  Building2,
  Cake,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Flower2,
  Heart,
  MessageCircle,
  Play,
  Sparkles,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  HeroSmall,
  IconTile,
  Input,
  LinkBtn,
  Section,
  SectionHeader,
  Select,
  Sheet,
  Textarea,
} from '../components/ui';
import { today, waLink } from '../utils';

const GALLERY = [
  { file: 'outsidecater1.jpeg', caption: 'Wedding reception, Accra' },
  { file: 'outsidecater2.jpeg', caption: 'Corporate lunch service' },
  { file: 'outsidecater3.jpeg', caption: 'Buffet setup' },
  { file: 'outsidecater4.jpeg', caption: 'Outdoor event catering' },
  { file: 'outsidecater5.jpeg', caption: 'Family celebration' },
  { file: 'outsidecater6.jpeg', caption: 'Traditional dishes station' },
  { file: 'outsidecater7.jpeg', caption: 'Dessert & drinks table' },
];

const OCCASIONS = [
  {
    icon: Heart,
    title: 'Weddings',
    text: 'Elegant menus and professional service so you can enjoy your day.',
    points: ['Tasting sessions', 'Wait staff & setup', 'Custom menus'],
  },
  {
    icon: Cake,
    title: 'Birthdays',
    text: 'From intimate family dinners to big celebrations.',
    points: ['Flexible guest counts', 'Local & continental mix', 'Dessert tables'],
  },
  {
    icon: Building2,
    title: 'Corporate events',
    text: 'Meetings, seminars, launches and staff parties.',
    points: ['On-time delivery', 'Individual packs', 'Invoicing support'],
  },
  {
    icon: Flower2,
    title: 'Funerals & family',
    text: 'Respectful, generous catering for family gatherings.',
    points: ['Same-day service', 'Bulk cooking', 'Traditional dishes'],
  },
];

const STEPS = [
  { icon: ClipboardList, title: 'Tell us the details', text: 'Date, venue, guest count and the kind of food you have in mind.' },
  { icon: ChefHat, title: 'We plan the menu', text: 'You get a clear menu proposal and a quote — adjust until it is right.' },
  { icon: UtensilsCrossed, title: 'We cook and serve', text: 'Our team cooks on site, serves your guests and cleans up after.' },
];

export default function CateringPage() {
  const { settings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<{ file: string; caption: string } | null>(null);

  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api.post('/catering-bookings', {
        customer_name: String(fd.customer_name || ''),
        phone: String(fd.phone || ''),
        event_type: String(fd.event_type || ''),
        event_date: String(fd.event_date || today()),
        guest_count: Number(fd.guest_count || 0),
        message: String(fd.message || ''),
      });
      setSaved(true);
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <HeroSmall
        image="/assets/images/outsidecater1.jpeg"
        badge="Outside catering"
        title="We cater the events people remember"
        text="Weddings, birthdays, corporate functions and family gatherings — cooked on site, served with care, anywhere in Accra."
      />

      {/* Highlights */}
      <Section tone="white">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarDays, title: 'Plan with ease', text: 'Bookings confirmed within one working day' },
            { icon: Users, title: 'Any guest count', text: 'From 20 guests to 1,000+' },
            { icon: ChefHat, title: 'Cooked on site', text: 'Fresh food, hot when it reaches the table' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="flex h-full items-start gap-3.5 rounded-card border border-ink-200 bg-white p-4 shadow-xs">
                <IconTile icon={f.icon} tone="light" size="sm" />
                <div>
                  <p className="text-[14px] font-extrabold tracking-tight text-ink-900">{f.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{f.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Occasions */}
      <Section className="!pt-0">
        <SectionHeader
          eyebrow="For every occasion"
          title="What we cater"
          text="Every event gets a menu built around your guests, your budget and your traditions."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {OCCASIONS.map((o, i) => (
            <Reveal key={o.title} delay={(i % 2) * 80}>
              <Card className="flex h-full flex-col p-5 md:p-6">
                <div className="flex items-center gap-3.5">
                  <IconTile icon={o.icon} tone={i % 2 === 0 ? 'brand' : 'flame'} />
                  <h3 className="text-[16px] font-extrabold tracking-tight text-ink-900">{o.title}</h3>
                </div>
                <p className="mt-3.5 text-[13.5px] leading-relaxed text-ink-500">{o.text}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {o.points.map((p) => (
                    <li key={p}>
                      <Badge tone="neutral" size="sm">
                        {p}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section tone="white">
        <SectionHeader eyebrow="How it works" title="Three steps to a stress-free event" />
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="relative h-full rounded-card border border-ink-200 bg-ink-50/60 p-6">
                <span className="absolute right-5 top-5 text-[2.5rem] font-extrabold leading-none tabular-nums text-ink-200">
                  {i + 1}
                </span>
                <IconTile icon={s.icon} tone="brand" size="lg" />
                <h3 className="mt-4 text-[15.5px] font-extrabold tracking-tight text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Gallery */}
      <Section className="!pt-0">
        <SectionHeader
          eyebrow="Our work"
          title="From events we have catered"
          text="Tap any photo to view it full size."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GALLERY.map((g, i) => (
            <Reveal key={g.file} delay={(i % 4) * 50} className={i === 0 ? 'col-span-2 sm:col-span-2 lg:col-span-2' : ''}>
              <button
                type="button"
                onClick={() => setLightbox(g)}
                className="group relative block h-full w-full overflow-hidden rounded-card border border-ink-200 bg-ink-100"
              >
                <img
                  src={`/assets/images/${g.file}`}
                  alt={g.caption}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition duration-[900ms] group-hover:scale-[1.05]"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 to-transparent p-3 text-left text-[11.5px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                  {g.caption}
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Video */}
      <Section tone="white" className="!pt-0">
        <SectionHeader eyebrow="See it in action" title="A look at our catering service" />
        <Reveal>
          <Card className="mx-auto max-w-3xl overflow-hidden">
            <div className="relative aspect-video bg-ink-950">
              <video
                controls
                preload="metadata"
                playsInline
                poster="/assets/images/outsidecater2.jpeg"
                className="absolute inset-0 h-full w-full object-contain"
              >
                <source src="/assets/videos/outsidecatervideo1.mp4" type="video/mp4" />
                Your browser does not support video.
              </video>
            </div>
            <div className="flex items-center gap-3 border-t border-ink-100 px-4 py-3.5">
              <IconTile icon={Play} tone="dark" size="sm" />
              <div>
                <p className="text-[13.5px] font-extrabold text-ink-900">Inside a Mayford catering day</p>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Accra, Ghana</p>
              </div>
            </div>
          </Card>
        </Reveal>
      </Section>

      {/* Booking */}
      <Section className="!pt-0">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-24">
            <Badge tone="brand" icon={Sparkles}>
              Let's plan it
            </Badge>
            <h2 className="mt-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-ink-900 md:text-[2.1rem]">
              Book our catering service
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
              Send us the basics and our catering lead will come back with a menu proposal and a quote — usually within
              one working day.
            </p>
            <ul className="mt-6 space-y-3 text-[13.5px] font-semibold text-ink-600">
              {['No booking fee to get a quote', 'Menus adapted to your budget', 'We travel anywhere in Greater Accra'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" strokeWidth={2.5} />
                    {t}
                  </li>
                )
              )}
            </ul>
            <div className="mt-7 rounded-card border border-ink-200 bg-white p-5 shadow-xs">
              <p className="text-[13.5px] font-extrabold text-ink-900">Prefer to talk it through?</p>
              <p className="mt-1 text-[13px] text-ink-500">Message us on WhatsApp and we will call you back.</p>
              <LinkBtn
                href={waLink(
                  settings?.adabraka_phone || '0244143271',
                  'Hello Mayford Foods, I would like to book your catering service.'
                )}
                external
                variant="whatsapp"
                size="md"
                icon={MessageCircle}
                full
                className="mt-4"
              >
                Chat about catering
              </LinkBtn>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <Card className="p-5 md:p-7">
              {saved && (
                <Alert tone="green" icon={CheckCircle2}>
                  Booking submitted! Our team will contact you to confirm the details.
                </Alert>
              )}
              {error && <Alert tone="red">{error}</Alert>}
              <form onSubmit={book}>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input name="customer_name" placeholder="e.g. Ama Owusu" required />
                  </Field>
                  <Field label="Phone number">
                    <Input name="phone" inputMode="tel" placeholder="024 000 0000" required />
                  </Field>
                </div>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Field label="Event type">
                    <Select name="event_type" required defaultValue="">
                      <option value="" disabled>
                        Select an event
                      </option>
                      <option>Wedding</option>
                      <option>Birthday</option>
                      <option>Corporate event</option>
                      <option>Funeral / family gathering</option>
                      <option>Other</option>
                    </Select>
                  </Field>
                  <Field label="Event date">
                    <Input name="event_date" type="date" defaultValue={today()} required />
                  </Field>
                </div>
                <Field label="Number of guests">
                  <Input name="guest_count" type="number" min={1} placeholder="e.g. 150" required />
                </Field>
                <Field label="Tell us about your event" hint="Venue, time of day, dishes you have in mind — anything helps.">
                  <Textarea name="message" rows={4} placeholder="We are hosting a wedding at…" />
                </Field>
                <Button type="submit" variant="primary" size="lg" full loading={busy}>
                  {busy ? 'Submitting…' : 'Submit booking request'}
                </Button>
              </form>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* Lightbox */}
      <Sheet
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        title={lightbox?.caption || 'Catering photo'}
        subtitle="Mayford Foods outside catering"
        maxWidth="max-w-4xl"
      >
        {lightbox && (
          <img
            src={`/assets/images/${lightbox.file}`}
            alt={lightbox.caption}
            className="w-full rounded-tile object-contain"
          />
        )}
      </Sheet>
    </>
  );
}
