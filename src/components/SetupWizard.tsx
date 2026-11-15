import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button, Icon, Input, Select } from './ui';
import { Dialog } from './Dialog';
import { useCopy } from '../lib/hooks';
import { formatCode } from '../lib/queue';
import { DEFAULT_SETTINGS, type Settings } from '../lib/db';
import { cx, joinUrl } from '../lib/utils';

const STEPS = [
  {
    id: 'business',
    short: 'Business',
    eyebrow: 'Step 1 · Business',
    title: 'Name your business',
    copy:
      'These details appear on the join page and on every customer ticket. Nothing is sent anywhere — they are stored in this browser.',
  },
  {
    id: 'numbering',
    short: 'Numbers',
    eyebrow: 'Step 2 · Numbering',
    title: 'Choose your ticket numbers',
    copy:
      'Pick the prefix printed before each number and how long a customer usually takes. Numbers restart at 001 every local day.',
  },
  {
    id: 'day',
    short: 'Daily',
    eyebrow: 'Step 3 · Daily queue',
    title: 'Shape the working day',
    copy:
      'Opening hours are shown to customers. The optional automations tidy up stale tickets while this dashboard stays open.',
  },
  {
    id: 'qr',
    short: 'QR',
    eyebrow: 'Step 4 · Check-in',
    title: 'Share the QR check-in',
    copy:
      'Print the code or send the link. Customers scan it, type a name and get a live ticket — no app, no account, no sign-up.',
  },
] as const;

const AUTO_MINUTES = [0, 10, 15, 20, 30, 45, 60];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function cleanPrefix(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'A';
}

