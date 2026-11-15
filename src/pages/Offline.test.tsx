import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { OfflineBadge } from '../components/SystemBanners';
import Join from './Join';
import { db } from '../lib/db';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

function restoreOnline() {
  delete (navigator as { onLine?: boolean }).onLine;
}

afterEach(restoreOnline);

describe('offline mode', () => {
  it('shows the offline banner when the connection drops', async () => {
    setOnline(false);
    render(<OfflineBadge />);

    expect(await screen.findByText(/offline — queue still works/i)).toBeInTheDocument();
  });

  it('still issues a ticket while the network is offline', async () => {
    setOnline(false);
    const user = userEvent.setup();
    render(<Join />);

    expect(await screen.findByRole('heading', { name: /take a number/i })).toBeInTheDocument();
    await user.type(await screen.findByLabelText(/your name/i), 'Offline Customer');
    await user.click(screen.getByRole('button', { name: /get my number/i }));

    await waitFor(async () => {
      expect(await db.tickets.count()).toBe(1);
    });
    expect((await db.tickets.toArray())[0].name).toBe('Offline Customer');
  });
});
