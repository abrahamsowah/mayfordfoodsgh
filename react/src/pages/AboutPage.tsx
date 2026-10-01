import {
  ArrowRight,
  BadgeCheck,
  ChefHat,
  Heart,
  Leaf,
  MessageCircle,
  HeartHandshake,
  Store,
  Users,
} from 'lucide-react';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import { Badge, Card, HeroSmall, IconTile, LinkBtn, Section, SectionHeader } from '../components/ui';
import { CountUp } from '../components/motion';
import { waLink } from '../utils';

const VALUES = [
  { icon: Users, title: 'Family owned', text: 'Run with pride by the Mayford family — the same faces, the same standards, every day.' },
  { icon: Leaf, title: 'Fresh, daily cooking', text: 'Every pot starts from scratch each morning with ingredients from Accra markets.' },
  { icon: ChefHat, title: 'Proudly Ghanaian', text: 'Local recipes, generous portions and the warmth of Accra hospitality on every plate.' },
  { icon: Heart, title: 'Community first', text: 'Food donations, outreach and training that give back to the city that raised us.' },
];

const STATS = [
  { value: 2, suffix: '', label: 'Accra outlets' },
  { value: 7, suffix: '', label: 'Days open weekly' },
  { value: 500, suffix: '+', label: 'Events catered' },
  { value: 1000, suffix: '+', label: 'Happy customers' },
];

export default function AboutPage() {
  const { settings } = useSettings();

  return (
    <>
      <HeroSmall
        image="/assets/images/ownersofmayford.jpeg"
        badge="Our story"
        title="A family kitchen in the heart of Accra"
        text="From one market kitchen to two outlets, an events catering team and a hospitality training academy."
      />

      {/* Story */}
      <Section tone="white">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative">
              <img
                src="/assets/images/ownersofmayford.jpeg"
                alt="The Mayford Foods family"
                className="aspect-[4/5] w-full rounded-card object-cover object-top"
              />
              <div className="absolute -bottom-5 right-5 flex items-center gap-3 rounded-card border border-ink-200 bg-white px-4 py-3">
                <IconTile icon={BadgeCheck} tone="brand" size="sm" />
                <div className="leading-tight">
                  <p className="text-[14px] font-semibold text-ink-900">The Mayford family</p>
                  <p className="text-[11px] font-bold text-ink-400">Founders &amp; team</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <Badge tone="neutral" icon={HeartHandshake}>
              Who we are
            </Badge>
            <h2 className="mt-4 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-ink-900 md:text-[2.25rem]">
              We cook the way we would feed our own family
            </h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-600">
              <p>
                Mayford Foods began as a single market kitchen with a simple belief: good food is fresh food, cooked
                with care and served generously.
              </p>
              <p>
                Today we run two outlets — Mayford Locals in Adabraka and Mayford Fast Food in Dzorwulu — an outside
                catering service for weddings, funerals and corporate events, and a training academy shaping the next
                generation of Ghanaian hospitality professionals.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBtn href="/menu" variant="primary" size="lg" iconRight={ArrowRight}>
                See what we cook
              </LinkBtn>
              <LinkBtn
                href={waLink(settings?.adabraka_phone || '0244143271', 'Hello Mayford Foods!')}
                external
                variant="outline"
                size="lg"
                icon={MessageCircle}
              >
                Talk to us
              </LinkBtn>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Stats */}
      <Section className="!py-12">
        <Reveal>
          <div className="grid gap-px overflow-hidden rounded-card border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white px-6 py-7 text-center">
                <p className="text-[2rem] font-semibold leading-none tabular-nums tracking-tight text-ink-900">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-[12px] font-semibold text-ink-400">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* Values */}
      <Section tone="white">
        <SectionHeader
          eyebrow="What we stand for"
          title="The values behind every plate"
          text="Four things we refuse to compromise on, from the first pot of the morning to the last delivery of the night."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={(i % 2) * 80}>
              <Card className="flex h-full items-start gap-4 p-5 md:p-6">
                <IconTile icon={v.icon} tone={i === 0 ? 'brand' : 'light'} size="lg" />
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight text-ink-900">{v.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">{v.text}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Where to find us */}
      <Section className="!pt-0">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-5 rounded-card border border-ink-200 bg-white p-6 md:flex-row md:items-center md:p-8">
            <div className="flex items-start gap-4">
              <IconTile icon={Store} tone="brand" size="lg" />
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">Come and eat with us</h2>
                <p className="mt-1 max-w-lg text-[14px] leading-relaxed text-ink-500">
                  {settings?.opening_hours || 'Monday – Sunday, 9:00 AM – 9:30 PM'} · Adabraka &amp; Dzorwulu, Accra.
                </p>
              </div>
            </div>
            <LinkBtn href="/outlets" variant="dark" size="lg" iconRight={ArrowRight}>
              Outlet details
            </LinkBtn>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
