import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
} from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import {
  Alert,
  Btn,
  Card,
  Eyebrow,
  FacebookIcon,
  Field,
  Input,
  LinkBtn,
  Section,
  SectionHeader,
  Select,
  Textarea,
} from '../components/ui';
import { waLink } from '../utils';

export default function ContactPage() {
  const { settings } = useSettings();
  const adabraka = settings?.adabraka_phone || '0244143271';
  const dzorwulu = settings?.dzorwulu_phone || '0533634378';
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api.post('/feedback', fd);
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
      <section className="border-b border-neutral-200 bg-[#FAF7F0] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Get in Touch</Eyebrow>
            <h1 className="text-3xl font-bold tracking-[-0.025em] text-[#111111] sm:text-4xl md:text-5xl">
              Contact Mayford Foods
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[#6B6B6B]">
              Reach our Adabraka or Dzorwulu branches directly via phone, WhatsApp, or email for food orders, catering inquiries, and training admissions.
            </p>
          </div>
        </div>
      </section>

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Left: Direct Contact Channels */}
          <div className="space-y-4 lg:col-span-5">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-[#FAF7F0] text-[#111111]">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    Adabraka Branch
                  </p>
                  <h2 className="mt-0.5 text-base font-bold text-[#111111]">Mayford Locals</h2>
                  <p className="mt-1 text-sm font-semibold text-[#111111]">{adabraka}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkBtn href={waLink(adabraka)} external variant="dark" className="!px-3.5 !py-2 !text-xs">
                      <MessageCircle className="h-3.5 w-3.5 text-whatsapp" />
                      <span>WhatsApp</span>
                    </LinkBtn>
                    <LinkBtn href={`tel:${adabraka}`} variant="outline" className="!px-3.5 !py-2 !text-xs">
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call</span>
                    </LinkBtn>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-[#FAF7F0] text-[#111111]">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    Dzorwulu Branch
                  </p>
                  <h2 className="mt-0.5 text-base font-bold text-[#111111]">Mayford Fast Food</h2>
                  <p className="mt-1 text-sm font-semibold text-[#111111]">{dzorwulu}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkBtn href={waLink(dzorwulu)} external variant="dark" className="!px-3.5 !py-2 !text-xs">
                      <MessageCircle className="h-3.5 w-3.5 text-whatsapp" />
                      <span>WhatsApp</span>
                    </LinkBtn>
                    <LinkBtn href={`tel:${dzorwulu}`} variant="outline" className="!px-3.5 !py-2 !text-xs">
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call</span>
                    </LinkBtn>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Email</p>
                    <a
                      href={`mailto:${settings?.email || 'mayfordfoods@gmail.com'}`}
                      className="mt-0.5 block font-semibold text-[#111111] hover:underline"
                    >
                      {settings?.email || 'mayfordfoods@gmail.com'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 border-t border-neutral-100 pt-4">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Opening Hours</p>
                    <p className="mt-0.5 font-semibold text-[#111111]">
                      {settings?.opening_hours || 'Monday - Sunday, 9:00 AM - 9:30 PM'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 border-t border-neutral-100 pt-4">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Locations</p>
                    <p className="mt-0.5 font-semibold text-[#111111]">Adabraka &amp; Dzorwulu, Accra</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Direct Message Form */}
          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8 lg:p-10">
              <Eyebrow>Direct Inquiry</Eyebrow>
              <h2 className="text-2xl font-bold tracking-tight text-[#111111]">Send Us a Message</h2>
              <p className="mt-1.5 mb-6 text-sm text-[#6B6B6B]">
                Have a question, suggestion, or custom inquiry? Fill out the form below and our management team will respond.
              </p>

              {saved && (
                <Alert tone="green">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Message sent. Thank you for reaching out to Mayford Foods.
                  </span>
                </Alert>
              )}
              {error && <Alert tone="red">{error}</Alert>}

              <form onSubmit={sendMessage}>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Field label="Full Name">
                    <Input name="fullname" placeholder="Enter your full name" required />
                  </Field>
                  <Field label="Phone or Email">
                    <Input name="phone" placeholder="Phone number or email address" required />
                  </Field>
                </div>
                <Field label="Subject">
                  <Select name="type" required defaultValue="">
                    <option value="" disabled>
                      Select subject
                    </option>
                    <option value="Food Order Inquiry">Food Order Inquiry</option>
                    <option value="Outside Catering">Outside Catering</option>
                    <option value="Training Academy">Training Academy</option>
                    <option value="Suggestion">Suggestion</option>
                    <option value="Compliment">Compliment</option>
                    <option value="Complaint">Complaint</option>
                  </Select>
                </Field>
                <Field label="Message">
                  <Textarea name="message" rows={4} placeholder="Write your message here..." required />
                </Field>
                <Btn
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full !bg-mayford-600 !py-3 hover:!bg-mayford-700"
                >
                  <span>{busy ? 'Sending Message...' : 'Send Message'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Btn>
              </form>
            </Card>
          </div>
        </div>
      </Section>

      {/* Delivery & Social Channels */}
      <Section tone="default" className="border-t border-neutral-200">
        <SectionHeader
          eyebrow="Channels & Delivery"
          title="Order on Bolt Food & Connect Online"
          text="Find Mayford Foods on Bolt Food for rapid courier delivery or follow our updates on social media."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal>
            <Card className="flex h-full flex-col justify-between p-6">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white">
                  <Bike className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#111111]">Bolt Food · Adabraka</h3>
                <p className="mt-1 text-xs text-[#6B6B6B]">Direct delivery from Mayford Locals, Adabraka.</p>
              </div>
              <div className="mt-5">
                <LinkBtn
                  href="https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/"
                  external
                  variant="outline"
                  className="w-full !text-xs"
                >
                  <span>Order on Bolt Food</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </LinkBtn>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={60}>
            <Card className="flex h-full flex-col justify-between p-6">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white">
                  <Bike className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#111111]">Bolt Food · Dzorwulu</h3>
                <p className="mt-1 text-xs text-[#6B6B6B]">Direct delivery from Mayford Fast Food, Dzorwulu.</p>
              </div>
              <div className="mt-5">
                <LinkBtn
                  href="https://food.bolt.eu/en/137-accra/p/13426-mayford-fast-food-dzorwulu/"
                  external
                  variant="outline"
                  className="w-full !text-xs"
                >
                  <span>Order on Bolt Food</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </LinkBtn>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={120}>
            <Card className="flex h-full flex-col justify-between p-6">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-[#FAF7F0] text-[#111111]">
                  <FacebookIcon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#111111]">Facebook</h3>
                <p className="mt-1 text-xs text-[#6B6B6B]">Follow daily specials, catering highlights, and news.</p>
              </div>
              <div className="mt-5">
                <LinkBtn
                  href={settings?.facebook_link || 'https://www.facebook.com/'}
                  external
                  variant="outline"
                  className="w-full !text-xs"
                >
                  <span>Visit Facebook</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </LinkBtn>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={180}>
            <Card className="flex h-full flex-col justify-between p-6">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-[#FAF7F0] text-[#111111]">
                  <Music2 className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#111111]">TikTok</h3>
                <p className="mt-1 text-xs text-[#6B6B6B]">Watch kitchen clips, events, and student showcases.</p>
              </div>
              <div className="mt-5">
                <LinkBtn
                  href={settings?.tiktok_link || 'https://www.tiktok.com/'}
                  external
                  variant="outline"
                  className="w-full !text-xs"
                >
                  <span>Visit TikTok</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </LinkBtn>
              </div>
            </Card>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
