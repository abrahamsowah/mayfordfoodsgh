import { useEffect, useState } from 'react';
import { HeartHandshake, Users, Utensils } from 'lucide-react';
import { api } from '../api';
import { Reveal } from '../components/motion';
import { Card, Eyebrow, HeroSmall, LinkBtn, MediaCardSkeleton, Section, SectionHeader } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import type { CommunityMedia } from '../types';
import { assetUrl } from '../utils';

export default function CommunityPage() {
  const [media, setMedia] = useState<CommunityMedia[] | null>(null);

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
        eyebrow="Social Responsibility"
        title="Community Impact & Outreach"
        text="Supporting families, sharing freshly cooked meals, and investing in Accra neighbourhoods through regular outreach initiatives."
      />

      <Section tone="white">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Utensils,
              title: 'Food Donations',
              text: 'Sharing freshly prepared, nutritious meals with vulnerable individuals and families across Accra.',
            },
            {
              icon: HeartHandshake,
              title: 'Neighbourhood Outreach',
              text: 'Partnering with community leaders, schools, and local organizations on welfare drives.',
            },
            {
              icon: Users,
              title: 'Youth Empowerment',
              text: 'Providing practical culinary mentorship and hospitality skills to young people.',
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 70}>
              <Card className="h-full p-6 sm:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-[#F7F7F7] text-[#111111]">
                  <item.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-lg font-bold tracking-tight text-[#111111]">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">{item.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="default" className="border-y border-neutral-200">
        <SectionHeader
          eyebrow="Field Documentation"
          title="Community Activities"
          text="Photos and videos from our food donation drives, youth mentorship, and neighbourhood outreach programmes."
        />

        {!media ? (
          <MediaCardSkeleton count={3} />
        ) : media.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
            <p className="text-sm text-[#6B6B6B]">No community activities posted yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 60}>
                <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  {m.media_type === 'video' ? (
                    <div className="relative aspect-[4/3] bg-[#111111]">
                      <video
                        controls
                        preload="metadata"
                        poster={assetUrl('community', m.poster_url) || '/assets/images/trainingpic.png'}
                        className="absolute inset-0 h-full w-full object-contain"
                      >
                        <source src={assetUrl('community', m.file_name)} />
                      </video>
                    </div>
                  ) : (
                    <div className="group aspect-[4/3] overflow-hidden bg-neutral-100">
                      <SmartImage
                        src={assetUrl('community', m.file_name)}
                        alt={m.title || 'Mayford Community Impact'}
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        fallbackSrc={assetUrl('images', m.file_name)}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mayford-600">
                        Outreach Activity
                      </span>
                      <h3 className="mt-1 text-base font-bold tracking-tight text-[#111111]">
                        {m.title || 'Community Outreach Initiative'}
                      </h3>
                      {m.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-[#6B6B6B]">{m.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      <Section tone="white">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-neutral-200 bg-[#111111] p-8 text-white sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <Eyebrow light>Partner With Us</Eyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Committed to Stronger Communities
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-300 sm:text-base">
              Through food donations, outreach initiatives, and practical training, Mayford Foods works to make a lasting positive impact in Accra.
            </p>
          </div>
          <LinkBtn href="/contact" variant="white">
            <span>Get in Touch</span>
          </LinkBtn>
        </div>
      </Section>
    </>
  );
}
