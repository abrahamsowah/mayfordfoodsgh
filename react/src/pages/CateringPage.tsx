import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  Cake,
  CheckCircle2,
  Flower2,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import {
  Alert,
  Btn,
  Card,
  Eyebrow,
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
  {
    icon: Heart,
    title: 'Wedding Receptions',
    text: 'Full-service buffet setups, traditional Ghanaian spreads, and continental dishes for wedding celebrations.',
  },
  {
    icon: Cake,
    title: 'Private Celebrations',
    text: 'Tailored catering packages for birthdays, anniversaries, and private family milestones.',
  },
  {
    icon: Building2,
    title: 'Corporate Functions',
    text: 'Punctual breakfast, lunch, and executive buffet service for meetings, seminars, and conferences.',
  },
  {
    icon: Flower2,
    title: 'Funeral Gatherings',
    text: 'Respectful, well-coordinated food service and guest refreshments for family memorials.',
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
        eyebrow="Event Hospitality"
        title="Outside Catering Services"
        text="End-to-end culinary planning, fresh preparation, and uniformed service for weddings, corporate events, and family gatherings across Accra."
      />

      {/* Services We Offer */}
      <Section tone="white">
        <SectionHeader
          eyebrow="Occasions"
          title="Catering Tailored to Your Event"
          text="We scale seamlessly from intimate executive lunches to multi-hundred-guest receptions."
          action={
            <a
              href="#catering-booking"
              className="inline-flex items-center gap-2 rounded-md bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#262626]"
            >
              <span>Book Catering</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 70}>
              <Card className="h-full p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F7F7F7] border border-neutral-200 text-[#111111]">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-bold tracking-tight text-[#111111]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">{s.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Catering Gallery */}
      <Section tone="default" className="border-y border-neutral-200">
        <SectionHeader
          eyebrow="Event Portfolio"
          title="From Recent Events"
          text="A look at our buffet setups, service team, and event presentations."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((img, i) => (
            <Reveal key={img} delay={(i % 3) * 60}>
              <div className="group aspect-[4/3] overflow-hidden rounded-lg bg-neutral-200">
                <img
                  src={`/assets/images/${img}`}
                  alt="Mayford Catering Event"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Video & Booking Split */}
      <Section id="catering-booking" tone="white">
        <div className="grid items-start gap-12 lg:grid-cols-12">
          {/* Left: Video & Direct Consultation */}
          <div className="lg:col-span-5">
            <Eyebrow>Service in Action</Eyebrow>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#111111] sm:text-3xl">
              Watch Our Catering Team at Work
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
              We coordinate every detail from menu tasting and kitchen prep to chafing dish setup and attentive guest service.
            </p>

            <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-[#111111]">
              <video controls preload="metadata" className="aspect-video w-full object-contain">
                <source src="/assets/videos/outsidecatervideo1.mp4" type="video/mp4" />
                Your browser does not support video.
              </video>
            </div>

            <div className="mt-6 rounded-lg border border-neutral-200 bg-[#F7F7F7] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                Need an Immediate Quote?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#6B6B6B]">
                Speak directly with our catering coordinator on WhatsApp to discuss menus and pricing.
              </p>
              <div className="mt-4">
                <LinkBtn
                  href={waLink(
                    settings?.adabraka_phone || '0244143271',
                    'Hello Mayford Foods, I would like to book your catering service.'
                  )}
                  external
                  variant="dark"
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 text-whatsapp" />
                  <span>Chat With Catering Coordinator</span>
                </LinkBtn>
              </div>
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8 lg:p-10">
              <Eyebrow>Event Inquiry</Eyebrow>
              <h2 className="text-2xl font-bold tracking-tight text-[#111111]">
                Request a Catering Proposal
              </h2>
              <p className="mt-1.5 mb-6 text-sm text-[#6B6B6B]">
                Tell us about your upcoming event and our team will follow up with menu options and pricing.
              </p>

              {saved && (
                <Alert tone="green">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Booking inquiry submitted. Our catering team will contact you shortly.
                  </span>
                </Alert>
              )}
              {error && <Alert tone="red">{error}</Alert>}

              <form onSubmit={book}>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Field label="Full Name">
                    <Input name="customer_name" placeholder="Enter your full name" required />
                  </Field>
                  <Field label="Phone Number">
                    <Input name="phone" placeholder="e.g. 024 000 0000" required />
                  </Field>
                  <Field label="Event Type">
                    <Input name="event_type" placeholder="Wedding, Corporate, Birthday, Funeral..." required />
                  </Field>
                  <Field label="Event Date">
                    <Input name="event_date" type="date" defaultValue={today()} required />
                  </Field>
                </div>
                <Field label="Estimated Guest Count">
                  <Input name="guest_count" type="number" min={1} placeholder="e.g. 150" required />
                </Field>
                <Field label="Additional Details & Menu Preferences">
                  <Textarea
                    name="message"
                    rows={4}
                    placeholder="Venue location, preferred dishes, service hours, or special requests..."
                  />
                </Field>
                <Btn
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full !bg-mayford-600 !py-3 hover:!bg-mayford-700"
                >
                  <span>{busy ? 'Submitting Request...' : 'Submit Catering Request'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Btn>
              </form>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
