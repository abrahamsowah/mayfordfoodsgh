import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Minus, Plus, Star as StarIcon, Trash2 } from 'lucide-react';
import { Reveal } from './motion';
import { SmartImage } from './SmartImage';
import { useCart } from '../context/CartContext';
import type { MenuItem } from '../types';
import { assetUrl, effectivePrice, ghs } from '../utils';

export function Btn({
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'red' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-[#111111] text-white hover:bg-[#262626]',
    red: 'bg-mayford-600 text-white hover:bg-mayford-700',
    outline: 'border border-neutral-300 bg-white text-[#111111] hover:border-[#111111] hover:bg-neutral-50',
    ghost: 'bg-transparent text-[#111111] hover:bg-neutral-100',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    />
  );
}

export function LinkBtn({
  href,
  className = '',
  children,
  external = false,
  variant = 'primary',
}: {
  href: string;
  className?: string;
  children: ReactNode;
  external?: boolean;
  variant?: 'primary' | 'ghost' | 'dark' | 'white' | 'outline';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-mayford-600 text-white hover:bg-mayford-700',
    ghost: 'border border-neutral-600 bg-transparent text-white hover:border-white hover:bg-white hover:text-[#111111]',
    dark: 'bg-[#111111] text-white hover:bg-[#262626]',
    white: 'bg-white text-[#111111] hover:bg-neutral-100',
    outline: 'border border-neutral-300 bg-white text-[#111111] hover:border-[#111111] hover:bg-neutral-50',
  };

  const cls = `inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors duration-150 ${variants[variant] || variants.primary} ${className}`;

  if (external || href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:')) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className={cls}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={cls}>
      {children}
    </Link>
  );
}

export function Section({
  children,
  className = '',
  id,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'default' | 'white' | 'tint';
}) {
  const tones: Record<string, string> = {
    default: 'bg-[#F7F7F7]',
    white: 'bg-white',
    tint: 'bg-[#F7F7F7]',
  };
  return (
    <section id={id} className={`py-16 md:py-24 ${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export function Eyebrow({
  children,
  light = false,
  className = '',
}: {
  children: ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`mb-2 text-xs font-semibold uppercase tracking-[0.14em] ${
        light ? 'text-neutral-400' : 'text-mayford-600'
      } ${className}`}
    >
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  light = false,
  center = false,
}: {
  children: ReactNode;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <h2
      className={`text-2xl font-bold tracking-[-0.02em] sm:text-3xl md:text-4xl ${
        light ? 'text-white' : 'text-[#111111]'
      } ${center ? 'text-center' : ''}`}
    >
      {children}
    </h2>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  text,
  light = false,
  action,
  align = 'left',
}: {
  eyebrow: string;
  title: ReactNode;
  text?: ReactNode;
  light?: boolean;
  index?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
}) {
  if (align === 'center') {
    return (
      <Reveal className="mx-auto mb-12 max-w-2xl text-center">
        <Eyebrow light={light}>{eyebrow}</Eyebrow>
        <SectionTitle light={light} center>
          {title}
        </SectionTitle>
        {text && (
          <p className={`mt-3 text-base leading-relaxed ${light ? 'text-neutral-300' : 'text-[#6B6B6B]'}`}>
            {text}
          </p>
        )}
      </Reveal>
    );
  }

  return (
    <Reveal className="mb-10 flex flex-col justify-between gap-4 border-b border-neutral-200/80 pb-6 md:mb-12 md:flex-row md:items-end">
      <div className="max-w-2xl">
        <Eyebrow light={light}>{eyebrow}</Eyebrow>
        <SectionTitle light={light}>{title}</SectionTitle>
        {text && (
          <p className={`mt-2.5 text-base leading-relaxed ${light ? 'text-neutral-400' : 'text-[#6B6B6B]'}`}>
            {text}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}

export function HeroSmall({
  image,
  eyebrow,
  title,
  text,
}: {
  image: string;
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <section className="relative flex min-h-[300px] items-end overflow-hidden bg-[#111111] py-14 md:min-h-[360px] md:py-20">
      <SmartImage
        src={image}
        alt={title}
        priority
        sizes="100vw"
        position="50% 35%"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/60 to-transparent" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">{eyebrow}</p>
          )}
          <h1 className="text-3xl font-bold tracking-[-0.025em] text-white sm:text-4xl md:text-5xl">{title}</h1>
          {text && <p className="mt-3 text-base leading-relaxed text-neutral-300 md:text-lg">{text}</p>}
        </div>
      </div>
    </section>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#111111] placeholder-neutral-400 outline-none transition-colors focus:border-[#111111] focus:ring-1 focus:ring-[#111111] ${className}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#111111] outline-none transition-colors focus:border-[#111111] focus:ring-1 focus:ring-[#111111] ${className}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#111111] placeholder-neutral-400 outline-none transition-colors focus:border-[#111111] focus:ring-1 focus:ring-[#111111] ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">{label}</span>}
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#6B6B6B]">{hint}</span>}
    </label>
  );
}

export function Alert({ tone = 'green', children }: { tone?: 'green' | 'red' | 'orange'; children: ReactNode }) {
  const tones = {
    green: 'border-neutral-200 border-l-4 border-l-emerald-600 bg-white text-[#111111]',
    red: 'border-neutral-200 border-l-4 border-l-red-600 bg-white text-red-900',
    orange: 'border-neutral-200 border-l-4 border-l-amber-600 bg-white text-[#111111]',
  };
  return <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${tones[tone]}`}>{children}</div>;
}

export function FacebookIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function Stars({ n, className = '' }: { n: number; className?: string }) {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          className={`h-4 w-4 ${i < full ? 'fill-[#111111] text-[#111111]' : 'fill-neutral-200 text-neutral-200'}`}
        />
      ))}
    </span>
  );
}

