import { ArrowRight, Sprout, Users, UtensilsCrossed } from 'lucide-react';
import { Reveal } from '../components/motion';
import { Card, Eyebrow, LinkBtn, Section, SectionHeader } from '../components/ui';

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-neutral-200 bg-[#F7F7F7] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Our Heritage</Eyebrow>
            <h1 className="text-3xl font-bold tracking-[-0.025em] text-[#111111] sm:text-4xl md:text-5xl">
              About Mayford Foods
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[#6B6B6B]">
              A family-owned Accra hospitality group dedicated to authentic Ghanaian cooking, dependable event catering, and practical culinary education.
            </p>
          </div>
        </div>
      </section>

      <Section tone="white">
        <Reveal>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                <img
                  src="/assets/images/ownersofmayford.jpeg"
                  alt="Founders of Mayford Foods"
                  className="h-full max-h-[520px] w-full object-cover object-top"
                />
              </div>
            </div>

            <div className="lg:col-span-7">
              <Eyebrow>Founders&apos; Statement</Eyebrow>
              <blockquote className="text-2xl font-bold leading-snug tracking-[-0.02em] text-[#111111] sm:text-3xl">
                &ldquo;We prepare every plate the way we would serve our own family: fresh from the stove, generous in portion, and consistent in quality.&rdquo;
              </blockquote>

              <div className="mt-6 space-y-4 text-base leading-relaxed text-[#6B6B6B]">
                <p>
                  Mayford Foods began with a simple commitment in the heart of Accra: to serve honest, freshly cooked Ghanaian and continental meals in a welcoming environment.
                </p>
                <p>
                  From smoky jollof rice, banku with okro, and fufu to boiled yam with palava sauce and continental dishes, every recipe is prepared from scratch each morning using fresh local market ingredients.
                </p>
                <p>
                  Today, we operate two branches in Adabraka and Dzorwulu, a full-service outside catering division for weddings and corporate events, and the Mayford Training Academy.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6">
                <LinkBtn href="/menu" variant="dark">
                  <span>Explore Our Menu</span>
                  <ArrowRight className="h-4 w-4" />
                </LinkBtn>
                <LinkBtn href="/outlets" variant="outline">
                  <span>Visit Our Outlets</span>
                </LinkBtn>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section tone="default" className="border-t border-neutral-200">
        <SectionHeader
          eyebrow="Operating Principles"
          title="What Defines Our Kitchen"
          text="Three standards upheld every day across our restaurants, catering teams, and training classrooms."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Family Ownership',
              body: 'Hands-on leadership and personal accountability in every kitchen and customer interaction.',
            },
            {
              icon: Sprout,
              title: 'Fresh Morning Preparation',
              body: 'Every dish is cooked from scratch daily so guests always receive hot, flavourful meals.',
            },
            {
              icon: UtensilsCrossed,
              title: 'Ghanaian Hospitality',
              body: 'Rooted in Accra culinary traditions while training the next generation of hospitality professionals.',
            },
          ].map((v, i) => (
            <Reveal key={v.title} delay={i * 80}>
              <Card className="h-full p-6 sm:p-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-[#F7F7F7] text-[#111111]">
                  <v.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-[#111111]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">{v.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
