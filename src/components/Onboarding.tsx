import { useEffect, useState } from 'react';
import { Button, Icon, Star } from './ui';
import { Dialog } from './Dialog';
import { cx } from '../lib/utils';

const STEPS = [
  {
    headline: 'Welcome to your queue',
    copy: 'This whole system runs in your browser: tickets, settings and history live on this device. No account, no server, no invoices — and it keeps working when the internet does not.',
    tone: 'bg-yellow',
    icon: 'ticket' as const,
    note: 'Your data never leaves this device.',
  },
  {
    headline: 'Make it yours',
    copy: 'Set your business name, queue prefix and average service time. Those details shape the customer page and the wait estimates customers see.',
    tone: 'bg-lime',
    icon: 'settings' as const,
    note: 'Takes about a minute.',
  },
  {
    headline: 'Open the line',
    copy: 'Share the join link or print the QR code for your counter. Customers take a number and follow their own ticket live; you call them from the queue tab.',
    tone: 'bg-pink',
    icon: 'qr' as const,
    note: 'Works on any phone — nothing to install.',
  },
];

export function OnboardingDialog({
  open,
  onClose,
  onOpenSettings,
  onOpenJoin,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenJoin: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      title={current.headline}
      tone="paper"
      onClose={onClose}
      actions={
        <>
          {step > 0 && (
            <Button size="sm" variant="outline" onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
          )}
          {last ? (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onOpenJoin();
              }}
            >
              See the customer page
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((value) => value + 1)}>
              Next
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Button>
          )}
        </>
      }
    >
      <div className={cx('-mt-1 mb-4 flex items-start gap-3 rounded-xl border-2 border-ink p-3', current.tone)}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-ink bg-paper">
          <Icon name={current.icon} className="h-4 w-4" />
        </span>
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-ink/70">
          <Star className="h-3.5 w-3.5" color="#FFFDF7" />
          {current.note}
        </p>
      </div>

      <p className="text-sm font-medium leading-relaxed text-ink/70">{current.copy}</p>

      <div className="mt-4 flex items-center gap-1.5" aria-hidden>
        {STEPS.map((_, index) => (
          <span
            key={index}
            className={cx(
              'h-1.5 flex-1 rounded-full border border-ink transition-colors',
              index <= step ? 'bg-ink' : 'bg-ink/10',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35">
        Step {step + 1} of {STEPS.length}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {step === 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
          >
            Open settings →
          </Button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40 underline decoration-2 underline-offset-2 hover:text-ink"
        >
          Skip the tour
        </button>
      </div>
    </Dialog>
  );
}
