import { useEffect, useState } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
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
    api.get<Settings>('/settings').then(setFetched).catch(() => {});
  }, []);

  const outlets = [
    {
      name: 'Adabraka',
      phone: s?.adabraka_phone || '0249 000 000',
      whatsapp: outletWhatsApp('Adabraka', s),
      address: 'Adabraka Market, Building A, Shop 5, Accra',
      gmaps: 'https://www.google.com/maps/search/?api=1&query=Adabraka+Market+Building+A+Shop+5+Accra+Ghana',
      image: '/assets/images/adabraka.webp',
    },
    {
      name: 'Dzorwulu',
      phone: s?.dzorwulu_phone || '0559 000 000',
      whatsapp: outletWhatsApp('Dzorwulu', s),
      address: 'Dzorwulu Market, Shop 12 & 14, Accra',
      gmaps: 'https://www.google.com/maps/search/?api=1&query=Dzorwulu+Market+Shop+12+14+Accra+Ghana',
      image: '/assets/images/dzorwulu.jpeg',
    },
  ];

  return (
    <Section>
      <div className="mb-4 text-center">
        <Eyebrow>Visit Us In Accra</Eyebrow>
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">Our Outlets</h1>
        <p className="mx-auto mt-3 max-w-xl text-stone-600">
          Two family-run branches serving fresh, hot meals every day.{' '}
          <span className="font-bold text-stone-800">
            <Clock className="h-4 w-4" /> {s?.opening_hours || 'Monday - Sunday 9:00 AM - 9:30 PM'}
          </span>
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {outlets.map((o, i) => (
          <Reveal key={o.name} delay={i * 90}>
            <Card className="group h-full overflow-hidden">
              <div className="relative h-60 overflow-hidden">
                <img
                  src={o.image}
                  alt={`${o.name} branch`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-mayford-700 backdrop-blur">
                  {o.name}
                </span>
              </div>
              <div className="p-7">
                <div className="flex flex-col gap-3 text-sm text-stone-600">
                  <p className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-flame-600" />
                    <span>{o.address}</span>
                  </p>
                  <p className="flex items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-flame-600" />
                    <span className="font-bold text-stone-800">{o.phone}</span>
                  </p>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <LinkBtn
                    href={waLink(o.whatsapp, `Hello Mayford Foods ${o.name}!`)}
                    external
                    className="!bg-whatsapp !py-3 !text-white hover:!bg-whatsapp-dark"
                  >
                    WhatsApp
                  </LinkBtn>
                  <LinkBtn href={`tel:${o.phone}`} className="!py-3">
                    Call
                  </LinkBtn>
                  <LinkBtn href={o.gmaps} external className="!py-3 !bg-stone-900 hover:!bg-stone-700">
                    Directions
                  </LinkBtn>
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
