import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CustomersPanel } from './CustomersPanel';
import { dayKey } from '../lib/queue';
import { makeTicket } from '../test/helpers';

async function seedCustomers() {
  const now = Date.now();
  await makeTicket({
    dayKey: dayKey(),
    seq: 1,
    code: 'A-001',
    name: 'Maya Rivera',
    phone: '0812-3456',
    status: 'done',
    createdAt: now - 60_000,
  });
  await makeTicket({
    dayKey: dayKey(),
    seq: 2,
    code: 'A-002',
    name: 'Maya Rivera',
    phone: '0812-3456',
    status: 'serving',
    createdAt: now - 30_000,
  });
  await makeTicket({
    dayKey: dayKey(),
    seq: 3,
    code: 'A-003',
    name: 'Jon Park',
    phone: '555-0100',
    status: 'waiting',
    createdAt: now - 10_000,
  });
  await makeTicket({
    dayKey: dayKey(),
    seq: 4,
    code: 'A-004',
    name: 'Walk-in',
    status: 'waiting',
    createdAt: now - 5_000,
  });
}

describe('customer directory', () => {
  it('groups visits by name, marks repeat visitors and ignores anonymous walk-ins', async () => {
    await seedCustomers();
    render(<CustomersPanel />);

    const maya = await screen.findByRole('button', { name: /Maya Rivera/ });
    expect(maya).toHaveTextContent('2× repeat');
    expect(screen.getByRole('button', { name: /Jon Park/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Walk-in/ })).not.toBeInTheDocument();
    expect(screen.getByText('Customers').parentElement).toHaveTextContent('2');
  });

  it('searches by name and filters to repeat visitors', async () => {
    await seedCustomers();
    const user = userEvent.setup();
    render(<CustomersPanel />);

    await screen.findByRole('button', { name: /Maya Rivera/ });
    await user.type(screen.getByLabelText(/search customers/i), 'Jon');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Maya Rivera/ })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Jon Park/ })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/search customers/i));
    await user.click(screen.getByRole('button', { name: /^Repeat 1$/ }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Jon Park/ })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Maya Rivera/ })).toBeInTheDocument();
  });

  it('opens a customer’s ticket history', async () => {
    await seedCustomers();
    const user = userEvent.setup();
    render(<CustomersPanel />);

    await user.click(await screen.findByRole('button', { name: /Maya Rivera/ }));

    expect(screen.getByRole('heading', { name: /Maya Rivera/i })).toBeInTheDocument();
    expect(screen.getAllByText(/0812-3456/).length).toBeGreaterThan(0);
    expect(screen.getByText('A-001')).toBeInTheDocument();
    expect(screen.getByText('A-002')).toBeInTheDocument();
  });
});
