import { useState, type FormEvent } from 'react';
import { Building2, Cake, CheckCircle2, Flower2, Heart } from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import {
  Alert,
  Btn,
  Card,
  Field,
  HeroSmall,
  Input,
  LinkBtn,
  Section,
  SectionHeader,
  Textarea,
} from '../components/ui';
import { today, waLink } from '../utils';

const GALLERY = [
  'outsidecater1.jpeg',
  'outsidecater2.jpeg',
  'outsidecater3.jpeg',
  'outsidecater4.jpeg',
  'outsidecater5.jpeg',
  'outsidecater6.jpeg',
  'outsidecater7.jpeg',
];

const SERVICES = [
  { icon: Heart, title: 'Wedding Catering', text: 'Quality meals and professional food service for weddings.' },
  { icon: Cake, title: 'Birthday Catering', text: 'Delicious food packages for birthday celebrations.' },
  {
    icon: Building2,
    title: 'Corporate Events',
    text: 'Food services for meetings, seminars and conferences.',
  },
  {
    icon: Flower2,
    title: 'Funeral Catering',
    text: 'Professional catering for funeral gatherings and family events.',
  },
];

export default function CateringPage() {
  const { settings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
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
      e.currentTarget.reset();
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
        title="Outside Catering Services"
        text="Mayford Foods provides professional catering services for weddings, birthdays, funerals, corporate events and special occasions."
      />

      <Section>
        <SectionHeader
          eyebrow="From Our Events"
          title={
            <>
              Our Catering <span className="text-flame-600">Gallery</span>
            </>
          }
          text="A look at the events we have had the pleasure of feeding."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((img, i) => (
            <Reveal key={img} delay={(i % 3) * 80}>
              <div className="group overflow-hidden rounded-3xl shadow-soft ring-1 ring-stone-900/5">
                <img
                  src={`/assets/images/${img}`}
                  alt="Catering Event"
                  className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <SectionHeader
          eyebrow="See The Difference"
          title={
            <>
              Watch Our Catering <span className="text-flame-600">In Action</span>
            </>
          }
        />
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl shadow-lift ring-1 ring-stone-900/5">
          <video controls className="w-full" width={1000}>
            <source src="/assets/videos/outsidecatervideo1.mp4" type="video/mp4" />
            Your browser does not support video.
          </video>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="For Every Occasion"
          title={
            <>
              Services We <span className="text-flame-600">Offer</span>
            </>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <Card className="h-full p-7 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-flame-500 text-white shadow-glow">
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-tight text-stone-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="tint">
        <SectionHeader
          eyebrow="Let Us Feed Your Event"
          title={
            <>
              Book Our <span className="text-flame-600">Catering Service</span>
            </>
          }
          text="Contact us today for your event catering requirements."
        />
        <div className="mx-auto max-w-2xl">
          <Card className="p-8 md:p-10">
            {saved && (
              <Alert tone="green">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Booking submitted! Our team will contact you to confirm the details.
                </span>
              </Alert>
            )}
            {error && <Alert tone="red">{error}</Alert>}
            <form onSubmit={book}>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Full Name">
                  <Input name="customer_name" placeholder="Full Name" required />
                </Field>
                <Field label="Phone Number">
                  <Input name="phone" placeholder="Phone Number" required />
                </Field>
                <Field label="Event Type">
                  <Input name="event_type" placeholder="e.g. Wedding, Birthday, Corporate Event" required />
                </Field>
                <Field label="Event Date">
                  <Input name="event_date" type="date" defaultValue={today()} required />
                </Field>
              </div>
              <Field label="Number of Guests">
                <Input name="guest_count" type="number" min={1} placeholder="Number of Guests" required />
              </Field>
              <Field label="Additional Details">
                <Textarea name="message" rows={4} placeholder="Tell us about your event..." />
              </Field>
              <Btn type="submit" disabled={busy} className="mt-2 w-full !py-3.5">
                {busy ? 'Submitting…' : 'Submit Booking →'}
              </Btn>
            </form>
          </Card>
          <div className="mt-6 text-center">
            <LinkBtn
              href={waLink(
                settings?.adabraka_phone || '0244143271',
                'Hello Mayford Foods, I would like to book your catering service.'
              )}
              external
              className="!bg-whatsapp hover:!bg-whatsapp-dark"
            >
              Book Catering Now (WhatsApp)
            </LinkBtn>
          </div>
        </div>
      </Section>
    </>
  );
}
