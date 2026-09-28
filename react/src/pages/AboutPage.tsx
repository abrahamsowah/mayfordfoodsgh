import { Sprout, Users, UtensilsCrossed } from 'lucide-react';
import { Reveal } from '../components/motion';
import { Card, Eyebrow, LinkBtn, Section, SectionHeader } from '../components/ui';

export default function AboutPage() {
  return (
    <Section>
      <div className="mb-14 text-center">
        <Eyebrow>Who We Are</Eyebrow>
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">About Mayford Foods</h1>
      </div>

      <Reveal>
        <div className="mb-14 grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-white shadow-lift ring-1 ring-stone-900/5 md:grid-cols-2">
          <div className="relative min-h-[420px] md:min-h-[540px]">
            <img
              src="/assets/images/ownersofmayford.jpeg"
              alt="The owners of Mayford Foods"
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          </div>
          <div className="p-8 md:p-12">
            <p className="text-5xl font-extrabold text-flame-500">
              &ldquo;
            </p>
            <p className="-mt-6 text-2xl font-bold leading-snug tracking-tight text-stone-900 md:text-3xl">
              We serve food the way we would serve our own family: fresh, hot, and full of love.
            </p>
            <p className="mt-6 leading-relaxed text-stone-600">
              Mayford Foods is a family-owned restaurant in the heart of Accra. We believe every meal is a
              chance to bring people together, which is why we cook every dish fresh, daily.
            </p>
            <p className="mt-4 leading-relaxed text-stone-600">
              From rich jollof and banku to continental favourites, our menu celebrates the best of Ghanaian
              cooking, made with local ingredients, bold flavours, and generous portions.
            </p>
            <div className="mt-8">
              <LinkBtn href="/menu">Explore The Menu</LinkBtn>
            </div>
          </div>
        </div>
      </Reveal>

      <SectionHeader
        eyebrow="What We Stand For"
        title={
          <>
            Our <span className="text-flame-600">Values</span>
          </>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            icon: Users,
            title: 'Family Owned',
            body: 'A family business run with pride, care, and consistency, every day, in every branch.',
          },
          {
            icon: Sprout,
            title: 'Fresh, Daily Cooking',
            body: 'We cook from scratch every morning so your food is always hot, fresh, and full of flavour.',
          },
          {
            icon: UtensilsCrossed,
            title: 'Proudly Ghanaian',
            body: 'Local ingredients, Ghanaian recipes, and the warmth of Accra hospitality in every dish.',
          },
        ].map((v, i) => (
          <Reveal key={v.title} delay={i * 90}>
            <Card className="h-full p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                <v.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold tracking-tight text-stone-900">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{v.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
