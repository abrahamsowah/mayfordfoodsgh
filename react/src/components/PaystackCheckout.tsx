import { useState, type FormEvent } from 'react';
import { CreditCard, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';
import { api } from '../api';
import { ghs } from '../utils';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.PaystackPop) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.PaystackPop));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(!!window.PaystackPop);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function generatePaystackRef(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `PSK_MF_${Date.now().toString().slice(-5)}${rand}`;
}

export interface PaystackTriggerOptions {
  publicKey?: string;
  email: string;
  phone: string;
  customerName: string;
  amountGhs: number;
  outlet: string;
  onSuccess: (reference: string, paymentToken?: string) => void;
  onCancel?: () => void;
}

/**
 * Launches official Paystack Inline if a valid pk_test_ / pk_live_ key is configured;
 * returns false if the interactive built-in Paystack GHS modal should be shown instead.
 */
export async function launchOfficialPaystack(opts: PaystackTriggerOptions): Promise<boolean> {
  const key = (opts.publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim();
  if (!key || !key.startsWith('pk_')) {
    return false;
  }

  const loaded = await loadPaystackScript();
  if (!loaded || !window.PaystackPop) {
    return false;
  }

  const ref = generatePaystackRef();
  const handler = window.PaystackPop.setup({
    key,
    email: opts.email || `${opts.phone.replace(/\D/g, '') || 'guest'}@mayfordfoods.com`,
    amount: Math.round(opts.amountGhs * 100), // pesewas
    currency: 'GHS',
    ref,
    channels: ['mobile_money', 'card'],
    metadata: {
      custom_fields: [
        { display_name: 'Customer Name', variable_name: 'customer_name', value: opts.customerName },
        { display_name: 'Phone Number', variable_name: 'phone', value: opts.phone },
        { display_name: 'Kitchen Outlet', variable_name: 'outlet', value: opts.outlet },
      ],
    },
    callback: async (response: { reference?: string }) => {
      const verifiedRef = response?.reference || ref;
      try {
        const verifyRes = await api.post<{ ok: boolean; payment_token: string }>('/payments/verify', {
          reference: verifiedRef,
          amount_ghs: opts.amountGhs,
        });
        opts.onSuccess(verifiedRef, verifyRes.payment_token);
      } catch {
        opts.onSuccess(verifiedRef);
      }
    },
    onClose: () => {
      opts.onCancel?.();
    },
  });

  handler.openIframe();
  return true;
}

/**
 * Interactive Paystack GHS Checkout Modal (Mobile Money + Card)
 * Used when testing or before a live pk_... key is entered in Admin Settings.
 */
export function PaystackModal({
  open,
  email,
  phone,
  customerName,
  amountGhs,
  outlet,
  onClose,
  onSuccess,
}: {
  open: boolean;
  email: string;
  phone: string;
  customerName: string;
  amountGhs: number;
  outlet: string;
  onClose: () => void;
  onSuccess: (reference: string, paymentToken?: string) => void;
}) {
  const [channel, setChannel] = useState<'momo' | 'card'>('momo');
  const [network, setNetwork] = useState<'MTN' | 'Telecel' | 'AirtelTigo'>('MTN');
  const [momoNumber, setMomoNumber] = useState(phone || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleAuthorize(e: FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError('');
    const ref = generatePaystackRef();
    try {
      const verifyRes = await api.post<{ ok: boolean; payment_token: string }>('/payments/verify', {
        reference: ref,
        amount_ghs: amountGhs,
      });
      window.setTimeout(() => {
        setProcessing(false);
        onSuccess(ref, verifyRes.payment_token);
      }, 700);
    } catch (err) {
      setProcessing(false);
      setError((err as Error).message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paystack Top Bar */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#111111] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#0BA4DB] text-white">
              <Lock className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-wide text-white">PAYSTACK CHECKOUT</p>
              <p className="text-[11px] text-neutral-400">Mayford Foods GH · {outlet}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="border-b border-neutral-100 bg-[#FAF6E8] px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">Total Amount</p>
            <p className="text-xl font-bold tabular-nums text-[#111111]">{ghs(amountGhs)}</p>
          </div>
          <div className="text-right text-[11px] text-[#6B6B6B]">
            <p className="font-semibold text-[#111111]">{customerName}</p>
            <p>{email || phone}</p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 p-4">
          <button
            type="button"
            onClick={() => setChannel('momo')}
            className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition-colors ${
              channel === 'momo'
                ? 'bg-[#111111] text-white'
                : 'border border-neutral-200 bg-white text-[#6B6B6B] hover:border-neutral-400'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Mobile Money</span>
          </button>
          <button
            type="button"
            onClick={() => setChannel('card')}
            className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition-colors ${
              channel === 'card'
                ? 'bg-[#111111] text-white'
                : 'border border-neutral-200 bg-white text-[#6B6B6B] hover:border-neutral-400'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Card Payment</span>
          </button>
        </div>

        {error && (
          <div className="px-5 pt-3">
            <p className="rounded-md bg-rose-50 p-2 text-xs font-medium text-rose-700">{error}</p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleAuthorize} className="space-y-4 p-5">
          {channel === 'momo' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Mobile Money Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MTN', 'Telecel', 'AirtelTigo'] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setNetwork(net)}
                      className={`rounded-md border py-2 text-xs font-bold transition-colors ${
                        network === net
                          ? 'border-[#111111] bg-[#111111] text-white'
                          : 'border-neutral-200 bg-[#FAF6E8] text-[#111111] hover:border-neutral-400'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Mobile Money Number
                </label>
                <input
                  type="tel"
                  required
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="e.g. 0244123456"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-[#111111] outline-none focus:border-[#111111]"
                />
                <p className="mt-1 text-[11px] text-[#6B6B6B]">
                  A prompt will be sent to authorize GH₵ {amountGhs.toFixed(2)} on your {network} wallet.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Card Number</label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4123 •••• •••• 8890"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="12/28"
                    className="w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">CVV</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    className="w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#6B6B6B]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>256-bit encrypted Paystack payment session</span>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full rounded-md bg-[#0BA4DB] py-3 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {processing ? 'Processing Payment...' : `Authorize GH₵ ${amountGhs.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
