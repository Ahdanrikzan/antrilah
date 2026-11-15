import { useEffect, useId, useRef } from 'react';
import { cx } from '../lib/utils';

interface DialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  tone?: 'paper' | 'pink' | 'yellow';
  size?: 'md' | 'lg' | 'xl';
  /** CSS selector for the control that should receive focus when the dialog opens. */
  initialFocus?: string;
}

const SIZES = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
} as const;

/**
 * Accessible modal: labelled by its heading, closes on Escape or backdrop click,
 * traps Tab inside the panel and restores focus to the trigger on close.
 */
export function Dialog({
  open,
  title,
  children,
  actions,
  onClose,
  tone = 'paper',
  size = 'md',
  initialFocus,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);

    const preferred = initialFocus ? panel?.querySelector<HTMLElement>(initialFocus) : null;
    (preferred ?? focusables()[0] ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, initialFocus]);

  if (!open) return null;

  const tones = {
    paper: 'bg-paper',
    pink: 'bg-pink/20',
    yellow: 'bg-yellow/30',
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'max-h-[calc(100dvh-1.5rem)] w-full animate-pop overflow-y-auto rounded-2xl border-3 border-ink p-5 shadow-hard sm:p-6',
          SIZES[size],
          tones[tone],
        )}
      >
        <h2 id={titleId} className="font-display text-xl font-black uppercase leading-tight tracking-tight">
          {title}
        </h2>
        <div className="mt-2 text-sm font-medium leading-relaxed text-ink/70">{children}</div>
        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
