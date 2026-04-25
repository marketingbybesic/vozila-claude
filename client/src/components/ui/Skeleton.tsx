export const Skeleton = ({ className = '', variant = 'default' }: { className?: string; variant?: 'default' | 'card' | 'table' }) => {
  if (variant === 'card') {
    return (
      <div className={`group bg-card border border-border/40 rounded-none overflow-hidden ${className}`}>
        {/* Image Skeleton */}
        <div className="relative aspect-[16/9] bg-gradient-to-r from-neutral-800 to-neutral-900 animate-pulse" />

        {/* Content Skeleton */}
        <div className="p-6 space-y-4">
          <div className="h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-3/4" />
          <div className="h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-1/2" />
          <div className="h-6 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-24" />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border/40">
            <div className="flex-1 h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-1/4" />
            <div className="flex-1 h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-1/6" />
            <div className="flex-1 h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-1/8" />
            <div className="flex-1 h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-neutral-800 to-neutral-900 animate-pulse rounded-none ${className}`} />
  );
};
