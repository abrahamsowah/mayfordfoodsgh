import type { MenuItem, Settings } from './types';

/** Format a number as cedis: GH₵ 1,250.00 (same as the old PHP number_format) */
export function ghs(n: number | string | null | undefined): string {
  const value = Number(n || 0);
  return `GH₵ ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Discounted (effective) price of a menu item */
export function effectivePrice(item: Pick<MenuItem, 'price' | 'discount_percent'>): number {
  const p = Number(item.price || 0);
  const d = Number(item.discount_percent || 0);
  return d > 0 ? p - (p * d) / 100 : p;
}

export function formatNum(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString('en-US');
}

/** WhatsApp international number for an outlet, from website settings */
export function outletWhatsApp(outlet: string, settings?: Settings | null): string {
  const phone =
    outlet === 'Adabraka' ? settings?.adabraka_phone || '0244143271' : settings?.dzorwulu_phone || '0533634378';
  return `233${String(phone).replace(/\D/g, '').replace(/^0/, '')}`;
}

export function waLink(numberOrPhone: string, text?: string): string {
  const base = `https://wa.me/${numberOrPhone.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
