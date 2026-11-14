import React, { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/utils';
import type { TicketStatus } from '../lib/db';

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

export type IconName =
  | 'queue'
  | 'chart'
  | 'data'
  | 'qr'
  | 'settings'
  | 'bolt'
  | 'check'
  | 'arrowRight'
  | 'plus'
  | 'clock'
  | 'users'
  | 'ticket'
  | 'download'
  | 'upload'
  | 'trash'
  | 'history'
  | 'close'
  | 'sparkles'
  | 'link';

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  queue: (
    <>
      <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
      <rect x="3" y="11.5" width="12" height="4.5" rx="1.5" />
      <rect x="3" y="19" width="7" height="2" rx="1" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  check: <path d="m4 12 5 5L20 6" />,
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
      <path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.7c2.2.7 3.5 2.3 3.5 4.3" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9V6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V15a3 3 0 0 0 0-6Z" />
      <path d="M14 5v14" strokeDasharray="2 3" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11" />
      <path d="m7.5 10 4.5 4.5L16.5 10" />
      <path d="M4 19h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 14V3" />
      <path d="M7.5 7 12 2.5 16.5 7" />
      <path d="M4 19h16" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 3-6.5" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4.5l3 1.8" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  sparkles: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0L5.5 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cx('h-4 w-4', className)}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Buttons                                                                   */
/* -------------------------------------------------------------------------- */

type Variant = 'primary' | 'yellow' | 'pink' | 'lime' | 'blue' | 'violet' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-cream hover:bg-ink/90',
  yellow: 'bg-yellow text-ink hover:bg-yellow/90',
  pink: 'bg-pink text-ink hover:bg-pink/90',
  lime: 'bg-lime text-ink hover:bg-lime/90',
  blue: 'bg-blue text-cream hover:bg-blue/90',
  violet: 'bg-violet text-ink hover:bg-violet/90',
  outline: 'bg-paper text-ink hover:bg-cream',
  ghost: 'bg-transparent border-transparent shadow-none text-ink hover:bg-ink/5',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3.5 text-base gap-2.5 rounded-xl',
};

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  target?: string;
  rel?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  target,
  rel,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cx(
    'inline-flex select-none items-center justify-center border-3 border-ink font-bold uppercase tracking-wide transition-all duration-150 shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:opacity-40',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={classes}
        onClick={rest.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
        title={rest.title}
        aria-label={rest['aria-label']}
      >
        {children}
      </a>
    );
  }

  const { type = 'button', ...buttonRest } = rest;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Surfaces                                                                  */
/* -------------------------------------------------------------------------- */

export function Panel({
  children,
  className,
  flat = false,
}: {
  children: React.ReactNode;
  className?: string;
  flat?: boolean;
}) {
  return (
    <div className={cx('rounded-2xl border-3 border-ink bg-paper', flat ? '' : 'shadow-hard', className)}>
      {children}
    </div>
  );
}

export function Tag({
  children,
  className,
  tone = 'paper',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'paper' | 'yellow' | 'pink' | 'lime' | 'blue' | 'violet' | 'orange' | 'ink';
}) {
  const tones: Record<string, string> = {
    paper: 'bg-paper text-ink',
    yellow: 'bg-yellow text-ink',
    pink: 'bg-pink text-ink',
    lime: 'bg-lime text-ink',
    blue: 'bg-blue text-cream',
    violet: 'bg-violet text-ink',
    orange: 'bg-orange text-ink',
    ink: 'bg-ink text-cream',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cx('flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-ink/60', className)}>
      <span aria-hidden className="h-2 w-2 rounded-full border-2 border-ink bg-pink" />
      {children}
    </p>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#/" className="group inline-flex items-center gap-2.5" aria-label="Antrilah home">
      <span className="grid h-9 w-9 place-items-center rounded-lg border-3 border-ink bg-yellow shadow-hard-sm transition-transform duration-200 group-hover:-rotate-6">
        <span className="font-display text-lg font-black leading-none lowercase">a</span>
      </span>
      {!compact && (
        <span className="font-display text-xl font-black lowercase tracking-tight">antrilah</span>
      )}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Forms                                                                     */
/* -------------------------------------------------------------------------- */

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/70">{children}</span>
      {hint && <span className="text-[11px] font-medium normal-case tracking-normal text-ink/40">{hint}</span>}
    </span>
  );
}

const fieldClasses =
  'w-full rounded-xl border-3 border-ink bg-paper px-4 py-3 text-base font-medium text-ink placeholder:text-ink/35 transition-shadow focus:shadow-hard-sm focus:outline-none';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldClasses, className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldClasses, 'min-h-[92px] resize-y', className)} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(fieldClasses, 'appearance-none pr-10', className)}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <Label hint={hint}>{label}</Label>
      {children}
    </label>
  );
}

