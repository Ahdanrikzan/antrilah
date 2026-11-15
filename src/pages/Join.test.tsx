import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Join from './Join';
import { db } from '../lib/db';

describe('customer check-in', () => {
  it('creates a ticket from the form and remembers it on the device', async () => {
    const user = userEvent.setup();
    render(<Join />);

    expect(await screen.findByRole('heading', { name: /take a number/i })).toBeInTheDocument();

    await user.type(await screen.findByLabelText(/your name/i), 'Maya Rivera');
    await user.click(screen.getByRole('button', { name: /get my number/i }));

    await waitFor(async () => {
      expect(await db.tickets.count()).toBe(1);
    });

    const ticket = (await db.tickets.toArray())[0];
    expect(ticket).toMatchObject({
      name: 'Maya Rivera',
      code: 'A-001',
      seq: 1,
      status: 'waiting',
    });
    expect(window.localStorage.getItem('antrilah:last-ticket')).toBe(ticket.id);
  });
});
