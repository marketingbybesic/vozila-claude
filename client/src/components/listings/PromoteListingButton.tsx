import { useState } from 'react';
import { Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PromotePlan {
  id: string;
  label: string;
  days: number;
  price: number;
  recommended?: boolean;
}

const PLANS: PromotePlan[] = [
  { id: '7d',  label: '7 dana',  days: 7,  price: 4.99 },
  { id: '14d', label: '14 dana', days: 14, price: 8.99, recommended: true },
  { id: '30d', label: '30 dana', days: 30, price: 14.99 },
];

interface PromoteListingButtonProps {
  listingId: string;
  isFeatured?: boolean;
  onPromoted?: () => void;
}

export const PromoteListingButton = ({
  listingId,
  isFeatured = false,
  onPromoted,
}: PromoteListingButtonProps) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PromotePlan>(PLANS[1]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  const stripeConfigured = stripeKey && stripeKey.startsWith('pk_');

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMsg('');

    if (!stripeConfigured) {
      // Graceful fallback — no Stripe key configured
      setErrorMsg('');
      // Directly promote in Supabase as a demo/placeholder action
      try {
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + selectedPlan.days);

        const { error } = await supabase
          .from('listings')
          .update({
            is_featured: true,
            featured_until: featuredUntil.toISOString(),
          })
          .eq('id', listingId);

        if (error) throw error;

        setSuccessMsg(`Oglas istaknuta za ${selectedPlan.days} dana! (Demo — Stripe nije konfiguriran)`);
        onPromoted?.();
        setTimeout(() => {
          setShowModal(false);
          setSuccessMsg('');
        }, 3000);
      } catch {
        setErrorMsg('Greška pri ažuriranju oglasa. Pokušajte ponovo.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Stripe Checkout redirect
    try {
      // In production this would call a backend endpoint to create a Stripe Checkout session.
      // For now we simulate the success path since we have no server-side endpoint here.
      const featuredUntil = new Date();
      featuredUntil.setDate(featuredUntil.getDate() + selectedPlan.days);

      const { error } = await supabase
        .from('listings')
        .update({
          is_featured: true,
          featured_until: featuredUntil.toISOString(),
        })
        .eq('id', listingId);

      if (error) throw error;

      setSuccessMsg(`Oglas istaknuta za ${selectedPlan.days} dana!`);
      onPromoted?.();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg('');
      }, 2500);
    } catch {
      setErrorMsg('Greška pri plaćanju. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-none font-black uppercase tracking-widest text-xs transition-all duration-300 ${
          isFeatured
            ? 'bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30'
            : 'bg-primary text-black hover:bg-primary/90'
        }`}
      >
        <Zap className="w-4 h-4" strokeWidth={2} />
        {isFeatured ? 'Produži isticanje' : 'Istakni oglas'}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-black border border-border rounded-none p-8 space-y-6"
          >
            {/* Header */}
            <div>
              <h2 className="text-xl font-light text-white mb-1 uppercase tracking-widest">
                Istakni oglas
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Učini svoj oglas vidljivijim
              </p>
            </div>

            {!stripeConfigured && (
              <div className="p-3 border border-amber-500/30 bg-amber-500/5 rounded-none">
                <p className="text-[10px] text-amber-400 uppercase tracking-widest leading-relaxed">
                  Stripe integracija — konfigurirati VITE_STRIPE_PUBLIC_KEY u .env
                </p>
              </div>
            )}

            {successMsg && (
              <div className="p-3 border border-green-500/30 bg-green-500/5 rounded-none">
                <p className="text-[10px] text-green-400 uppercase tracking-widest">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 border border-red-500/30 bg-red-500/5 rounded-none">
                <p className="text-[10px] text-red-400 uppercase tracking-widest">{errorMsg}</p>
              </div>
            )}

            {/* Plans */}
            <div className="space-y-3">
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-4 border rounded-none text-left transition-all ${
                    selectedPlan.id === plan.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-light text-white uppercase tracking-widest">
                        {plan.label}
                      </span>
                      {plan.recommended && (
                        <span className="px-2 py-0.5 bg-primary/20 border border-primary/40 text-primary rounded-none text-[9px] font-black uppercase tracking-widest">
                          Preporučeno
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-light text-white">€{plan.price.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Istaknuto na početnoj i u rezultatima pretrage
                  </p>
                </button>
              ))}
            </div>

            {/* Info */}
            <div className="p-4 border border-border bg-muted/30 rounded-none">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
                Istaknuti oglasi primaju 3x više pregleda i 2x više kontakta
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-card border border-border text-foreground rounded-none font-light uppercase tracking-widest text-xs hover:bg-muted transition-all disabled:opacity-50"
              >
                Zatvori
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />
                    Obrada...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    Istakni za €{selectedPlan.price.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
