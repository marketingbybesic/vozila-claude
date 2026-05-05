import { ShieldCheck, Crown, Award } from 'lucide-react';
import type { SubTierId } from '../../lib/subscription';

interface Props {
  tier?: SubTierId | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

// Compact verified-dealer pill. Used on ListingCard, ListingDetail seller
// block, and DealerProfile header. Tier picks the icon + accent.
export const VerifiedDealerBadge = ({ tier, size = 'sm', showLabel = true }: Props) => {
  if (!tier) return null;

  const config: Record<SubTierId, { Icon: typeof ShieldCheck; label: string; accent: string }> = {
    bronze: { Icon: ShieldCheck, label: 'Verified', accent: 'text-amber-700/90 border-amber-700/40 bg-amber-700/5' },
    silver: { Icon: Award,       label: 'Premium',  accent: 'text-slate-300 border-slate-400/40 bg-slate-400/5' },
    gold:   { Icon: Crown,       label: 'Elite',    accent: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/5' },
  };
  const { Icon, label, accent } = config[tier];

  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const fontSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <span
      title={`Vozila ${label} salon`}
      className={`inline-flex items-center gap-1 ${padding} border ${accent} ${fontSize} font-light uppercase tracking-[0.2em]`}
    >
      <Icon className={iconSize} strokeWidth={1.5} aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  );
};
