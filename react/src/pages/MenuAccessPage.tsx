import { ArrowRight, QrCode, Smartphone } from 'lucide-react';
import { Card, Eyebrow, LinkBtn, Section } from '../components/ui';
import { SmartImage } from '../components/SmartImage';

export default function MenuAccessPage() {
  return (
    <Section tone="default">
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 sm:p-12">
          <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white">
                <QrCode className="h-5 w-5" />
              </div>
              <Eyebrow className="mt-4">Contactless Digital Menu</Eyebrow>
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#111111] sm:text-3xl">
                Scan to Open the Menu
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
                Point your smartphone camera at the QR code to browse dishes, check daily prices, and place an order from your table or anywhere in Accra.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#6B6B6B]">
                <Smartphone className="h-4 w-4 text-[#111111]" />
                <span>Works with iOS and Android camera apps</span>
              </div>
              <div className="mt-7">
                <LinkBtn href="/menu" variant="dark">
                  <span>Open Menu Directly</span>
                  <ArrowRight className="h-4 w-4" />
                </LinkBtn>
              </div>
            </div>

            <div className="mx-auto shrink-0 rounded-lg border border-neutral-200 bg-[#FAF6E8] p-3">
              <SmartImage
                src="/assets/images/menuqr.jpeg"
                alt="Mayford Foods Menu QR Code"
                sizes="208px"
                className="h-48 w-48 rounded-md object-contain bg-white sm:h-52 sm:w-52"
              />
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}
