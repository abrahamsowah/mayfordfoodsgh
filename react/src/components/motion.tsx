import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Fades content up when it scrolls into view.
 *
 * Robustness rules (content must never be stuck invisible):
 *  - anything already in view on mount is shown immediately, no animation,
 *  - only elements below the fold are hidden and then revealed on scroll,
 *  - a watchdog timer reveals everything that is still hidden after 2.5s,
 *  - reduced-motion and print are handled in CSS.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.classList.add('is-visible');

    // Already visible (or no observer support): show immediately.
    const rect = el.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.92;
    if (!belowFold || typeof IntersectionObserver === 'undefined') {
      show();
      return;
    }

    el.classList.add('reveal-hidden');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show();
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);

    // Safety net: never leave content invisible.
    const watchdog = window.setTimeout(show, 2500);

    return () => {
      io.disconnect();
      window.clearTimeout(watchdog);
    };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ ['--reveal-delay' as string]: `${delay}ms` }}>
      {children}
    </div>
  );
}

/**
 * Animated number counter for stat strips.
 * Falls back to the final value when observers are unavailable.
 */
export function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof IntersectionObserver === 'undefined' || reduceMotion) {
      setDisplay(value);
      return;
    }

    const run = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);

    // Safety net so a stat never sits at zero (screenshots, printing, odd viewports).
    const watchdog = window.setTimeout(run, 2600);

    return () => {
      io.disconnect();
      window.clearTimeout(watchdog);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
