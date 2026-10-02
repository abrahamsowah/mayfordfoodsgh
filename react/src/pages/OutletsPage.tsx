import { useEffect, useState } from 'react';
import { ArrowUpRight, Bike, Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Card, Eyebrow, LinkBtn, Section } from '../components/ui';
import { Reveal } from '../components/motion';
import type { Settings } from '../types';
import { outletWhatsApp, waLink } from '../utils';

export default function OutletsPage() {
  const [fetched, setFetched] = useState<Settings | null>(null);
  const { settings } = useSettings();
  const s = fetched ?? settings;

  useEffect(() => {
    api
      .get<{ settings: Settings | null }>('/settings')
      .then((d) => setFetched(d.settings))
      .catch(() => {});
  }, []);

  const outlets = [
    {
      name: 'Mayford Locals, Adabraka',
      branch: 'Adabraka',
      phone: s?.adabraka_phone || '0244143271',
      whatsapp: outletWhatsApp('Adabraka', s),
      address: 'Adabraka Market, Building A, Shop 5, Accra',
      gmaps: 'https://www.google.com/maps/search/?api=1&query=Adabraka+Market+Building+A+Shop+5+Accra+Ghana',
      bolt: 'https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/',
      image: '/assets/images/adabraka.webp',
    },
    {
      name: 'Mayford Fast Food, Dzorwulu',
      branch: 'Dzorwulu',
      phone: s?.dzorwulu_phone || '0533634378',
      whatsapp: outletWhatsApp('Dzorwulu', s),
      address: 'Dzorwulu Market, Shop 12 & 14, Accra',
      gmaps: 'https://www.google.com/maps/search/?api=1&query=Dzorwulu+Market+Shop+12+14+Accra+Ghana',
      bolt: 'https://food.bolt.eu/en/137-accra/p/13426-mayford-fast-food-dzorwulu/',
      image: '/assets/images/dzorwulu.jpeg',
    },
  ];

  return (
    <>
      <section className="border-b border-neutral-200 bg-[#F7F7F7] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <Eyebrow>Accra Locations</Eyebrow>
              <h1 className="text-3xl font-bold tracking-[-0.025em] text-[#111111] sm:text-4xl md:text-5xl">
                Our Kitchen Outlets
              </h1>
              <p className="mt-3 text-base leading-relaxed text-[#6B6B6B]">
                Two family-operated branches in Accra serving fresh Ghanaian and continental meals for dine-in, pickup, and delivery.
              </p>
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#111111]">
              <Clock className="h-4 w-4 text-mayford-600" />
              <span>{s?.opening_hours || 'Monday - Sunday, 9:00 AM - 9:30 PM'}</span>
            </div>
          </div>
        </div>
      </section>

      <Section tone="white">
        <div className="grid gap-8 md:grid-cols-2">
          {outlets.map((o, i) => (
            <Reveal key={o.name} delay={i * 80}>
              <Card className="group flex h-full flex-col">
                <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100">
                  <img
                    src={o.image}
                    alt={o.name}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-4 rounded-sm bg-[#111111] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                    {o.branch}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-[#111111] sm:text-2xl">{o.name}</h2>

                    <div className="mt-5 space-y-3 border-t border-neutral-100 pt-5 text-sm text-[#6B6B6B]">
                      <p className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                        <span>{o.address}</span>
                      </p>
                      <p className="flex items-center gap-3">
                        <Phone className="h-4 w-4 shrink-0 text-[#111111]" />
                        <span className="font-semibold text-[#111111]">{o.phone}</span>
                      </p>
                      <p className="flex items-center gap-3">
                        <Bike className="h-4 w-4 shrink-0 text-[#111111]" />
                        <a
                          href={o.bolt}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#111111] underline underline-offset-4 hover:text-mayford-600"
                        >
                          <span>Available on Bolt Food</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-2.5 border-t border-neutral-100 pt-5">
                    <LinkBtn
                      href={waLink(o.whatsapp, `Hello Mayford Foods ${o.branch}!`)}
                      external
                      variant="dark"
                      className="!px-3 !py-2.5 !text-xs"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-whatsapp" />
                      <span>WhatsApp</span>
                    </LinkBtn>
                    <LinkBtn
                      href={`tel:${o.phone}`}
                      variant="outline"
                      className="!px-3 !py-2.5 !text-xs"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call</span>
                    </LinkBtn>
                    <LinkBtn
                      href={o.gmaps}
                      external
                      variant="outline"
                      className="!px-3 !py-2.5 !text-xs"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Directions</span>
                    </LinkBtn>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
