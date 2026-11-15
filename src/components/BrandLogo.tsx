import { Logo } from './ui';
import type { Settings } from '../lib/db';

export function BrandLogo({
  settings,
  compact = false,
}: {
  settings?: Settings | null;
  compact?: boolean;
}) {
  if (settings?.logoDataUrl) {
    return (
      <img
        src={settings.logoDataUrl}
        alt={`${settings.businessName} logo`}
        className={
          compact
            ? 'h-9 w-9 rounded-lg border-2 border-ink bg-paper object-contain p-0.5'
            : 'h-10 w-10 rounded-lg border-2 border-ink bg-paper object-contain p-0.5'
        }
      />
    );
  }
  return <Logo compact={compact} />;
}
