import { useEffect, useState } from 'react';
import {
  Bike,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import {
  Badge,
  Card,
  Eyebrow,
  HeroSmall,
  IconTile,
  LinkBtn,
  Section,
  SectionTitle,
} from '../components/ui';
import type { Settings } from '../types';
import { outletWhatsApp, waLink } from '../utils';

export default function OutletsPage() {
  const [fetched, setFetched] = useState<Settings | null>(null);
  const { settings } = useSettings();
  const s = fetched ?? settings;

  useEffect(() => {
    api.get<Settings>('/settings').then(setFetched).catch(() => undefined);
  }, []);

  const outlets = [
    {
      name: 'Mayford Locals',
      area: 'Adabraka',
      phone: s?.adabraka_phone || '0244143271',
      address: 'Adabraka Market, Building A, Shop 5, Accra',
      gmaps: 'https://www.google.com/maps/search/?api=1&query=Adabraka+Market+Building+A+Shop+5+Accra+Ghana',
      image: '/assets/images/adabraka.webp',
      note: 'Our original kitchen — quick local plates, soups and rice dishes served all day.',
    },
    {
      name: 'Mayford Fast Food',
      area: 'Dzorwulu',
      phone: s?.dzorwulu_phone || '0533634378',
      address: 'Dzorwulu Market, Shop 12 & 14, Accra',
      gmaps: 'https://www.google.com/maps/search/?api=1&query=Dzorwulu+Market+Shop+12+14+Accra+Ghana',
      image: '/assets/images/dzorwulu.jpeg',
      note: 'Grills, continental favourites and family-size portions for the Dzorwulu crowd.',
    },
  ];

  const hours = s?.opening_hours || 'Monday – Sunday, 9:00 AM – 9:30 PM';

  return (
    <>
      <HeroSmall
        image="/assets/images/adabraka.webp"
        badge="Find us in Accra"
        title="Two kitchens, one standard"
        text="Walk in, order for pickup or have it delivered. Our doors are open every day of the week."
      />

      <Section tone="white">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Clock, title: 'Open 7 days', text: hours },
            { icon: Users, title: 'Family run', text: 'Served by the same team since day one' },
            { icon: Bike, title: 'Delivery', text: 'Bolt Food across Accra' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="flex h-full items-start gap-3.5 rounded-card border border-ink-200 bg-white p-4">
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

      <Section className="!pt-0">
        <div className="space-y-6">
          {outlets.map((o, i) => (
            <Reveal key={o.area} delay={i * 90}>
              <Card className="grid lg:grid-cols-[1.05fr_1fr]">
                <div className="relative h-56 lg:h-full lg:min-h-[22rem]">
                  <img src={o.image} alt={o.name} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <Badge tone="white" className="!h-8 !px-3">
                      <MapPin className="h-3.5 w-3.5 text-mayford-600" strokeWidth={2.6} />
                      {o.area}
                    </Badge>
                    <Badge tone="white" className="!h-8 !px-3">
                      <span className="mr-0.5 h-1.5 w-1.5 rounded-full bg-success-500" /> Open now
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col p-6 md:p-8">
                  <Eyebrow>{o.area} branch</Eyebrow>
                  <SectionTitle className="!text-[1.5rem]">{o.name}</SectionTitle>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-500">{o.note}</p>

                  <dl className="mt-6 space-y-3.5 text-[13.5px]">
                    <div className="flex items-start gap-3">
                      <dt className="sr-only">Address</dt>
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
                      <dd className="text-ink-600">{o.address}</dd>
                    </div>
                    <div className="flex items-start gap-3">
                      <dt className="sr-only">Hours</dt>
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
                      <dd className="text-ink-600">{hours}</dd>
                    </div>
                    <div className="flex items-start gap-3">
                      <dt className="sr-only">Phone</dt>
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
                      <dd className="font-bold text-ink-900">{o.phone}</dd>
                    </div>
                  </dl>

                  <div className="mt-7 flex flex-wrap gap-2.5">
                    <LinkBtn
                      href={waLink(outletWhatsApp(o.area, s), `Hello Mayford Foods ${o.area}!`)}
                      external
                      variant="whatsapp"
                      size="md"
                      icon={MessageCircle}
                    >
                      WhatsApp
                    </LinkBtn>
                    <LinkBtn href={`tel:${o.phone}`} variant="dark" size="md" icon={Phone}>
                      Call
                    </LinkBtn>
                    <LinkBtn href={o.gmaps} external variant="outline" size="md" icon={Navigation}>
                      Directions
                    </LinkBtn>
                  </div>

                  <div className="mt-6 flex items-center gap-3 rounded-tile border border-ink-200 bg-ink-50 px-4 py-3">
                    <Store className="h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.3} />
                    <p className="flex-1 text-[12.5px] font-semibold text-ink-600">
                      Choose this branch at checkout when you want pickup.
                    </p>
                    <LinkBtn href="/menu" variant="ghost" size="sm" icon={ShoppingBag}>
                      Order
                    </LinkBtn>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white" className="!pt-0">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-card border border-ink-200 bg-white p-6 md:flex-row md:items-center md:p-8">
            <div className="flex items-start gap-4">
              <IconTile icon={Bike} tone="flame" size="lg" />
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight text-ink-900">Get it delivered</h2>
                <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-ink-500">
                  Both branches are live on Bolt Food. Order there for doorstep delivery anywhere in Accra.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <LinkBtn
                href="https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/"
                external
                variant="dark"
                size="lg"
              >
                Adabraka on Bolt Food
              </LinkBtn>
              <LinkBtn
                href="https://food.bolt.eu/en/137-accra/p/13426-mayford-fast-food-dzorwulu/"
                external
                variant="outline"
                size="lg"
              >
                Dzorwulu on Bolt Food
              </LinkBtn>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
