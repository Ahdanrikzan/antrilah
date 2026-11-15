import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from './AdminPanels';
import { ToastProvider } from '../components/Toast';
import { DEFAULT_SETTINGS, getSettings } from '../lib/db';

describe('settings panel', () => {
  it('saves the business name and notification switches', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <ToastProvider>
        <SettingsPanel
          settings={DEFAULT_SETTINGS}
          onSaved={onSaved}
          onOpenWizard={() => {}}
        />
      </ToastProvider>,
    );

    const name = screen.getByRole('textbox', { name: /business name/i });
    await user.clear(name);
    await user.type(name, 'Bike Shop');
    await user.click(screen.getByRole('checkbox', { name: /new customer joins/i }));
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Business settings saved'));

    const saved = await getSettings();
    expect(saved.businessName).toBe('Bike Shop');
    expect(saved.soundOnJoin).toBe(true);
  });
});
