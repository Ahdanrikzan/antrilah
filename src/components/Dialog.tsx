import { useEffect, useId, useRef } from 'react';
import { cx } from '../lib/utils';

interface DialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  tone?: 'paper' | 'pink' | 'yellow';
}

/**
 * Accessible modal: labelled by its heading, closes on Escape or backdrop click,
 * traps Tab inside the panel and restores focus to the trigger on close.
 */
export function Dialog({ open, title, children, actions, onClose, tone = 'paper' }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = Array.from(
      panel?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
  }, [open, onClose]);

  if (!open) return null;

  const tones = {
    paper: 'bg-paper',
    pink: 'bg-pink/20',
    yellow: 'bg-yellow/30',
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'w-full max-w-md animate-pop rounded-2xl border-3 border-ink p-6 shadow-hard',
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