export function Spinner({ label }: { label?: string } = {}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111111] border-t-transparent" />
      {label && <p className="text-xs font-medium text-[#6B6B6B]">{label}</p>}
    </div>
  );
}

export function FoodCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-neutral-200" />
          <div className="pt-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-2/3 animate-pulse rounded-sm bg-neutral-200" />
              <div className="h-4 w-16 animate-pulse rounded-sm bg-neutral-200" />
            </div>
            <div className="h-3.5 w-full animate-pulse rounded-sm bg-neutral-100" />
            <div className="h-3.5 w-4/5 animate-pulse rounded-sm bg-neutral-100" />
            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5">
              <div className="h-3 w-20 animate-pulse rounded-sm bg-neutral-200" />
              <div className="h-3 w-16 animate-pulse rounded-sm bg-neutral-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="aspect-[4/3] w-full animate-pulse bg-neutral-200" />
          <div className="p-5 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-neutral-200" />
            <div className="h-3.5 w-full animate-pulse rounded-sm bg-neutral-100" />
            <div className="h-3.5 w-2/3 animate-pulse rounded-sm bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyRow({ colSpan, text = 'No records found.' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-neutral-500">
        {text}
      </td>
    </tr>
  );
}

export function DeleteBtn({
  onConfirm,
  label = 'Delete',
  confirmText = 'Are you sure you want to delete this record?',
}: {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(confirmText)) void onConfirm();
      }}
      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-neutral-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

export function ZoomImg({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className="group/img overflow-hidden bg-neutral-100">
      <SmartImage
        src={src}
        alt={alt}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className={`${className} w-full object-cover transition-transform duration-500 ease-out group-hover/img:scale-[1.03]`}
      />
    </div>
  );
}

/**
 * Airbnb + Uber Eats inspired Food Card.
 * - Clean aspect-ratio image frame with subtle 8px rounding (rounded-lg)
 * - Floating Uber Eats quick-add / live quantity stepper in bottom-right corner
 * - Crisp typographic stack below with tabular pricing and direct quick-order link
 */
export function FoodCard({ item }: { item: MenuItem }) {
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const qty = getItemQuantity(item.id);
  const price = effectivePrice(item);
  const hasDiscount = Number(item.discount_percent || 0) > 0;

  return (
    <article className="group flex h-full flex-col">
      {/* Image Frame */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-100">
        <SmartImage
          src={assetUrl('images', item.image)}
          alt={item.food_name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          fallbackSrc="/assets/images/Jollof.png"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Discount Tag (only when applicable) */}
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-sm bg-mayford-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
            {item.discount_percent}% Off
          </span>
        )}

        {/* Uber Eats style Quick-Add / Quantity Stepper */}
        <div className="absolute bottom-3 right-3">
          {qty === 0 ? (
            <button
              type="button"
              onClick={() => addItem(item)}
              aria-label={`Add ${item.food_name} to cart`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200/90 bg-white px-3.5 text-xs font-semibold text-[#111111] shadow-md transition-colors duration-150 hover:border-[#111111] hover:bg-[#111111] hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>Add</span>
            </button>
          ) : (
            <div className="inline-flex h-9 items-center rounded-md bg-[#111111] p-1 text-white shadow-md">
              <button
                type="button"
                onClick={() => updateQuantity(item.id, qty - 1)}
                aria-label={`Decrease quantity of ${item.food_name}`}
                className="flex h-7 w-7 items-center justify-center rounded-sm text-white transition-colors hover:bg-neutral-800"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-7 px-1.5 text-center text-xs font-semibold tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => addItem(item)}
                aria-label={`Increase quantity of ${item.food_name}`}
                className="flex h-7 w-7 items-center justify-center rounded-sm text-white transition-colors hover:bg-neutral-800"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editorial Information Stack */}
      <div className="flex flex-1 flex-col pt-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight text-[#111111] group-hover:text-mayford-600 transition-colors">
            {item.food_name}
          </h3>
          <div className="shrink-0 text-right tabular-nums">
            <span className="text-sm font-semibold text-[#111111]">{ghs(price)}</span>
            {hasDiscount && (
              <span className="ml-1.5 text-xs text-neutral-400 line-through">{ghs(item.price)}</span>
            )}
          </div>
        </div>

        <p className="mt-1 line-clamp-2 flex-1 text-sm leading-relaxed text-[#6B6B6B]">
          {item.description || `Freshly prepared ${item.category.toLowerCase()} dish served hot.`}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs text-[#6B6B6B]">
          <span className="font-medium text-neutral-500">{item.category}</span>
          {qty > 0 ? (
            <Link
              to="/cart"
              className="inline-flex items-center gap-1 font-semibold text-mayford-600 hover:text-mayford-700"
            >
              <Check className="h-3.5 w-3.5" />
              In cart ({qty})
            </Link>
          ) : (
            <Link
              to={`/order/${item.id}`}
              className="inline-flex items-center gap-1 font-medium text-neutral-600 transition-colors hover:text-[#111111]"
            >
              Quick order
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
