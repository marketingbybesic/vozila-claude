import { useState } from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface PromoteListingButtonProps {
  listingId: string;
  isFeatured?: boolean;
  onPromote?: () => void;
}

export const PromoteListingButton = ({
  listingId,
  isFeatured = false,
  onPromote,
}: PromoteListingButtonProps) => {
  const [showModal, setShowModal] = useState(false);

  const handlePromoteClick = () => {
    setShowModal(true);
    onPromote?.();
  };

  return (
    <>
      {/* Promote Button */}
      <button
        onClick={handlePromoteClick}
        className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-none font-black uppercase tracking-widest text-xs transition-all duration-300 ${
          isFeatured
            ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
            : 'bg-white text-black hover:bg-neutral-200'
        }`}
      >
        <Zap className="w-5 h-5" strokeWidth={2} />
        {isFeatured ? 'Oglas je istaknutan' : 'Promoviraj oglas'}
      </button>

      {/* Promotion Modal */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="w-full max-w-md bg-black border border-white/10 rounded-none p-8 space-y-6"
          >
            {/* Header */}
            <div>
              <h2 className="text-2xl font-black text-white mb-2">Promoviraj oglas</h2>
              <p className="text-xs text-neutral-400 uppercase tracking-widest">
                Učini svoj oglas vidljivijim
              </p>
            </div>

            {/* Promotion Plans */}
            <div className="space-y-3">
              {/* Plan 1: 7 Days */}
              <div className="p-4 border border-white/10 rounded-none hover:border-white/30 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-white group-hover:text-neutral-200">
                    7 dana
                  </h3>
                  <span className="text-lg font-black text-white">19€</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Tvoj oglas će biti istaknutan na početnoj stranici i u rezultatima pretrage.
                </p>
              </div>

              {/* Plan 2: 30 Days */}
              <div className="p-4 border border-yellow-500/30 bg-yellow-500/5 rounded-none hover:border-yellow-500/50 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white group-hover:text-neutral-200">
                      30 dana
                    </h3>
                    <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded-none text-[10px] font-black uppercase tracking-widest">
                      Preporučeno
                    </span>
                  </div>
                  <span className="text-lg font-black text-white">49€</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Maksimalna vidljivost. Savršeno za brzu prodaju.
                </p>
              </div>

              {/* Plan 3: 90 Days */}
              <div className="p-4 border border-white/10 rounded-none hover:border-white/30 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-white group-hover:text-neutral-200">
                    90 dana
                  </h3>
                  <span className="text-lg font-black text-white">99€</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Dugoročna promocija za poslovne korisnike.
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 border border-white/10 bg-white/5 rounded-none">
              <p className="text-xs text-neutral-400">
                💡 <strong>Savjet:</strong> Istaknuti oglasi primaju 3x više pregleda i 2x više kontakta.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 bg-neutral-900 border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all"
              >
                Zatvori
              </button>
              <button
                onClick={() => {
                  // TODO: Redirect to payment gateway
                  console.log('Redirect to payment for listing:', listingId);
                  setShowModal(false);
                }}
                className="flex-1 px-6 py-3 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
              >
                Nastavi na plaćanje
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
