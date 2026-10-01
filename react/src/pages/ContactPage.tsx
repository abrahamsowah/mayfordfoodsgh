import {
  ArrowRight,
  Bike,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Navigation,
  Phone,
  Store,
  Users,
} from 'lucide-react';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import {
  Badge,
  Card,
  FacebookIcon,
  HeroSmall,
  IconTile,
  LinkBtn,
  Section,
  SectionHeader,
} from '../components/ui';
import { waLink } from '../utils';

export default function ContactPage() {
  const { settings } = useSettings();
  const adabraka = settings?.adabraka_phone || '0244143271';
  const dzorwulu = settings?.dzorwulu_phone || '0533634378';
  const email = settings?.email || 'mayfordfoods@gmail.com';
  const hours = settings?.opening_hours || 'Monday – Sunday, 9:00 AM – 9:30 PM';

  return (
    <>
      <HeroSmall
        image="/assets/images/outsidecater3.jpeg"
        badge="We reply fast"
        title="Talk to Mayford Foods"
        text="WhatsApp, phone or email — our team is on hand every day from 9:00 AM to 9:30 PM."
      />

      {/* Channels */}
      <Section tone="white">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: MessageCircle,
              tone: 'success' as const,
              title: 'WhatsApp',
              text: 'Fastest way to order or ask a question.',
              action: (
                <LinkBtn href={waLink(adabraka, 'Hello Mayford Foods!')} external variant="whatsapp" size="md" icon={MessageCircle}>
                  Chat with us
                </LinkBtn>
              ),
            },
            {
              icon: Phone,
              tone: 'brand' as const,
              title: 'Call a branch',
              text: 'Speak to the kitchen that will cook your order.',
              action: (
                <div className="flex flex-col gap-2">
                  <LinkBtn href={`tel:${adabraka}`} variant="dark" size="md" icon={Phone}>
                    Adabraka · {adabraka}
                  </LinkBtn>
                  <LinkBtn href={`tel:${dzorwulu}`} variant="outline" size="md" icon={Phone}>
                    Dzorwulu · {dzorwulu}
                  </LinkBtn>
                </div>
              ),
            },
            {
              icon: Mail,
              tone: 'flame' as const,
              title: 'Email',
              text: 'Best for catering briefs, invoices and partnerships.',
              action: (
                <LinkBtn href={`mailto:${email}`} variant="outline" size="md" icon={Mail}>
                  {email}
                </LinkBtn>
              ),
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <Card className="flex h-full flex-col p-6">
                <IconTile icon={c.icon} tone={c.tone} size="lg" />
                <h3 className="mt-4 text-[16px] font-extrabold tracking-tight text-ink-900">{c.title}</h3>
                <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-500">{c.text}</p>
                <div className="mt-5">{c.action}</div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Outlets */}
      <Section className="!pt-0">
        <SectionHeader
          eyebrow="Visit us"
          title="Our two Accra branches"
          text="Both kitchens are open every day. Walk in, call ahead for pickup, or order for delivery."
          action={
            <LinkBtn href="/outlets" variant="outline" size="md" iconRight={ArrowRight}>
              Outlet details
            </LinkBtn>
          }
        />
        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              name: 'Mayford Locals',
              area: 'Adabraka',
              address: 'Adabraka Market, Building A, Shop 5, Accra',
              phone: adabraka,
              map: 'https://www.google.com/maps/search/?api=1&query=Adabraka+Market+Building+A+Shop+5+Accra+Ghana',
            },
            {
              name: 'Mayford Fast Food',
              area: 'Dzorwulu',
              address: 'Dzorwulu Market, Shop 12 & 14, Accra',
              phone: dzorwulu,
              map: 'https://www.google.com/maps/search/?api=1&query=Dzorwulu+Market+Shop+12+14+Accra+Ghana',
            },
          ].map((o, i) => (
            <Reveal key={o.area} delay={i * 80}>
              <Card className="h-full p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <IconTile icon={Store} tone="light" />
                    <div>
                      <h3 className="text-[15.5px] font-extrabold tracking-tight text-ink-900">{o.name}</h3>
                      <Badge tone="brand" size="sm" className="mt-1">
                        {o.area}
                      </Badge>
                    </div>
                  </div>
                  <Badge tone="success" size="sm">
                    <span className="mr-1 h-1.5 w-1.5 rounded-full bg-success-500" /> Open
                  </Badge>
                </div>
                <dl className="mt-5 space-y-3 text-[13.5px]">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
                    <dd className="text-ink-600">{o.address}</dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
                    <dd className="text-ink-600">{hours}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <LinkBtn href={o.map} external variant="dark" size="sm" icon={Navigation}>
                    Directions
                  </LinkBtn>
                  <LinkBtn href={waLink(o.phone)} external variant="whatsapp" size="sm" icon={MessageCircle}>
                    WhatsApp
                  </LinkBtn>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Social + delivery */}
      <Section tone="white" className="!pt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal>
            <Card className="flex h-full flex-col p-6 md:p-7">
              <IconTile icon={Users} tone="brand" size="lg" />
              <h3 className="mt-4 text-[17px] font-extrabold tracking-tight text-ink-900">Follow the kitchen</h3>
              <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-500">
                Daily specials, behind-the-scenes clips and event highlights.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <LinkBtn href={settings?.facebook_link || 'https://www.facebook.com/'} external variant="dark" size="md">
                  <FacebookIcon className="h-[18px] w-[18px]" />
                  Facebook
                </LinkBtn>
                <LinkBtn href={settings?.tiktok_link || 'https://www.tiktok.com/'} external variant="outline" size="md" icon={Music}>
                  TikTok
                </LinkBtn>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <Card className="flex h-full flex-col p-6 md:p-7">
              <IconTile icon={Bike} tone="flame" size="lg" />
              <h3 className="mt-4 text-[17px] font-extrabold tracking-tight text-ink-900">Order for delivery</h3>
              <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-ink-500">
                Both branches deliver across Accra through Bolt Food.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <LinkBtn
                  href="https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/"
                  external
                  variant="accent"
                  size="md"
                >
                  Adabraka
                </LinkBtn>
                <LinkBtn
                  href="https://food.bolt.eu/en/137-accra/p/13426-mayford-fast-food-dzorwulu/"
                  external
                  variant="outline"
                  size="md"
                >
                  Dzorwulu
                </LinkBtn>
              </div>
            </Card>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
