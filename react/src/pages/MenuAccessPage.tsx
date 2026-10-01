import { ArrowRight, QrCode, ScanLine, ShoppingBag, Smartphone, UtensilsCrossed } from 'lucide-react';
import { Badge, Card, IconTile, LinkBtn, Section } from '../components/ui';

const STEPS = [
  { icon: ScanLine, title: 'Scan the code', text: 'Point your phone camera at the QR code — no app to install.' },
  { icon: UtensilsCrossed, title: 'Browse the menu', text: 'See today’s dishes, prices and offers, updated live.' },
  { icon: ShoppingBag, title: 'Order & confirm', text: 'Build your cart, then confirm with the branch on WhatsApp.' },
];

export default function MenuAccessPage() {
  return (
    <Section className="!py-12 md:!py-16">
      <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        {/* QR card */}
        <Card className="mx-auto w-full max-w-sm p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-mayford-600 text-white">
            <QrCode className="h-7 w-7" strokeWidth={2.1} />
          </div>
          <h1 className="mt-5 text-[1.5rem] font-semibold tracking-tight text-ink-900">Scan to view the menu</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            Share this code at your table, in your hotel room or with your guests.
          </p>
          <div className="mt-6 rounded-card border border-ink-200 bg-white p-3">
            <img
              src="/assets/images/menuqr.jpeg"
              alt="Mayford Foods digital menu QR code"
              className="mx-auto w-full max-w-[15rem] rounded-tile"
            />
          </div>
          <div className="mt-5">
            <LinkBtn href="/menu" variant="primary" size="lg" full iconRight={ArrowRight}>
              Open the menu instead
            </LinkBtn>
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-ink-400">
            <Smartphone className="h-3.5 w-3.5" strokeWidth={2.3} /> Works with any phone camera
          </p>
        </Card>

        {/* Steps */}
        <div>
          <Badge tone="brand" icon={UtensilsCrossed}>
            Digital menu
          </Badge>
          <h2 className="mt-4 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-900 md:text-[2.1rem]">
            One code, the whole Mayford kitchen
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            Our digital menu always shows what is cooking today — no reprints, no out-of-date prices. Guests scan, order
            and confirm in under a minute.
          </p>

          <ol className="mt-8 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-start gap-4">
                <span className="relative">
                  <IconTile icon={s.icon} tone={i === 0 ? 'brand' : 'light'} />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-tile bg-ink-900 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                </span>
                <div className="pt-0.5">
                  <p className="text-[15px] font-semibold tracking-tight text-ink-900">{s.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap gap-3">
            <LinkBtn href="/menu" variant="dark" size="md" icon={UtensilsCrossed}>
              Browse menu
            </LinkBtn>
            <LinkBtn href="/outlets" variant="outline" size="md">
              Visit an outlet
            </LinkBtn>
          </div>
        </div>
      </div>
    </Section>
  );
}
