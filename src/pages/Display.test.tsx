import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Display from './Display';
import { callNext, dayKey } from '../lib/queue';
import { makeTicket } from '../test/helpers';

describe('waiting-room display', () => {
  it('shows the current number, hides names and updates when staff call next', async () => {
    const today = dayKey();
    const now = Date.now();
    await makeTicket({
      dayKey: today,
      seq: 1,
      code: 'A-001',
      name: 'Maya Rivera',
      status: 'serving',
      createdAt: now - 60_000,
      calledAt: now - 30_000,
    });
    await makeTicket({
      dayKey: today,
      seq: 2,
      code: 'A-002',
      name: 'Jon Park',
      status: 'waiting',
      createdAt: now - 20_000,
    });

    render(<Display />);

    expect(
      await screen.findByText('A-001', { selector: '[aria-live="polite"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/now serving/i)).toBeInTheDocument();
    expect(screen.queryByText('Maya Rivera')).not.toBeInTheDocument();
    expect(document.body.style.backgroundColor).toBe('rgb(17, 17, 17)');

    await act(async () => {
      await callNext();
    });

    await waitFor(() => {
      expect(screen.getByText('A-002', { selector: '[aria-live="polite"]' })).toBeInTheDocument();
    });
    expect(screen.getByText('A-001')).toBeInTheDocument();
  });

  it('lets the waiting-room screen opt into sound with one tap', async () => {
    const user = userEvent.setup();
    render(<Display />);

    const soundButton = await screen.findByRole('button', { name: /sound off/i });
    await user.click(soundButton);

    expect(screen.getByRole('button', { name: /sound on/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.localStorage.getItem('antrilah:display-sound')).toBe('1');
  });
});
