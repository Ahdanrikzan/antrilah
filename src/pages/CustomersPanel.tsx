import { useMemo, useState } from 'react';
import { EmptyState, Icon, Input, Panel, Skeleton, StatusPill, Tag } from '../components/ui';
import { db, type Ticket } from '../lib/db';
import { useQuery } from '../lib/hooks';
import { formatClock, labelDayKey } from '../lib/utils';

interface CustomerRecord {
  key: string;
  name: string;
  phone: string;
  tickets: Ticket[];
  lastVisit: number;
  lastDay: string;
  served: number;
  missed: number;
}

/** Groups tickets by customer name — no extra database and no hidden profile. */
function buildCustomers(tickets: Ticket[]): CustomerRecord[] {
  const map = new Map<string, CustomerRecord>();

  for (const ticket of tickets) {
    const name = ticket.name.trim();
    if (!name || name.toLowerCase() === 'walk-in') continue;
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.tickets.push(ticket);
      if (ticket.phone) existing.phone = ticket.phone;
      if (ticket.createdAt >= existing.lastVisit) {
        existing.lastVisit = ticket.createdAt;
        existing.lastDay = ticket.dayKey;
      }
      if (ticket.status === 'done') existing.served += 1;
      if (ticket.status === 'skipped' || ticket.status === 'cancelled') existing.missed += 1;
    } else {
      map.set(key, {
        key,
        name,
        phone: ticket.phone,
        tickets: [ticket],
        lastVisit: ticket.createdAt,
        lastDay: ticket.dayKey,
        served: ticket.status === 'done' ? 1 : 0,
        missed: ticket.status === 'skipped' || ticket.status === 'cancelled' ? 1 : 0,
      });
    }
  }

  for (const record of map.values()) {
    record.tickets.sort((a, b) => b.createdAt - a.createdAt);
  }

  return [...map.values()].sort((a, b) => b.lastVisit - a.lastVisit);
}

export function CustomersPanel() {
  const data = useQuery(() => db.tickets.toArray(), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'repeat'>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const customers = useMemo(() => buildCustomers(data ?? []), [data]);
  const repeatCount = customers.filter((customer) => customer.tickets.length > 1).length;

  const visible = customers.filter((customer) => {
    if (filter === 'repeat' && customer.tickets.length < 2) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return customer.name.toLowerCase().includes(needle) || customer.phone.toLowerCase().includes(needle);
  });

  const selected = visible.find((customer) => customer.key === selectedKey) ?? visible[0] ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Panel className="p-3">
            <p className="meta">Customers</p>
            <p className="mt-1 font-mono text-2xl font-black leading-none">{customers.length}</p>
          </Panel>
          <Panel className="p-3">
            <p className="meta">Repeat</p>
            <p className="mt-1 font-mono text-2xl font-black leading-none">{repeatCount}</p>
          </Panel>
          <Panel className="p-3">
            <p className="meta">Tickets</p>
            <p className="mt-1 font-mono text-2xl font-black leading-none">{data?.length ?? 0}</p>
          </Panel>
        </div>

        <Panel className="p-4">
          <label htmlFor="customer-search" className="meta">
            Search customers
          </label>
          <div className="relative mt-1.5">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input
              id="customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or phone"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Customer filter">
            {(
              [
                ['all', `All ${customers.length}`],
                ['repeat', `Repeat ${repeatCount}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={
                  filter === id
                    ? 'rounded-full border-2 border-ink bg-ink px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cream'
                    : 'rounded-full border-2 border-ink/20 bg-paper px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-ink/50 hover:border-ink'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          {data === undefined ? (
            <div className="space-y-2 p-4" aria-busy="true">
              <span className="sr-only">Loading customers…</span>
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              kind="data"
              title={customers.length ? 'No matching customers' : 'No named customers yet'}
              copy={
                customers.length
                  ? 'Try a different name or phone number, or switch back to all customers.'
                  : 'When people add their name on the join page, they appear here automatically. Walk-ins stay anonymous.'
              }
            />
          ) : (
            <ul className="max-h-[28rem] divide-y-2 divide-ink/10 overflow-y-auto">
              {visible.map((customer) => {
                const active = selected?.key === customer.key;
                return (
                  <li key={customer.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(customer.key)}
                      aria-current={active ? 'true' : undefined}
                      className={
                        active
                          ? 'flex w-full items-center gap-3 bg-yellow/35 px-4 py-3 text-left'
                          : 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream'
                      }
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper font-display text-xs font-black uppercase">
                        {customer.name.slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="truncate text-sm font-bold">{customer.name}</span>
                          {customer.tickets.length > 1 && <Tag tone="violet">{customer.tickets.length}× repeat</Tag>}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/40">
                          Last {labelDayKey(customer.lastDay)}
                          {customer.phone ? ` · ${customer.phone}` : ''}
                        </span>
                      </span>
                      <Icon name="arrowRight" className="h-3.5 w-3.5 shrink-0 text-ink/25" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="h-fit overflow-hidden lg:sticky lg:top-24">
        {!selected ? (
          <EmptyState
            kind="data"
            title="Pick a customer"
            copy="Select someone on the left to see every visit, their served count and any missed calls."
          />
        ) : (
          <>
            <div className="border-b-3 border-ink bg-ink px-5 py-4 text-cream">
              <p className="meta text-cream/50">Customer history</p>
              <h3 className="mt-1 font-display text-xl font-black uppercase leading-tight">{selected.name}</h3>
              <p className="mt-1 text-xs font-semibold text-cream/55">
                {selected.phone || 'No contact saved'} · {selected.tickets.length} visit
                {selected.tickets.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x-2 divide-ink/10 border-b-2 border-ink/10">
              {[
                ['Served', selected.served],
                ['Missed', selected.missed],
                ['Visits', selected.tickets.length],
              ].map(([label, value]) => (
                <div key={label} className="px-3 py-3 text-center">
                  <p className="meta">{label}</p>
                  <p className="mt-1 font-mono text-xl font-black leading-none">{value}</p>
                </div>
              ))}
            </div>

            <ul className="max-h-[24rem] divide-y-2 divide-ink/10 overflow-y-auto">
              {selected.tickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-sm font-black">{ticket.code}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold">
                      {labelDayKey(ticket.dayKey)} · {formatClock(ticket.createdAt)}
                    </p>
                    {ticket.note && <p className="truncate text-[10px] text-ink/45">{ticket.note}</p>}
                  </div>
                  <StatusPill status={ticket.status} />
                </li>
              ))}
            </ul>

            <div className="border-t-2 border-ink/10 bg-cream/60 px-4 py-3">
              <p className="text-[10px] font-semibold leading-relaxed text-ink/45">
                Grouped from ticket names on this device. Duplicate names count as the same customer; no profile
                is created or uploaded.
              </p>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
