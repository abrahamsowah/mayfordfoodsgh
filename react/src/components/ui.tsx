import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Reveal } from './motion';

export function Btn({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-flame-500 px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-flame-600 hover:shadow-lg disabled:pointer-events-none disabled:opacity-60 ${className}`}
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
  variant?: 'primary' | 'ghost' | 'dark' | 'white';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-flame-500 text-white shadow-glow hover:bg-flame-600',
    ghost: 'border-2 border-white/70 text-white hover:border-white hover:bg-white/10',
    dark: 'bg-mayford-700 text-white hover:bg-mayford-800',
    white: 'bg-white text-mayford-700 hover:bg-mayford-50 shadow-lg',
  };
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${variants[variant]} ${className}`}
    >
      {children}
    </a>
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
    default: 'bg-[#fafaf9]',
    white: 'bg-white',
    tint: 'bg-mayford-50/60',
  };
  return (
    <section id={id} className={`py-16 md:py-24 ${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

/** Small uppercase kicker above section titles (modern section headers) */
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={`mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.25em] ${
        light ? 'text-flame-300' : 'text-flame-600'
      }`}
    >
      <span className={`h-px w-8 ${light ? 'bg-flame-300' : 'bg-flame-500'}`} />
      {children}
      <span className={`h-px w-8 ${light ? 'bg-flame-300' : 'bg-flame-500'}`} />
    </p>
  );
}

export function SectionTitle({
  children,
  light = false,
  center = true,
}: {
  children: ReactNode;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <h2
      className={`text-3xl font-extrabold tracking-tight md:text-[2.75rem] md:leading-[1.1] ${
        light ? 'text-white' : 'text-stone-900'
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
  index,
}: {
  eyebrow: string;
  title: ReactNode;
  text?: ReactNode;
  light?: boolean;
  index?: string;
}) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl">
      {index && (
        <span
          className={`pointer-events-none select-none text-center text-6xl font-extrabold leading-none ${
            light ? 'outline-text-light' : 'outline-text'
          }`}
          aria-hidden="true"
        >
          {index}
        </span>
      )}
      <div className="-mt-4">
        <Eyebrow light={light}>{eyebrow}</Eyebrow>
        <SectionTitle light={light}>{title}</SectionTitle>
        {text && (
          <p className={`mt-4 text-base leading-relaxed md:text-lg ${light ? 'text-stone-300' : 'text-stone-600'}`}>
            {text}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/** Small hero band used on inner pages (modern gradient over the photo) */
export function HeroSmall({ image, title, text }: { image: string; title: string; text?: string }) {
  return (
    <section className="noise relative flex h-72 items-center justify-center overflow-hidden md:h-96">
      <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-mayford-900/80 via-mayford-900/50 to-stone-950/80" />
      <div className="absolute inset-0 bg-dots-dark opacity-40" />
      <div className="relative z-10 max-w-3xl px-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-5xl">{title}</h1>
        {text && <p className="mx-auto mt-4 max-w-2xl text-base text-stone-200 md:text-lg">{text}</p>}
        <div className="kente-stripe mx-auto mt-6 h-1 w-24 rounded-full" />
      </div>
    </section>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-flame-500 focus:ring-4 focus:ring-flame-500/15 ${className}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-flame-500 focus:ring-4 focus:ring-flame-500/15 ${className}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-flame-500 focus:ring-4 focus:ring-flame-500/15 ${className}`}
    />
  );
}

export function Field({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      {label && <span className="mb-1.5 block text-sm font-bold text-stone-700">{label}</span>}
      {children}
    </label>
  );
}

export function Alert({ tone = 'green', children }: { tone?: 'green' | 'red' | 'orange'; children: ReactNode }) {
  const tones = {
    green: 'bg-green-50 text-green-800 border-green-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    orange: 'bg-flame-50 text-flame-700 border-flame-200',
  };
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${tones[tone]}`}>{children}</div>;
}

import { Star as StarIcon } from 'lucide-react';

/** Facebook "f" glyph in lucide's stroke style (brand icons were removed from lucide). */
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
          className={`h-[1.05em] w-[1.05em] ${i < full ? 'fill-flame-500 text-flame-500' : 'fill-stone-300 text-stone-300'}`}
        />
      ))}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-mayford-600 border-t-transparent" />
    </div>
  );
}

export function EmptyRow({ colSpan, text = 'No records found.' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-stone-500">
        {text}
      </td>
    </tr>
  );
}

/** Delete button that asks for confirmation (like the old onclick=confirm()) */
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
      className="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
    >
      {label}
    </button>
  );
}

/** Content card with hover lift (the modern replacement for .card) */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-stone-900/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift hover:ring-mayford-200 ${className}`}
    >
      {children}
    </div>
  );
}

/** Image that zooms slightly on hover (used inside Card) */
export function ZoomImg({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className="group/img overflow-hidden">
      <img src={src} alt={alt} className={`${className} w-full object-cover transition duration-500 group-hover/img:scale-105`} />
    </div>
  );
}
