import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Sparkles, Check, X, Loader2, Zap } from 'lucide-react';
import { BOOST_TIERS, recordBoostIntent, type BoostTier } from '../../lib/boost';

interface Props {
  listingId: string;
  listingTitle?: string;
  trigger?: React.ReactNode;
}

// Boost modal — appears from the seller dashboard or the listing card edit menu.
// Three tiers, side-by-side. Click a tier → either redirect to Stripe Checkout
// (when Price ID is set + a /api/boost/checkout endpoint exists) or fall back
// to recording a local intent (demo mode).
export const BoostModal = ({ listingId, listingTitle, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<BoostTier['id'] | null>(null);
  const [done, setDone] = useState<BoostTier['id'] | null>(null);

  const onSelect = async (tier: BoostTier) => {
    setBusy(tier.id);
    try {
      // Real path — Supabase Edge Function creates Checkout Session.
      // Requires VITE_SUPABASE_FUNCTIONS_URL + STRIPE_PRICE_BOOST_* env on server.
      const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
      if (fnUrl) {
        const { supabase } = await import('../../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          alert('Prijavite se za kupnju Boost-a.');
          setBusy(null);
          return;
        }
        const res = await fetch(`${fnUrl}/create-boost-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ listingId, tier: tier.id }),
        });
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url; // hand off to Stripe Checkout
          return;
        }
        const txt = await res.text().catch(() => '');
        console.warn('[boost] checkout endpoint error', res.status, txt);
      }
      // Fallback (demo): record intent locally + close
      recordBoostIntent({ listingId, tier: tier.id, createdAt: Date.now() });
      setDone(tier.id);
      setTimeout(() => { setDone(null); setOpen(false); }, 2200);
    } catch {
      recordBoostIntent({ listingId, tier: tier.id, createdAt: Date.now() });
      setDone(tier.id);
      setTimeout(() => { setDone(null); setOpen(false); }, 2200);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors">
            <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
            Boost oglas
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-background border border-border p-8 sm:p-10 max-h-[92vh] overflow-y-auto"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary inline-flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                Više pregleda za vaš oglas
              </p>
              <Dialog.Title className="text-xl sm:text-2xl font-light uppercase tracking-tight text-foreground">
                Boost oglas
              </Dialog.Title>
              {listingTitle && (
                <p className="mt-1 text-xs font-light text-muted-foreground line-clamp-1">
                  {listingTitle}
                </p>
              )}
            </div>
            <Dialog.Close asChild>
              <button aria-label="Zatvori" className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {BOOST_TIERS.map((tier) => {
              const isFeatured = tier.id === 'featured-7d';
              const isBusy = busy === tier.id;
              const isDone = done === tier.id;
              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col p-5 sm:p-6 border transition-colors ${
                    isFeatured ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  {isFeatured && (
                    <span className="absolute -top-2.5 left-5 px-2 py-0.5 bg-primary text-primary-foreground text-[9px] font-medium uppercase tracking-[0.25em]">
                      Najpopularnije
                    </span>
                  )}
                  <h3 className="text-sm font-light uppercase tracking-[0.2em] text-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-3xl font-light text-foreground tabular-nums">
                    {tier.price_eur.toFixed(2).replace('.', ',')} <span className="text-xs text-muted-foreground">€</span>
                  </p>
                  <p className="mt-1 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
                    {tier.duration_days} {tier.duration_days === 1 ? 'dan' : tier.duration_days < 5 ? 'dana' : 'dana'}
                  </p>

                  <ul className="mt-5 space-y-2 flex-grow">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs font-light text-foreground/85 leading-snug">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onSelect(tier)}
                    disabled={isBusy || isDone}
                    className={`mt-6 inline-flex items-center justify-center gap-2 h-11 px-4 text-[10px] font-light uppercase tracking-[0.25em] transition-colors disabled:cursor-not-allowed ${
                      isFeatured
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-foreground text-foreground hover:bg-foreground hover:text-background'
                    }`}
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                      isDone ? <Check className="w-3.5 h-3.5" /> : null}
                    {isBusy ? 'Otvaram…' : isDone ? 'Zaprimljeno' : 'Aktiviraj boost'}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-[10px] font-light text-muted-foreground/80 leading-relaxed">
            Sigurna naplata putem Stripea. Boost počinje odmah po uspješnoj naplati.
            Bez automatskog produženja. Stripe priznanica stiže na vaš e-mail.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
