import { useEffect, useState } from 'react';
import { Button, Eyebrow, Logo, Marquee, Reveal, Star, Tag } from '../components/ui';
import { navigate } from '../lib/hooks';
import { cx } from '../lib/utils';

const NAV = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how' },
  { label: 'Open source', id: 'open-source' },
  { label: 'FAQ', id: 'faq' },
];

function scrollToSection(id: string) {
  if (window.location.hash && window.location.hash !== '#/') {
    navigate('/');
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b-3 border-ink bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button href="#/join" variant="outline" size="sm" className="hidden sm:inline-flex">
            Join a queue
          </Button>
          <Button href="#/admin" size="sm">
            Open dashboard
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroDisplay() {
  const [ticket, setTicket] = useState(14);
  useEffect(() => {
    const id = window.setInterval(() => setTicket((n) => (n >= 19 ? 14 : n + 1)), 4200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-x-6 -inset-y-4 -z-10 rounded-[36px] border-3 border-ink bg-pink/70" />

      <div className="animate-float rounded-2xl border-3 border-ink bg-ink p-5 text-cream shadow-hard-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cream/50">Counter 01</p>
            <p className="mt-1 font-display text-sm font-black uppercase tracking-wide">Your turn</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" /> Live
          </span>
        </div>

        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-cream/50">Now serving</p>
        <p
          key={ticket}
          className="animate-pop font-mono text-[64px] font-black leading-none tracking-tighter text-yellow sm:text-[76px]"
        >
          A-{String(ticket).padStart(3, '0')}
        </p>
        <p className="mt-1 text-sm font-medium text-cream/60">Maya R. · called 2 min ago</p>

        <div className="mt-5 grid grid-cols-3 divide-x-2 divide-cream/15 border-t-2 border-cream/15 pt-4 text-center">
          {[
            ['Waiting', '7'],
            ['Avg wait', '9m'],
            ['Served', '34'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="font-mono text-2xl font-black tabular-nums">{value}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cream/45">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -right-3 -top-7 rotate-6 rounded-xl border-3 border-ink bg-lime px-3 py-2 shadow-hard-sm sm:-right-8">
        <p className="text-[10px] font-black uppercase tracking-[0.14em]">Your ticket</p>
        <p className="font-mono text-xl font-black leading-none">A-017</p>
        <p className="text-[10px] font-semibold text-ink/60">next up · 6 min</p>
      </div>

      <div className="absolute -bottom-8 -left-2 -rotate-6 rounded-xl border-3 border-ink bg-yellow px-3 py-2 shadow-hard-sm sm:-left-8">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
          <span aria-hidden>⬒</span> Scan to join
        </p>
        <div className="mt-1 flex gap-1">
          {[3, 1, 2, 3, 1, 2, 2].map((w, i) => (
            <span key={i} className={cx('h-6 border-2 border-ink bg-ink', w === 1 && 'w-1', w === 2 && 'w-1.5', w === 3 && 'w-2.5')} />
          ))}
        </div>
      </div>

      <div className="absolute -top-6 left-4 hidden -rotate-12 rounded-lg border-3 border-ink bg-violet px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-hard-sm sm:block">
        Offline-ready
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b-3 border-ink">
      <div className="absolute inset-0 -z-10 bg-dots opacity-70" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:gap-14 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-20">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="lime">MIT licensed</Tag>
            <Tag>Free forever</Tag>
            <Tag tone="yellow">Local-first</Tag>
          </div>

          <h1 className="mt-6 font-display text-[clamp(2.9rem,7vw,5.2rem)] font-black uppercase leading-[0.88] tracking-[-0.03em]">
            Queues,
            <br />
            <span className="marker-yellow">untangled.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-ink/75">
            Antrilah hands out numbered tickets, shows every customer their place in line, and gives
            your team one-tap controls to call the next person. It runs entirely in the browser — no
            backend, no accounts, no bills.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button href="#/admin" size="lg" className="w-full sm:w-auto">
              Open the dashboard →
            </Button>
            <Button href="#/join" variant="outline" size="lg" className="w-full sm:w-auto">
              Join a queue
            </Button>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
            <span>No sign-up</span>
            <span aria-hidden>✱</span>
            <span>No cloud</span>
            <span aria-hidden>✱</span>
            <span>Works offline</span>
          </p>
        </div>

        <div className="lg:pl-6">
          <HeroDisplay />
        </div>
      </div>

      <div className="border-t-3 border-ink bg-paper">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x-2 divide-ink/10 px-4 sm:px-6 lg:grid-cols-4">
          {[
            ['0', 'servers to rent'],
            ['100%', 'of data on-device'],
            ['<1s', 'to issue a ticket'],
            ['MIT', 'forever free'],
          ].map(([value, label], i) => (
            <div key={label} className={cx('px-2 py-6 sm:px-6', i > 1 && 'border-t-2 border-ink/10 lg:border-t-0')}>
              <p className="font-display text-3xl font-black tracking-tight sm:text-4xl">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: 'Automatic numbering',
    copy: 'Every ticket gets the next number in one locked database transaction. Numbers reset each morning so A-001 always means the start of the day.',
    tone: 'bg-yellow',
    span: 'md:col-span-4',
    visual: (
      <div className="mt-5 flex items-end gap-3 font-mono">
        <span className="rounded-lg border-3 border-ink bg-paper px-3 py-2 text-2xl font-black shadow-hard-sm">A-013</span>
        <span className="pb-3 text-xl font-black">→</span>
        <span className="rounded-lg border-3 border-ink bg-ink px-3 py-2 text-2xl font-black text-yellow shadow-hard-sm">A-014</span>
      </div>
    ),
  },
  {
    title: 'Customer tracking',
    copy: 'A live ticket page shows position, people ahead and an estimated wait that recalculates as the line moves.',
    tone: 'bg-pink',
    span: 'md:col-span-2',
    visual: <ProgressPreview />,
  },
  {
    title: 'Admin dashboard',
    copy: 'Call next, recall, skip and complete — each action is a single tap, and the queue re-renders instantly.',
    tone: 'bg-blue text-cream',
    span: 'md:col-span-2',
    visual: (
      <div className="mt-5 space-y-2">
        {[
          ['Call next', 'bg-lime text-ink'],
          ['Recall', 'bg-paper text-ink'],
          ['Skip', 'bg-orange text-ink'],
        ].map(([label, tone]) => (
          <div key={label} className={cx('rounded-lg border-2 border-ink px-3 py-2 text-xs font-black uppercase tracking-[0.12em]', tone)}>
            {label}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'QR check-in',
    copy: 'Print one square for the door. Customers scan, type a name and are in the queue in seconds — generated locally, no image service.',
    tone: 'bg-lime',
    span: 'md:col-span-4',
    visual: <QrPreview />,
  },
  {
    title: 'Waiting-room display',
    copy: 'Open one local route on a tablet or TV for an oversized now-serving number, up-next list, fullscreen and an optional chime. No second app, no screen subscription.',
    tone: 'bg-ink text-cream',
    span: 'md:col-span-3',
    visual: (
      <div className="mt-5 rounded-lg border-2 border-cream/25 px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cream/50">Now serving</p>
        <p className="font-mono text-4xl font-black leading-none text-yellow">A-014</p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-cream/45">
          Fullscreen · sound optional
        </p>
      </div>
    ),
  },
  {
    title: 'Customers & daily reports',
    copy: 'Search the names people leave, spot repeat visitors and replay any day’s served, skipped and cancelled totals — then export that day as JSON.',
    tone: 'bg-yellow',
    span: 'md:col-span-3',
    visual: (
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]">
          Maya · 3 visits
        </span>
        <span className="rounded-full border-2 border-ink bg-lime px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]">
          Repeat
        </span>
      </div>
    ),
  },
  {
    title: 'Business settings',
    copy: 'Your name, logo, brand colour, prefix, average service time and opening hours — all editable, all stored on your device.',
    tone: 'bg-violet',
    span: 'md:col-span-3',
    visual: (
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {[
          ['Prefix', 'A'],
          ['Avg service', '6 min'],
          ['Hours', '9–18'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border-2 border-ink bg-paper px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/45">{k}</p>
            <p className="font-mono text-sm font-black">{v}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Offline & local',
    copy: 'IndexedDB persists every ticket. Close the laptop, lose the Wi-Fi, reopen — the queue is exactly where you left it.',
    tone: 'bg-orange',
    span: 'md:col-span-3',
    visual: (
      <div className="mt-5 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-ink" />
        <span className="h-3 w-3 rounded-full bg-ink/40" />
        <span className="h-3 w-3 rounded-full bg-ink/20" />
        <span className="ml-2 rounded-full border-2 border-ink bg-paper px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
          Saved locally
        </span>
      </div>
    ),
  },
];

function ProgressPreview() {
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-3xl font-black">A-017</span>
        <span className="text-xs font-bold uppercase tracking-[0.12em]">3 ahead</span>
      </div>
      <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-ink bg-paper">
        <div className="h-full w-2/3 border-r-2 border-ink bg-lime" />
      </div>
      <p className="mt-2 text-xs font-semibold text-ink/60">≈ 12 min wait · updates live</p>
    </div>
  );
}

function QrPreview() {
  const pattern = [
    [1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 1],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 1, 0, 1, 1, 0, 1, 1],
    [0, 1, 0, 1, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 0, 1, 1, 0, 1, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 1, 1],
  ];
  return (
    <div className="mt-5 flex items-center gap-4">
      <div className="grid grid-cols-9 gap-[2px] rounded-lg border-2 border-ink bg-paper p-2">
        {pattern.flatMap((row, r) =>
          row.map((cell, c) => (
            <span key={`${r}-${c}`} className={cx('h-2 w-2', cell ? 'bg-ink' : 'bg-transparent')} />
          )),
        )}
      </div>
      <div className="text-xs font-semibold leading-relaxed text-ink/70">
        1. Print the code
        <br />
        2. Stick it on the desk
        <br />
        3. Everyone joins the same line
      </div>
    </div>
  );
}

function FeatureBento() {
  return (
    <section id="features" className="scroll-mt-24 border-b-3 border-ink bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <Eyebrow>Everything in the box</Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
            A whole queue system, <span className="marker-pink">no strings.</span>
          </h2>
          <p className="mt-4 text-lg font-medium text-ink/70">
            Numbering, tracking, admin controls, QR check-in and settings. All of it ships in one static
            bundle you can host anywhere for free.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-6">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 60} className={feature.span}>
              <div
                className={cx(
                  'flex h-full flex-col rounded-2xl border-3 border-ink p-5 shadow-hard transition-all duration-200 hover:-translate-y-1 hover:shadow-hard-lg sm:p-6',
                  feature.tone,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl font-black uppercase leading-tight tracking-tight">
                    {feature.title}
                  </h3>
                  <span className="font-mono text-xs font-black opacity-40">0{i + 1}</span>
                </div>
                <p className={cx('mt-2 text-sm font-medium leading-relaxed', feature.tone.includes('text-cream') ? 'text-cream/80' : 'text-ink/70')}>
                  {feature.copy}
                </p>
                <div className="mt-auto">{feature.visual}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Take a number',
    copy: 'A customer scans the QR at your desk, types a name and gets the next code. Numbering is automatic and never doubles up.',
    tone: 'bg-yellow',
  },
  {
    n: '02',
    title: 'Watch the line move',
    copy: 'Their ticket page shows position, people ahead and an estimated wait. It refreshes itself in the background.',
    tone: 'bg-lime',
  },
  {
    n: '03',
    title: 'Call the next one',
    copy: 'Staff hit “Call next” in the dashboard. The current ticket closes, the next one lights up, everyone sees it.',
    tone: 'bg-pink',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-b-3 border-ink bg-paper py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal className="max-w-xl">
            <Eyebrow>Three taps, start to finish</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
              How the line works
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <Button href="#/join" variant="outline">
              Try it as a customer
            </Button>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 90}>
              <div className="relative h-full overflow-hidden rounded-2xl border-3 border-ink bg-cream p-7 shadow-hard">
                <span
                  aria-hidden
                  className={cx(
                    'absolute -right-4 -top-8 font-display text-[9rem] font-black leading-none opacity-15',
                  )}
                >
                  {step.n}
                </span>
                <span className={cx('inline-flex h-10 w-10 items-center justify-center rounded-lg border-3 border-ink font-mono text-sm font-black shadow-hard-sm', step.tone)}>
                  {step.n}
                </span>
                <h3 className="mt-6 font-display text-2xl font-black uppercase leading-none tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">{step.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreviewSection() {
  return (
    <section className="border-b-3 border-ink bg-violet py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <Eyebrow className="text-ink/70">The staff view</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
              One screen. <br /> The whole line.
            </h2>
            <p className="mt-4 max-w-md text-lg font-medium text-ink/75">
              Waiting, serving and served at a glance. Call the next ticket, mark a no-show, or take a
              walk-in — then check the day's numbers without opening a spreadsheet.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Live counts: waiting, serving, served today',
                'Average wait and service time, calculated on-device',
                'Daily volume chart for the last week',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm font-semibold">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime text-[10px] font-black">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <Button href="#/admin" className="mt-7">
              Explore the dashboard
            </Button>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl border-3 border-ink bg-ink p-3 shadow-hard-lg">
              <div className="flex items-center gap-2 border-b-2 border-cream/15 px-2 pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-pink" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow" />
                <span className="h-2.5 w-2.5 rounded-full bg-lime" />
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cream/40">
                  antrilah · dashboard
                </span>
              </div>

              <div className="rounded-xl bg-cream p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md border-2 border-ink bg-yellow text-xs font-black">a</span>
                    <span className="font-display text-sm font-black lowercase">antrilah</span>
                  </div>
                  <span className="rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]">
                    Queue open
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ['Waiting', '7', 'bg-yellow'],
                    ['Serving', '1', 'bg-lime'],
                    ['Served', '34', 'bg-paper'],
                  ].map(([k, v, tone]) => (
                    <div key={k} className={cx('rounded-lg border-2 border-ink p-2.5', tone)}>
                      <p className="font-mono text-2xl font-black leading-none">{v}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-ink/50">{k}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border-2 border-ink bg-paper p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink/45">Now serving</p>
                      <p className="font-mono text-3xl font-black leading-none">A-014</p>
                      <p className="mt-1 text-[11px] font-semibold text-ink/60">Maya R. · Front desk</p>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="rounded-md border-2 border-ink bg-lime px-2 py-1 text-[9px] font-black uppercase">Done</span>
                      <span className="rounded-md border-2 border-ink bg-paper px-2 py-1 text-[9px] font-black uppercase">Skip</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {[
                    ['A-015', 'Jonas K.', '5 min'],
                    ['A-016', 'Priya S.', '7 min'],
                    ['A-017', 'Tobias L.', '9 min'],
                  ].map(([code, name, wait]) => (
                    <div key={code} className="flex items-center justify-between rounded-lg border-2 border-ink/15 bg-paper px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black">{code}</span>
                        <span className="text-[11px] font-semibold text-ink/70">{name}</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/40">{wait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function OpenSource() {
  return (
    <section id="open-source" className="scroll-mt-24 border-b-3 border-ink bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-1">
            <div className="h-full rounded-2xl border-3 border-ink bg-ink p-7 text-cream shadow-hard">
              <Star className="h-9 w-9" />
              <h2 className="mt-6 font-display text-3xl font-black uppercase leading-[0.92] tracking-tight text-yellow">
                The Antrilah <br /> promises
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-cream/60">
                Three rules the project will not break, no matter how the roadmap changes.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-cream/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                <span className="h-2 w-2 rounded-full bg-lime" /> v1.0.0 · MIT
              </div>
            </div>
          </Reveal>

          {[
            {
              title: 'Your data stays yours',
              copy: 'Tickets live in your browser’s IndexedDB. Nothing is uploaded, cross-referenced or sold, because there is nowhere to send it.',
              tone: 'bg-lime',
              mark: '01',
            },
            {
              title: 'Free is not a trial',
              copy: 'There is no paid tier waiting behind a feature flag. MIT licensed source, complete functionality, forever.',
              tone: 'bg-yellow',
              mark: '02',
            },
            {
              title: 'Works when the Wi-Fi doesn’t',
              copy: 'A service worker caches the app and the database is local, so a dead router never stops the queue.',
              tone: 'bg-pink',
              mark: '03',
            },
          ].map((promise, i) => (
            <Reveal key={promise.title} delay={i * 80}>
              <div className={cx('flex h-full flex-col rounded-2xl border-3 border-ink p-7 shadow-hard', promise.tone)}>
                <span className="font-mono text-xs font-black opacity-50">{promise.mark}</span>
                <h3 className="mt-4 font-display text-2xl font-black uppercase leading-[1.02] tracking-tight">
                  {promise.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">{promise.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: 'Is Antrilah really free?',
    a: 'Yes. The whole application is MIT licensed and there is no paid tier, trial or upsell. Clone it, host it, fork it, ship it — no attribution fee, no seat count, no invoice.',
  },
  {
    q: 'Where is the queue data stored?',
    a: 'In your browser’s IndexedDB, on the device that runs the app. There is no server and no cloud database, so nothing leaves the machine unless you choose to export it.',
  },
  {
    q: 'Do I need a backend or database?',
    a: 'No. Antrilah is a static site. Deploy the build folder to GitHub Pages, Netlify, Cloudflare Pages or a USB stick — anywhere that serves files.',
  },
  {
    q: 'How do customers see their position?',
    a: 'They take a number at the join screen and land on a live ticket page showing their code, place in line and estimated wait. The page refreshes itself while it stays open.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. A service worker caches the app shell and IndexedDB keeps every ticket, so the queue keeps running without a connection. Everything syncs back the moment the tab is reopened.',
  },
  {
    q: 'What happens to numbers overnight?',
    a: 'Numbering is scoped per calendar day and restarts at 001 each morning. Past tickets stay in the database and feed the weekly insights.',
  },
  {
    q: 'Can several staff members use it at once?',
    a: 'Tabs on the same device stay in sync: a change in one tab updates the others instantly. Because storage is local, each device keeps its own queue.',
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-b-3 border-ink bg-paper py-16 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <Eyebrow>Questions, answered</Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
            The fine print is short
          </h2>
          <p className="mt-4 max-w-sm text-base font-medium text-ink/70">
            No licensing maze, no hidden limits. If something here is unclear, the source code is the
            documentation.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border-3 border-ink bg-ink px-4 py-3 font-mono text-xs text-cream shadow-hard-sm">
            <span className="text-lime">MIT</span> · free to use, change, share
          </div>
        </Reveal>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 40}>
              <details className="group rounded-xl border-3 border-ink bg-cream px-5 py-4 shadow-hard-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow/10 open:shadow-hard">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold">
                  {item.q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-yellow text-lg leading-none transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-b-3 border-ink bg-yellow py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <Reveal>
          <Star color="#FF5C8A" className="mx-auto h-12 w-12 animate-spin-slow" />
          <h2 className="mt-6 font-display text-[clamp(2.2rem,6vw,4.4rem)] font-black uppercase leading-[0.88] tracking-[-0.03em]">
            Start the queue. <br /> Keep the change.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-ink/75">
            Open the dashboard for a working queue in under a minute, or take a number and see exactly
            what your customers will see.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="#/admin" size="lg">
              Open the dashboard →
            </Button>
            <Button href="#/join" variant="outline" size="lg">
              Take a number
            </Button>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink/50">
            No account · No API key · No credit card
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-cream py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm font-medium leading-relaxed text-ink/60">
              A local-first, open-source digital queue management system. Built in the browser, owned by
              whoever runs it.
            </p>
            <div className="mt-4 flex gap-2">
              <Tag tone="lime">MIT</Tag>
              <Tag>v1.0.0</Tag>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/45">Product</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li><a className="hover:underline" href="#/admin">Staff dashboard</a></li>
              <li><a className="hover:underline" href="#/join">Join a queue</a></li>
              <li><a className="hover:underline" href="#/admin">QR check-in</a></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/45">Project</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li><button type="button" className="hover:underline" onClick={() => scrollToSection('features')}>Features</button></li>
              <li><button type="button" className="hover:underline" onClick={() => scrollToSection('open-source')}>License</button></li>
              <li><button type="button" className="hover:underline" onClick={() => scrollToSection('faq')}>FAQ</button></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/45">Built with</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-ink/70">
              <li>React + Vite + TypeScript</li>
              <li>Tailwind CSS</li>
              <li>Dexie.js + IndexedDB</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t-3 border-ink pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
            © {new Date().getFullYear()} Antrilah · free forever
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
            No trackers · No cookies · No backend
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="border-b-3 border-ink bg-ink px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-cream">
        <span aria-hidden className="mr-2 text-yellow">✱</span>
        MIT licensed · no cloud · no accounts · free forever
      </div>
      <Nav />
      <main id="main-content">
        <Hero />
        <Marquee
          items={[
            'No subscriptions',
            'No cloud database',
            'No API keys',
            'No accounts',
            'No lock-in',
            'MIT forever',
          ]}
        />
        <FeatureBento />
        <HowItWorks />
        <PreviewSection />
        <OpenSource />
        <Marquee
          reverse
          className="bg-pink"
          items={['Automatic numbering', 'Live tickets', 'QR check-in', 'TV display', 'Offline-first', 'Local-first', 'Free forever']}
        />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
