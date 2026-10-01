/* ==================================================================
   MAYFORD FOODS — UI PRIMITIVES
   ------------------------------------------------------------------
   The single source of truth for every control, chip, card and field
   in the product. Screens compose these; they never hand-roll styles.
   Icons are always lucide-react, one stroke weight, consistent size.
================================================================== */
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Minus, Plus, Star, X, type LucideIcon } from 'lucide-react';
import { Reveal } from './motion';

/* ------------------------------------------------------------------
   Buttons
------------------------------------------------------------------ */
export type ButtonVariant =
  | 'primary' /* brand red — the money action */
  | 'accent' /* brand orange — promos, highlights */
  | 'dark' /* near-black — secondary action on light */
  | 'outline' /* bordered, on light */
  | 'ghost' /* text-ish, on dark or light */
  | 'white' /* white on dark surfaces */
  | 'whatsapp'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_BASE =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-tile font-semibold tracking-[-0.01em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40';

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-mayford-600 text-white hover:bg-mayford-700',
  accent: 'bg-mayford-600 text-white hover:bg-mayford-700',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
  outline: 'border border-ink-300 bg-white text-ink-900 hover:border-ink-900',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  white: 'bg-white text-ink-900 hover:bg-ink-100',
  whatsapp: 'bg-whatsapp text-white hover:bg-whatsapp-dark',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  full?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading,
  full,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <span className={`${iconSize} shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent`} />
      ) : (
        Icon && <Icon className={`${iconSize} shrink-0`} strokeWidth={2.2} />
      )}
      {children}
      {IconRight && !loading && <IconRight className={`${iconSize} shrink-0`} strokeWidth={2.2} />}
    </button>
  );
}

/** Alias kept for the older pages inside this codebase. */
export const Btn = Button;

