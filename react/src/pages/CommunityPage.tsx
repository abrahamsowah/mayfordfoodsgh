import { useEffect, useState } from 'react';
import { api } from '../api';
import { Reveal } from '../components/motion';
import { Card, HeroSmall, Section, SectionHeader, Spinner } from '../components/ui';
import type { CommunityMedia } from '../types';

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
        title="Community Impact"
        text="Supporting lives, sharing hope and giving back to communities through outreach programs and food donations."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <Card className="p-9 text-center md:p-12">
            <h2 className="text-2xl font-extrabold tracking-tight text-mayford-700 md:text-3xl">
              Giving Back To Society
            </h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              At Mayford Foods, our mission extends beyond serving delicious meals. We are committed to supporting
              vulnerable individuals, families and communities through food donations, outreach programs and acts of
              kindness.
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="white">
        <SectionHeader
          eyebrow="In The Community"
          title={
            <>
              Community <span className="text-flame-600">Activities</span>
            </>
          }
        />
        {!media ? (
          <Spinner />
        ) : media.length === 0 ? (
          <p className="text-center text-stone-500">No community activities posted yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 80}>
                <div className="overflow-hidden rounded-3xl shadow-soft ring-1 ring-stone-900/5">
                  {m.media_type === 'video' ? (
                    <div className="relative aspect-video bg-stone-950">
                      <video controls preload="metadata" className="absolute inset-0 h-full w-full object-contain">
                        <source src={`/assets/community/${m.file_name}`} type="video/mp4" />
                      </video>
                    </div>
                  ) : (
                    <div className="group">
                      <img
                        src={`/assets/community/${m.file_name}`}
                        alt="Community Impact"
                        className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl rounded-[2.5rem] bg-gradient-to-br from-mayford-700 to-mayford-900 p-10 text-center text-white shadow-lift md:p-14">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Our Impact</h2>
          <p className="mt-4 leading-relaxed text-stone-200">
            Through food donations, outreach initiatives and community support activities, Mayford Foods continues
            to touch lives and contribute positively to society.
          </p>
          <p className="mt-3 leading-relaxed text-stone-200">
            We believe every act of kindness creates a stronger, healthier and more united community.
          </p>
          <div className="kente-stripe mx-auto mt-8 h-1 w-24 rounded-full" />
        </div>
      </Section>
    </>
  );
}
