import { Card, Eyebrow, LinkBtn, Section } from '../components/ui';

export default function MenuAccessPage() {
  return (
    <Section>
      <div className="mx-auto max-w-xl">
        <Card className="p-10 text-center">
          <Eyebrow>Digital Menu</Eyebrow>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Scan To View Menu</h1>
          <p className="mt-3 text-stone-600">
            Scan the QR Code below with your phone camera to access the Mayford Foods digital menu anytime.
          </p>
          <img
            src="/assets/images/menuqr.jpeg"
            alt="Menu QR Code"
            className="mx-auto mt-7 w-60 max-w-full rounded-3xl shadow-lift ring-1 ring-stone-900/10 sm:w-72"
          />
          <div className="mt-8">
            <LinkBtn href="/menu">View Menu Directly →</LinkBtn>
          </div>
        </Card>
      </div>
    </Section>
  );
}
