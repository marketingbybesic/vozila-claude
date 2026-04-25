import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Eye } from 'lucide-react';
import { ListingStatus } from '../../types';

interface StatusBadgeProps {
  status: ListingStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<ListingStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode; pulse: boolean }> = {
  published: {
    label: 'Live',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    icon: <CheckCircle2 className="w-4 h-4" strokeWidth={2} />,
    pulse: true,
  },
  inactive: {
    label: 'Sold',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    icon: <Eye className="w-4 h-4 line-through" strokeWidth={2} />,
    pulse: false,
  },
  draft: {
    label: 'Draft',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    icon: <Clock className="w-4 h-4" strokeWidth={2} />,
    pulse: false,
  },
};

export const StatusBadge = ({ status, size = 'md', showLabel = true }: StatusBadgeProps) => {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <motion.div
      className={`inline-flex items-center gap-2 rounded-none border border-white/10 ${config.bgColor} ${sizeClasses[size]}`}
      animate={config.pulse ? { opacity: [1, 0.7, 1] } : {}}
      transition={config.pulse ? { duration: 2, repeat: Infinity } : {}}
    >
      <span className={config.color}>{config.icon}</span>
      {showLabel && <span className={`font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>}
    </motion.div>
  );
};

/**
 * Status update utility for dashboard
 */
export const updateListingStatus = async (
  listingId: string,
  newStatus: ListingStatus,
  supabaseClient: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabaseClient
      .from('listings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', listingId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Failed to update listing status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status',
    };
  }
};
