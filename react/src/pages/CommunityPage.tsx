import { useEffect, useState } from 'react';
import { ArrowRight, Heart, Images, MessageCircle, Play, Salad, Users } from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { CountUp, Reveal } from '../components/motion';
import {
  Badge,
  Card,
  EmptyState,
  HeroSmall,
  IconTile,
  LinkBtn,
  Section,
  SectionHeader,
  Skeleton,
} from '../components/ui';
import type { CommunityMedia } from '../types';
import { waLink } from '../utils';

export default function CommunityPage() {
  const [media, setMedia] = useState<CommunityMedia[] | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    api
      .get<{ media: CommunityMedia[] }>('/community-media')
      .then((d) => setMedia(d.media))
      .catch(() => setMedia([]));
  }, []);

  return (
    <>
      <HeroSmall
        image="/assets/images/community1.png"
        badge="Mayford cares"
        title="Giving back to the city that raised us"
        text="Food donations, outreach programmes and everyday acts of kindness across Accra."
      />

      {/* Mission + impact numbers */}
      <Section tone="white">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14">
          <Reveal>
            <Badge tone="brand" icon={Heart}>
              Our mission
            </Badge>
            <h2 className="mt-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-ink-900 md:text-[2.1rem]">
              Food is how we take care of people
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
              Mayford Foods was built on generosity, and that has never changed. Every month we cook for vulnerable
              families, support outreach programmes and open our kitchens to people who need a warm plate.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                { icon: Salad, text: 'Hot meals donated to families in need' },
                { icon: Users, text: 'Outreach days with local community groups' },
                { icon: Heart, text: 'Support for training places and apprenticeships' },
              ].map((li) => (
                <li key={li.text} className="flex items-center gap-3 text-[14.5px] font-semibold text-ink-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-mayford-50 text-mayford-700">
                    <li.icon className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                  {li.text}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <LinkBtn
                href={waLink(settings?.adabraka_phone || '0244143271', 'Hello Mayford Foods, I would like to support your community work.')}
                external
                variant="primary"
                size="lg"
                icon={MessageCircle}
              >
                Partner with us
              </LinkBtn>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 1200, suffix: '+', label: 'Meals donated' },
                { value: 24, suffix: '', label: 'Outreach days' },
                { value: 60, suffix: '+', label: 'Families supported' },
                { value: 3, suffix: '', label: 'Community partners' },
              ].map((s) => (
                <Card key={s.label} className="p-5">
                  <p className="text-[1.75rem] font-extrabold leading-none tabular-nums tracking-tight text-mayford-700">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{s.label}</p>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Gallery */}
      <Section className="!pt-0">
        <SectionHeader
          eyebrow="In the community"
          title="Moments from our outreach work"
          text="Photos and videos from our programmes, shared by the team."
        />

        {media === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-card" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No community moments posted yet"
            text="New photos and videos from our outreach programmes will appear here soon."
            action={
              <LinkBtn href="/contact" variant="outline" size="md">
                Get involved
              </LinkBtn>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 70}>
                <Card interactive className="group h-full">
                  {m.media_type === 'video' ? (
                    <div className="relative aspect-video bg-ink-950">
                      <video controls preload="metadata" playsInline className="absolute inset-0 h-full w-full object-contain">
                        <source src={`/assets/community/${m.file_name}`} type="video/mp4" />
                      </video>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden">
                      <img
                        src={`/assets/community/${m.file_name}`}
                        alt="Community outreach"
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition duration-[900ms] group-hover:scale-[1.05]"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <IconTile
                      icon={m.media_type === 'video' ? Play : Heart}
                      tone={m.media_type === 'video' ? 'dark' : 'light'}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-extrabold text-ink-900">
                        {m.media_type === 'video' ? 'Outreach video' : 'Outreach moment'}
                      </p>
                      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Mayford cares</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      {/* CTA */}
      <Section tone="white" className="!pt-0">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-card border border-ink-200 bg-ink-50/60 p-6 md:flex-row md:items-center md:p-8">
            <div className="flex items-start gap-4">
              <IconTile icon={Heart} tone="brand" size="lg" />
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight text-ink-900">Want to help?</h2>
                <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-ink-500">
                  Whether you want to sponsor meals, volunteer at an outreach day or partner with the academy, we would
                  love to hear from you.
                </p>
              </div>
            </div>
            <div className="flex w-full gap-3 sm:w-auto">
              <LinkBtn href="/contact" variant="dark" size="lg" iconRight={ArrowRight} full>
                Contact the team
              </LinkBtn>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