/** Small accessible tooltip: opens on hover, focus and tap. */
function Hint({ tip }: { tip: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Help: ${tip}`}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        className="grid h-5 w-5 place-items-center rounded-full border-2 border-ink/30 text-[9px] font-black text-ink/50 transition-colors hover:border-ink hover:text-ink"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute right-0 top-7 z-20 w-52 max-w-[70vw] rounded-lg border-2 border-ink bg-ink p-2 text-left text-[10px] font-semibold normal-case leading-snug tracking-normal text-cream shadow-hard-sm"
        >
          {tip}
        </span>
      )}
    </span>
  );
}

function WizardField({
  id,
  label,
  tip,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  tip?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/60">
          {label}
        </label>
        {tip && <Hint tip={tip} />}
      </div>
      {children}
      {hint && <p className="mt-1 text-[10px] font-medium leading-relaxed text-ink/40">{hint}</p>}
    </div>
  );
}

export function SetupWizard({
  open,
  settings,
  onClose,
  onFinish,
  onQrSeen,
}: {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onFinish: (next: Settings) => Promise<void> | void;
  onQrSeen?: () => void;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState('');
  const [copied, copy] = useCopy();
  const wasOpen = useRef(false);
  const qrSeen = useRef(false);

  // Reset only when the wizard opens, not on every settings refresh.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(settings);
      setStep(0);
      setBusy(false);
      setError('');
      qrSeen.current = false;
    }
    wasOpen.current = open;
  }, [open, settings]);

  const url = useMemo(() => joinUrl(draft.qrBaseUrl), [draft.qrBaseUrl]);
  const prefix = cleanPrefix(draft.prefix);
  const wait = Math.max(1, Number(draft.avgServiceMinutes) || DEFAULT_SETTINGS.avgServiceMinutes) * 3;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const nameOk = draft.businessName.trim().length > 0;
  const urlOk = !draft.qrBaseUrl.trim() || /^https?:\/\/\S+$/i.test(draft.qrBaseUrl.trim());
  const canContinue = step === 0 ? nameOk : step === 3 ? urlOk : true;

  useEffect(() => {
    if (open && step === 3 && !qrSeen.current) {
      qrSeen.current = true;
      onQrSeen?.();
    }
  }, [open, step, onQrSeen]);

  useEffect(() => {
    if (!open || step !== 3) return;
    let alive = true;
    setQrError('');
    QRCode.toDataURL(url, {
      margin: 1,
      width: 640,
      color: { dark: '#111111', light: '#FFFDF7' },
    })
      .then((data) => {
        if (alive) setQr(data);
      })
      .catch((err) => {
        console.error('QR generation failed', err);
        if (alive) setQrError('Could not render the QR code in this browser.');
      });
    return () => {
      alive = false;
    };
  }, [open, step, url]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function download() {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qr;
    link.download = 'antrilah-queue-qr.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function goNext() {
    if (!canContinue) return;
    if (!last) {
      setStep((value) => value + 1);
      return;
    }
    void finish();
  }

  async function finish() {
    if (!canContinue || busy) return;
    setBusy(true);
    setError('');
    const next: Settings = {
      ...draft,
      id: 'app',
      businessName: draft.businessName.trim(),
      serviceLabel: draft.serviceLabel.trim() || DEFAULT_SETTINGS.serviceLabel,
      tagline: draft.tagline.trim(),
      openHours: draft.openHours.trim() || DEFAULT_SETTINGS.openHours,
      welcomeNote: draft.welcomeNote.trim() || DEFAULT_SETTINGS.welcomeNote,
      qrBaseUrl: draft.qrBaseUrl.trim(),
      prefix,
      avgServiceMinutes: clamp(Number(draft.avgServiceMinutes) || DEFAULT_SETTINGS.avgServiceMinutes, 1, 180),
      autoSkipMinutes: clamp(Number(draft.autoSkipMinutes) || 0, 0, 600),
      autoCompleteMinutes: clamp(Number(draft.autoCompleteMinutes) || 0, 0, 600),
    };
    try {
      await onFinish(next);
    } catch (err) {
      console.error('Antrilah: setup save failed', err);
      setError('Could not save your setup — local storage may be unavailable. Your data is unchanged.');
      setBusy(false);
    }
  }

  const stepButton = (index: number) => (
    <button
      type="button"
      aria-current={index === step ? 'step' : undefined}
      disabled={index >= step}
      onClick={() => index < step && setStep(index)}
      className={cx(
        'w-full rounded-md border-2 border-ink px-1 py-1.5 text-[9px] font-black uppercase tracking-[0.06em] transition-colors',
        index === step ? 'bg-ink text-cream' : index < step ? 'bg-lime text-ink' : 'bg-paper text-ink/35',
      )}
    >
      {index + 1}. {STEPS[index].short}
    </button>
  );

  return (
    <Dialog
      open={open}
      title={current.title}
      size="xl"
      initialFocus="#setup-name"
      onClose={onClose}
      actions={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40 underline decoration-2 underline-offset-2 hover:text-ink"
          >
            Skip setup for now
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStep((value) => value - 1)}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={goNext} disabled={!canContinue || busy}>
              {busy ? 'Saving…' : last ? 'Finish setup' : 'Continue'}
              {!busy && !last && <Icon name="arrowRight" className="h-3.5 w-3.5" />}
              {!busy && last && <Icon name="check" className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40">
              Step {step + 1} of {STEPS.length} · about 2 minutes
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]">
              <Icon name="bolt" className="h-3 w-3" /> No sign-up
            </span>
          </div>

          <ol className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Setup steps">
            {STEPS.map((item, index) => (
              <li key={item.id}>{stepButton(index)}</li>
            ))}
          </ol>

          <p className="text-xs font-medium leading-relaxed text-ink/60 sm:text-sm">{current.copy}</p>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border-2 border-ink bg-pink/30 p-2.5 text-[11px] font-semibold">
              {error}
            </p>
          )}

          <form
            className="mt-4 grid gap-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              goNext();
            }}
          >
            {step === 0 && (
              <>
                <WizardField
                  id="setup-name"
                  label="Business name"
                  tip="This is the headline customers see on the join page and their ticket. You can change it later in Settings."
                >
                  <Input
                    id="setup-name"
                    value={draft.businessName}
                    onChange={(event) => update('businessName', event.target.value)}
                    maxLength={60}
                    placeholder="Corner Café"
                    aria-invalid={!nameOk}
                    autoComplete="organization"
                  />
                </WizardField>
                {!nameOk && (
                  <p className="text-[10px] font-semibold text-ink/50" aria-live="polite">
                    Enter the name your customers should see.
                  </p>
                )}
                <WizardField
                  id="setup-label"
                  label="Service label"
                  tip="The desk or counter customers should approach. Shown next to the queue name."
                  hint="Examples: Front desk, Counter 2, Consultation room."
                >
                  <Input
                    id="setup-label"
                    value={draft.serviceLabel}
                    onChange={(event) => update('serviceLabel', event.target.value)}
                    maxLength={40}
                    placeholder="Front desk"
                  />
                </WizardField>
                <WizardField
                  id="setup-tagline"
                  label="Tagline"
                  tip="A short line under the business name. Keep it friendly and specific."
                  hint="Optional."
                >
                  <Input
                    id="setup-tagline"
                    value={draft.tagline}
                    onChange={(event) => update('tagline', event.target.value)}
                    maxLength={120}
                    placeholder="Walk in, take a number, get on with your day."
                  />
                </WizardField>
              </>
            )}

            {step === 1 && (
              <>
                <WizardField
                  id="setup-prefix"
                  label="Queue prefix"
                  tip="Letters or numbers printed before the ticket number. Keep it short so it reads well on a phone."
                  hint={`Your first ticket will be ${formatCode(prefix, 1)}.`}
                >
                  <Input
                    id="setup-prefix"
                    value={draft.prefix}
                    onChange={(event) => update('prefix', cleanPrefix(event.target.value))}
                    maxLength={3}
                    placeholder="A"
                    className="font-mono uppercase"
                  />
                </WizardField>
                <WizardField
                  id="setup-service"
                  label="Average service time"
                  tip="Drives the estimated wait on the ticket page. It is an average, not a limit — nothing is auto-closed by this number."
                  hint="Minutes per customer, between 1 and 180."
                >
                  <div className="flex items-center gap-3">
                    <Input
                      id="setup-service"
                      type="number"
                      min={1}
                      max={180}
                      value={draft.avgServiceMinutes}
                      onChange={(event) => update('avgServiceMinutes', Number(event.target.value))}
                      className="w-24"
                    />
                    <span className="text-[11px] font-semibold text-ink/50">
                      ≈ {wait} min for 3 people ahead
                    </span>
                  </div>
                </WizardField>
                <div className="rounded-xl border-2 border-ink/15 bg-cream/70 p-3 text-[11px] font-medium leading-relaxed text-ink/55">
                  Numbers restart at <strong className="font-black text-ink">001</strong> at local midnight.
                  History from previous days stays available read-only in the dashboard.
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <WizardField
                  id="setup-hours"
                  label="Opening hours"
                  tip="Free text shown to customers. It does not close the queue automatically."
                  hint="Keep it short, for example Mon–Fri · 9:00 – 17:00."
                >
                  <Input
                    id="setup-hours"
                    value={draft.openHours}
                    onChange={(event) => update('openHours', event.target.value)}
                    maxLength={60}
                    placeholder="Mon–Sat · 9:00 – 18:00"
                  />
                </WizardField>
                <WizardField
                  id="setup-skip"
                  label="Skip no-shows after"
                  tip="While the dashboard is open, waiting tickets older than this are marked skipped so the line keeps moving. Off by default."
                >
                  <Select
                    id="setup-skip"
                    value={String(draft.autoSkipMinutes)}
                    onChange={(event) => update('autoSkipMinutes', Number(event.target.value))}
                  >
                    {AUTO_MINUTES.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes === 0 ? 'Off — never auto-skip' : `${minutes} minutes`}
                      </option>
                    ))}
                  </Select>
                </WizardField>
                <WizardField
                  id="setup-complete"
                  label="Finish serving after"
                  tip="While the dashboard is open, a ticket at the counter longer than this is completed automatically. Off by default."
                >
                  <Select
                    id="setup-complete"
                    value={String(draft.autoCompleteMinutes)}
                    onChange={(event) => update('autoCompleteMinutes', Number(event.target.value))}
                  >
                    {AUTO_MINUTES.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes === 0 ? 'Off — close tickets manually' : `${minutes} minutes`}
                      </option>
                    ))}
                  </Select>
                </WizardField>
                <div className="rounded-xl border-2 border-ink/15 bg-violet/30 p-3 text-[11px] font-medium leading-relaxed text-ink/60">
                  Both rules only run while this dashboard tab is open. Nothing leaves the device and no
                  notification service is involved.
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <WizardField
                  id="setup-url"
                  label="Public URL for QR codes"
                  tip="The address where this app is hosted. Leave it empty while testing locally; set it before printing QR codes."
                  hint="Optional — press Finish with it empty to use the current address."
                >
                  <Input
                    id="setup-url"
                    value={draft.qrBaseUrl}
                    onChange={(event) => update('qrBaseUrl', event.target.value)}
                    placeholder="https://queue.yourbusiness.com"
                    inputMode="url"
                    aria-invalid={!urlOk}
                  />
                </WizardField>
                {!urlOk && (
                  <p role="alert" className="text-[10px] font-semibold text-ink/60">
                    Use a full address starting with http:// or https://.
                  </p>
                )}
                <div className="grid gap-2 rounded-xl border-2 border-ink/15 bg-cream/70 p-3 text-[11px] font-medium leading-relaxed text-ink/60">
                  <p className="flex gap-2">
                    <span className="font-mono font-black text-ink">1</span>
                    Download the PNG and print it at the counter or door.
                  </p>
                  <p className="flex gap-2">
                    <span className="font-mono font-black text-ink">2</span>
                    Customers scan it and take a number on their own phone.
                  </p>
                  <p className="flex gap-2">
                    <span className="font-mono font-black text-ink">3</span>
                    Call the next person from the Queue tab.
                  </p>
                </div>
              </>
            )}

            <button type="submit" className="sr-only">
              {last ? 'Finish setup' : 'Continue'}
            </button>
          </form>
        </div>

        <aside className="min-w-0">
          <div className="lg:sticky lg:top-0">
            <p className="meta mb-2">Live preview</p>

            <div className="rounded-2xl border-3 border-ink bg-paper p-3.5 shadow-hard-sm">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-ink/45">
                  {draft.openHours.trim() || 'Opening hours'}
                </p>
                <span className="rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]">
                  Live
                </span>
              </div>
              <p className="mt-1.5 break-words font-display text-lg font-black uppercase leading-none tracking-tight">
                {draft.businessName.trim() || 'Your business'}
              </p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/55">
                {draft.tagline.trim() || 'Your tagline appears here.'}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg border-2 border-ink bg-ink p-1.5 text-cream">
                  <p className="text-[7px] font-black uppercase tracking-[0.08em] text-cream/60">Now serving</p>
                  <p className="font-mono text-sm font-black text-yellow">—</p>
                </div>
                <div className="rounded-lg border-2 border-ink bg-yellow p-1.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.08em] text-ink/60">Waiting</p>
                  <p className="font-mono text-sm font-black">3</p>
                </div>
                <div className="rounded-lg border-2 border-ink bg-paper p-1.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.08em] text-ink/60">Est. wait</p>
                  <p className="font-mono text-sm font-black">{wait}m</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border-2 border-dashed border-ink/40 bg-cream/60 p-3 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink/45">Your ticket</p>
                <p className="font-mono text-3xl font-black tracking-tight">{formatCode(prefix, 1)}</p>
                <p className="text-[10px] font-semibold text-ink/50">
                  {draft.serviceLabel.trim() || 'Front desk'} · 3 people ahead
                </p>
              </div>
            </div>

            {step === 3 && (
              <div className="mt-3 rounded-2xl border-3 border-ink bg-paper p-3.5 text-center shadow-hard-sm">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-ink/45">QR preview</p>
                {qr ? (
                  <img src={qr} alt="Preview of the QR code that opens the join page" className="mx-auto mt-2 h-40 w-40" />
                ) : (
                  <div className="mx-auto mt-2 grid h-40 w-40 place-items-center px-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-ink/40">
                    {qrError || 'Rendering QR…'}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={download} disabled={!qr}>
                    <Icon name="download" className="h-3.5 w-3.5" /> PNG
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copy(url)}>
                    {copied ? 'Copied ✓' : 'Copy link'}
                  </Button>
                </div>
                <p className="mt-2 break-all font-mono text-[9px] font-semibold leading-snug text-ink/45">{url}</p>
              </div>
            )}

            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/30">
              Preview only · saved when you finish
            </p>
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
