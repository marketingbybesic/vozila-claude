import { Sparkles } from 'lucide-react';

interface FeaturedBadgeProps {
  isFeatured: boolean;
}

export const FeaturedBadge = ({ isFeatured }: FeaturedBadgeProps) => {
  if (!isFeatured) return null;

  return (
    <div className="absolute top-3 left-3 px-2 py-1 bg-white/10 backdrop-blur-sm border border-white rounded-none flex items-center gap-1.5">
      <Sparkles className="w-3 h-3 text-white" strokeWidth={2} />
      <span className="text-[10px] font-black uppercase tracking-widest text-white">
        Istaknuto
      </span>
    </div>
  );
};