/* ------------------------------------------------------------------
   Link buttons — internal links use the router (no full reload)
------------------------------------------------------------------ */
export interface LinkButtonProps {
  href: string;
  children?: ReactNode;
  className?: string;
  external?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  full?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

export function LinkBtn({
  href,
  children,
  className = '',
  external = false,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  full,
  ...rest
}: LinkButtonProps) {
  const isInternal = !external && href.startsWith('/') && !href.startsWith('//');
  const cls = `${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${full ? 'w-full' : ''} ${className}`;
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]';
  const inner = (
    <>
      {Icon && <Icon className={`${iconSize} shrink-0`} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight className={`${iconSize} shrink-0`} strokeWidth={2.2} />}
    </>
  );
  if (isInternal) {
    return (
      <Link to={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer noopener' : undefined}
      className={cls}
      {...rest}
    >
      {inner}
    </a>
  );
}

/* ------------------------------------------------------------------
   Icon tile — the recurring icon container across the whole product
------------------------------------------------------------------ */
export function IconTile({
  icon: Icon,
  tone = 'brand',
  size = 'md',
  className = '',
  strokeWidth = 2.1,
}: {
  icon: LucideIcon;
  tone?: 'brand' | 'flame' | 'dark' | 'light' | 'success' | 'glass' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  strokeWidth?: number;
}) {
  // Plain line icons. No coloured tiles, no glow — the icon carries the weight.
  const tones: Record<string, string> = {
    brand: 'text-mayford-600',
    flame: 'text-mayford-600',
    dark: 'text-ink-900',
    light: 'text-ink-500',
    success: 'text-success-700',
    glass: 'text-white',
    outline: 'text-ink-700',
  };
  const glyph: Record<string, string> = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${tones[tone]} ${className}`}>
      <Icon className={glyph[size]} strokeWidth={strokeWidth} />
    </span>
  );
}

/* ------------------------------------------------------------------
   Badges / pills / chips
------------------------------------------------------------------ */
export function Badge({
  children,
  tone = 'neutral',
  icon: Icon,
  className = '',
  size = 'md',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'flame' | 'success' | 'warning' | 'info' | 'danger' | 'dark' | 'white';
  icon?: LucideIcon;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-700',
    brand: 'bg-mayford-50 text-mayford-700',
    flame: 'bg-mayford-50 text-mayford-700',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    info: 'bg-info-50 text-info-700',
    danger: 'bg-danger-50 text-danger-700',
    dark: 'bg-ink-900 text-white',
    white: 'bg-white text-ink-900 border border-ink-200',
  };
  const sizes = size === 'sm' ? 'h-5 gap-1 px-1.5 text-[10.5px]' : 'h-6 gap-1.5 px-2 text-[11.5px]';
  return (
    <span
      className={`inline-flex items-center rounded-[5px] font-semibold tracking-[0.01em] ${tones[tone]} ${sizes} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

/** Rating chip like the delivery apps: ★ 4.8 */
export function RatingPill({ value, count, className = '' }: { value: number; count?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-900 ${className}`}>
      <Star className="h-3.5 w-3.5 fill-ink-900 text-ink-900" strokeWidth={1.5} />
      {value.toFixed(1)}
      {count !== undefined && <span className="font-normal text-ink-500">({count})</span>}
    </span>
  );
}

export function Chip({
  active,
  children,
  icon: Icon,
  onClick,
  className = '',
}: {
  active?: boolean;
  children: ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-tile border px-3.5 text-[13.5px] font-semibold transition ${
        active
          ? 'border-ink-900 bg-ink-900 text-white'
          : 'border-ink-200 bg-white text-ink-600 hover:border-ink-900 hover:text-ink-900'
      } ${className}`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------
   Cards / surfaces
------------------------------------------------------------------ */
export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-ink-200 bg-white ${
        interactive ? 'transition-colors duration-200 hover:border-ink-400' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Image that scales gently on hover, inside a card. */
export function ZoomImg({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className="group/img relative overflow-hidden bg-ink-100">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} w-full object-cover transition duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/img:scale-[1.03]`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   Section shell + headers
------------------------------------------------------------------ */
export function Section({
  children,
  className = '',
  id,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'default' | 'white' | 'tint' | 'dark';
}) {
  const tones: Record<string, string> = {
    default: 'bg-white',
    white: 'bg-white',
    tint: 'bg-ink-50',
    dark: 'bg-ink-950',
  };
  return (
    <section id={id} className={`py-12 md:py-16 ${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={`mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        light ? 'text-white/60' : 'text-ink-400'
      }`}
    >
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  light = false,
  className = '',
}: {
  children: ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={`text-[1.6rem] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[2rem] ${
        light ? 'text-white' : 'text-ink-900'
      } ${className}`}
    >
      {children}
    </h2>
  );
}

/**
 * Editorial section header — left aligned (product style, not poster style)
 * with an optional trailing action.
 */
export function SectionHeader({
  eyebrow,
  title,
  text,
  light = false,
  action,
  center = false,
  index,
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  text?: ReactNode;
  light?: boolean;
  action?: ReactNode;
  center?: boolean;
  index?: string;
  className?: string;
}) {
  return (
    <Reveal className={`mb-8 md:mb-10 ${className}`}>
      <div className={`flex flex-col gap-4 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
        <div className={center ? 'max-w-2xl' : 'max-w-2xl'}>
          {index && (
            <span
              aria-hidden="true"
              className={`hidden text-[11px] font-semibold tracking-[0.3em] md:block ${light ? 'text-white/40' : 'text-ink-300'}`}
            >
              {index}
            </span>
          )}
          {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
          <SectionTitle light={light}>{title}</SectionTitle>
          {text && (
            <p className={`mt-3 text-[15px] leading-relaxed ${light ? 'text-ink-300' : 'text-ink-500'}`}>{text}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
      </div>
    </Reveal>
  );
}

/** Compact inner-page hero band: photo + scrim + title. */
export function HeroSmall({
  image,
  title,
  text,
  badge,
}: {
  image: string;
  title: string;
  text?: string;
  badge?: string;
}) {
  return (
    <section className="relative flex min-h-[19rem] items-end overflow-hidden bg-ink-950 md:min-h-[23rem]">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-ink-950/60" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        {badge && (
          <span className="mb-4 inline-flex h-6 items-center gap-2 rounded-[5px] border border-white/30 px-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white">
            {badge}
          </span>
        )}
        <h1 className="max-w-3xl text-[2rem] font-semibold leading-[1.08] tracking-[-0.025em] text-white md:text-[2.9rem]">
          {title}
        </h1>
        {text && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-200 md:text-base">{text}</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Form controls
------------------------------------------------------------------ */
const FIELD_BASE =
  'w-full rounded-tile border bg-white text-[15px] text-ink-900 placeholder:text-ink-400 transition outline-none disabled:bg-ink-50 disabled:text-ink-400';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className = '', invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        className={`${FIELD_BASE} h-12 border-ink-200 px-4 focus:border-mayford-500 focus:ring-4 focus:ring-mayford-500/12 ${
          invalid ? 'border-danger-600' : ''
        } ${className}`}
      />
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...rest },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        {...rest}
        className={`${FIELD_BASE} h-12 appearance-none border-ink-200 pl-4 pr-11 font-medium focus:border-mayford-500 focus:ring-4 focus:ring-mayford-500/12 ${className}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      {...rest}
      className={`${FIELD_BASE} min-h-[7rem] border-ink-200 px-4 py-3.5 leading-relaxed focus:border-mayford-500 focus:ring-4 focus:ring-mayford-500/12 ${className}`}
    />
  );
});

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`mb-4 block ${className}`}>
      {label && <span className="mb-2 block text-[13px] font-bold text-ink-700">{label}</span>}
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

/** Text input with a leading icon tile — search bars, phone fields, etc. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className = '',
  icon: Icon,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  icon?: LucideIcon;
  onClear?: () => void;
}) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" strokeWidth={2.2} />}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-12 w-full rounded-tile border border-ink-200 bg-white pr-11 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-ink-900 ${
          Icon ? 'pl-11' : 'pl-4'
        }`}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => (onClear ? onClear() : onChange(''))}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-tile bg-ink-100 text-ink-500 transition hover:bg-ink-200 hover:text-ink-800"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}

/** Quantity stepper used in cart lines and quick-order. */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}) {
  const btn =
    size === 'sm'
      ? 'h-8 w-8'
      : 'h-10 w-10';
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <div className="inline-flex items-center gap-0.5 rounded-tile border border-ink-200 bg-white p-0.5">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`flex ${btn} items-center justify-center rounded-[6px] text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30`}
      >
        <Minus className={dim} strokeWidth={2.6} />
      </button>
      <span className={`min-w-6 text-center font-extrabold tabular-nums text-ink-900 ${size === 'sm' ? 'text-sm' : 'text-[15px]'}`}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`flex ${btn} items-center justify-center rounded-[6px] bg-ink-900 text-white transition hover:bg-mayford-600 disabled:opacity-30`}
      >
        <Plus className={dim} strokeWidth={2.6} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------
   Feedback
------------------------------------------------------------------ */
export function Alert({
  tone = 'green',
  children,
  icon: Icon,
}: {
  tone?: 'green' | 'red' | 'orange' | 'info';
  children: ReactNode;
  icon?: LucideIcon;
}) {
  const tones: Record<string, string> = {
    green: 'bg-success-50 text-success-700 border-success-100',
    red: 'bg-danger-50 text-danger-700 border-danger-100',
    orange: 'bg-warning-50 text-warning-700 border-warning-100',
    info: 'bg-info-50 text-info-700 border-info-100',
  };
  return (
    <div className={`mb-4 flex items-start gap-2.5 rounded-tile border px-4 py-3 text-sm font-semibold ${tones[tone]}`}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Spinner({ className = 'py-20' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-ink-200 border-t-mayford-600" />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-tile ${className}`} />;
}

/** Card-shaped placeholder used while menu/pages load. */
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
      <Skeleton className="h-44 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-24 rounded-tile" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-card border border-dashed border-ink-200 bg-white px-6 py-16 text-center ${className}`}>
      <span className="text-ink-300">
        {(() => {
          const Icon = icon;
          return <Icon className="h-7 w-7" strokeWidth={1.7} />;
        })()}
      </span>
      <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-ink-900">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------
   Overlays — bottom sheet on mobile, centred dialog on desktop
------------------------------------------------------------------ */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-pop flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-xl bg-white sm:rounded-card`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-ink-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-tile text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-ink-100 bg-white px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Stars + brand marks
------------------------------------------------------------------ */
export function Stars({ n, className = '', size = 'md' }: { n: number; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  const dim = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${dim} ${i < full ? 'fill-ink-900 text-ink-900' : 'fill-ink-200 text-ink-200'}`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/** Facebook glyph drawn in lucide's stroke style (brand icons left lucide). */
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

/* ------------------------------------------------------------------
   Admin table helpers
------------------------------------------------------------------ */
export function EmptyRow({ colSpan, text = 'No records found.' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-ink-500">
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
      className="rounded-[6px] px-2.5 py-1.5 text-xs font-semibold text-danger-700 transition hover:bg-danger-600 hover:text-white"
    >
      {label}
    </button>
  );
}

/** Page title block for admin screens. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-6 w-6 text-ink-900" strokeWidth={1.8} />}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-900 md:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Small hook: value that persists while the app is open (used for toasts). */
export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v), setOn] as const;
}

/* ------------------------------------------------------------------
   Admin surfaces — panels and data tables
------------------------------------------------------------------ */
export function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-card border border-ink-200 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {Icon && <IconTile icon={Icon} tone="light" size="sm" />}
            <div>
              {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

/** Sticky-header data table shell used by every admin list. */
export function DataTable({
  head,
  children,
  minWidth = 'min-w-[880px]',
}: {
  head: ReactNode;
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-left text-[13.5px] ${minWidth}`}>
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
            {head}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-extrabold ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-ink-600 ${className}`}>{children}</td>;
}

/** Coloured status pill for order/booking states. */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, 'neutral' | 'warning' | 'info' | 'success' | 'danger' | 'brand'> = {
    Pending: 'warning',
    Preparing: 'info',
    Ready: 'brand',
    Completed: 'success',
    Cancelled: 'danger',
  };
  return <Badge tone={map[status] || 'neutral'}>{status}</Badge>;
}
