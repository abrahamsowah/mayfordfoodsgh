import { AlertTriangle, CreditCard, FileText, Lock, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { Eyebrow, LinkBtn, Section } from '../components/ui';

export default function LegalPage() {
  return (
    <Section tone="default">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <Eyebrow>Regulatory &amp; Guest Compliance</Eyebrow>
          <h1 className="text-3xl font-bold tracking-[-0.025em] text-[#111111] sm:text-4xl">
            Privacy, Food Safety &amp; Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Last updated October 2026 · Applicable to Mayford Foods GH (Adabraka &amp; Dzorwulu branches, online
            ordering, outside catering, and culinary academy).
          </p>
        </div>

        {/* 1. FDA & Allergen Notice */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-mayford-600 text-white">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">
                1. FDA Ghana Food Hygiene &amp; Allergen Disclosure
              </h2>
              <p className="text-xs text-[#6B6B6B]">Kitchen safety and dietary transparency</p>
            </div>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-[#6B6B6B]">
            <p>
              All meals served by Mayford Foods GH at our <strong className="text-[#111111]">Adabraka</strong> and{' '}
              <strong className="text-[#111111]">Dzorwulu</strong> kitchens are prepared daily in accordance with
              Ghana Food and Drugs Authority (FDA) and Accra Metropolitan Assembly food hygiene standards.
            </p>

            <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#111111]">
                <AlertTriangle className="h-4 w-4 text-mayford-600" />
                <span>Important Allergen Notice</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#6B6B6B]">
                Traditional Ghanaian dishes prepared in our kitchens may contain or come into contact with:{' '}
                <strong className="text-[#111111]">
                  Peanuts / Groundnuts, Crustaceans &amp; Dried Shrimp (used in Shito and stews), Fish, Eggs, Dairy,
                  Soy, and Wheat / Gluten
                </strong>
                . Guests with severe food allergies should call our branch kitchen directly before placing an online
                order.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Data Protection Act 2012 (Act 843) */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#111111] text-white">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">
                2. Data Privacy Policy (Ghana Data Protection Act, 2012 - Act 843)
              </h2>
              <p className="text-xs text-[#6B6B6B]">How we collect, process, and protect guest data</p>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[#6B6B6B]">
            <p>
              In compliance with the <strong className="text-[#111111]">Data Protection Act, 2012 (Act 843)</strong> of
              the Republic of Ghana, Mayford Foods GH collects only the personal data strictly necessary to fulfill your
              order, catering booking, or training application:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-[#111111]">
              <li>
                <strong>Order Fulfillment Data:</strong> Customer name, phone number, delivery address, and optional
                email address for Paystack electronic payment receipts.
              </li>
              <li>
                <strong>Training &amp; Catering Inquiries:</strong> Applicant or event host contact details submitted
                voluntarily through our booking forms.
              </li>
              <li>
                <strong>Session &amp; Security Cookies:</strong> First-party <code className="font-mono">HttpOnly</code>{' '}
                cookies used strictly for session integrity and aggregate site analytics. We never sell or share guest
                contact numbers with third-party marketers.
              </li>
              <li>
                <strong>Data Subject Rights:</strong> You may request access to, correction of, or deletion of your
                personal records at any time by contacting <strong className="text-[#111111]">mayfordfoods@gmail.com</strong>.
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Paystack Payment Security & Refund Policy */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#011B33] text-[#09A5DB]">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">
                3. Paystack Payment Security, Cancellations &amp; Refunds
              </h2>
              <p className="text-xs text-[#6B6B6B]">PCI-DSS Level 1 processing &amp; order resolution</p>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[#6B6B6B]">
            <p>
              Online payments in <strong className="text-[#111111]">Ghana Cedis (GH₵)</strong> are processed via{' '}
              <strong className="text-[#111111]">Paystack</strong> (supporting MTN Mobile Money, Telecel Cash,
              AirtelTigo Money, Visa, and Mastercard). Mayford Foods GH never stores raw card numbers or Mobile Money
              PINs on our servers.
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-[#111111]">
              <li>
                <strong>Order Cancellation Window:</strong> Orders may be modified or cancelled for a full refund while
                the order status is still <strong>Pending</strong> (before kitchen preparation begins).
              </li>
              <li>
                <strong>Quality Guarantee &amp; Refunds:</strong> If an item is unavailable or delivered incorrectly,
                contact the fulfilling branch immediately with your Order ID and Paystack Reference (<code className="font-mono">PSK_...</code>) for an immediate replacement or Paystack reversal.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verified Hospitality &amp; Payment Compliance</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <LinkBtn href="/track-order" variant="outline">
                <FileText className="h-4 w-4" />
                <span>Track an Order</span>
              </LinkBtn>
              <LinkBtn href="/contact" variant="dark">
                <span>Contact Support</span>
              </LinkBtn>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