export function Checkbox({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-xl border-2 border-ink/20 bg-paper p-3 transition-colors hover:border-ink/50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
      />
      <span>
        <span className="block text-xs font-black uppercase tracking-[0.1em]">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-ink/55">{hint}</span>}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status                                                                    */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<TicketStatus, { label: string; tone: string }> = {
  waiting: { label: 'Waiting', tone: 'bg-yellow text-ink' },
  serving: { label: 'Now serving', tone: 'bg-lime text-ink' },
  done: { label: 'Served', tone: 'bg-blue text-cream' },
  skipped: { label: 'Skipped', tone: 'bg-orange text-ink' },
  cancelled: { label: 'Cancelled', tone: 'bg-ink/10 text-ink/70' },
};

export function StatusPill({ status, className }: { status: TicketStatus; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
        style.tone,
        className,
      )}
    >
      {status === 'serving' && <span className="h-1.5 w-1.5 animate-blink rounded-full bg-ink" />}
      {style.label}
    </span>
  );
}

export function LiveDot({ label = 'Live' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
      <span aria-hidden className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-lime ring-2 ring-ink" />
      </span>
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Data display                                                              */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  sub,
  tone = 'bg-paper',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  icon?: IconName;
}) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-2xl border-3 border-ink p-4 shadow-hard-sm transition-transform duration-200 hover:-translate-y-0.5',
        tone,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="meta">{label}</p>
        {icon && (
          <span aria-hidden className="rounded-md border-2 border-ink/20 p-1 text-ink/50">
            <Icon name={icon} className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-4xl font-black leading-none tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] font-semibold leading-snug text-ink/50">{sub}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                      */
/* -------------------------------------------------------------------------- */

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: IconName;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  label = 'Sections',
}: {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
  label?: string;
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const index = items.findIndex((item) => item.id === value);
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;
    event.preventDefault();
    onChange(items[next].id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cx('-mx-1 flex gap-1 overflow-x-auto px-1 no-scrollbar', className)}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-lg border-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-150',
              active
                ? 'border-ink bg-ink text-cream shadow-hard-sm'
                : 'border-transparent text-ink/50 hover:bg-ink/5 hover:text-ink',
            )}
          >
            {item.icon && <Icon name={item.icon} className="h-3.5 w-3.5" />}
            {item.label}
            {typeof item.count === 'number' && item.count > 0 && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none',
                  active ? 'bg-yellow text-ink' : 'bg-yellow text-ink',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading & empty states                                                    */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton', className)} />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/5" />
          </div>
          <Skeleton className="h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

function EmptyIllustration({ kind }: { kind: 'ticket' | 'chart' | 'data' }) {
  return (
    <svg viewBox="0 0 160 104" aria-hidden className="mx-auto h-24 w-40">
      <rect x="18" y="24" width="96" height="60" rx="10" fill="#FFFDF7" stroke="#111111" strokeWidth="4" transform="rotate(-6 66 54)" />
      <rect x="34" y="16" width="96" height="60" rx="10" fill="#FFD93D" stroke="#111111" strokeWidth="4" transform="rotate(4 82 46)" />
      <path d="M50 36h64M50 48h40M50 60h24" stroke="#111" strokeWidth="4" strokeLinecap="round" transform="rotate(4 82 46)" />
      {kind === 'chart' && (
        <g stroke="#111111" strokeWidth="4" strokeLinecap="round">
          <path d="M118 88v-18M130 88V58M142 88V70" />
        </g>
      )}
      {kind === 'data' && (
        <g stroke="#111111" strokeWidth="4">
          <ellipse cx="126" cy="64" rx="16" ry="6" fill="#C8F169" />
          <path d="M110 64v16c0 3.3 7.2 6 16 6s16-2.7 16-6V64" fill="#C8F169" />
        </g>
      )}
      {kind === 'ticket' && (
        <g transform="translate(112 62)">
          <circle cx="18" cy="18" r="18" fill="#FF5C8A" stroke="#111111" strokeWidth="4" />
          <path d="m10 18 6 6 11-12" stroke="#111111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}
    </svg>
  );
}

export function EmptyState({
  title,
  copy,
  actions,
  kind = 'ticket',
  className,
}: {
  title: string;
  copy: string;
  actions?: React.ReactNode;
  kind?: 'ticket' | 'chart' | 'data';
  className?: string;
}) {
  return (
    <div className={cx('px-6 py-10 text-center sm:py-14', className)}>
      <EmptyIllustration kind={kind} />
      <h3 className="mt-4 font-display text-xl font-black uppercase leading-tight tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-ink/60">{copy}</p>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Motion & decoration                                                       */
/* -------------------------------------------------------------------------- */

/** Fade + rise on scroll. Falls back to visible when IntersectionObserver is missing. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cx(
        'transition-all duration-700 ease-out',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Marquee({
  items,
  className,
  reverse = false,
}: {
  items: string[];
  className?: string;
  reverse?: boolean;
}) {
  const row = [...items, ...items];
  return (
    <div className={cx('overflow-hidden border-y-3 border-ink bg-yellow py-3', className)}>
      <div
        className={cx('flex w-max animate-marquee items-center', reverse && '[animation-direction:reverse]')}
      >
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-6 whitespace-nowrap px-6 text-xs font-black uppercase tracking-[0.24em]"
          >
            {item}
            <span aria-hidden className="text-sm">
              ✱
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Star({ className, color = '#FFD93D' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <path
        d="M50 2l9.6 33.2L93 26.5 67.2 49.4 88.9 78 55.1 68.6 50 98 44.9 68.6 11.1 78l21.7-28.6L7 26.5l33.4 8.7L50 2z"
        fill={color}
        stroke="#111111"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
