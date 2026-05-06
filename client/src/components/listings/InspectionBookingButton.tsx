import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  listingId: string;
  // Optional default address from the listing's location field.
  defaultAddress?: string;
}

// Vozila Inspection booking — €100, paid via Stripe Checkout.
// Two-step flow: insert pending row → call create-inspection-checkout
// Edge Function → redirect to Stripe. Webhook (kind=inspection) flips the
// row to 'paid' on success. If env is missing, falls back to capture-only
// so dev doesn't break.
export const InspectionBookingButton = ({ listingId, defaultAddress }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(defaultAddress ?? '');
  const [date, setDate] = useState('');
  const [timeWindow, setTimeWindow] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && defaultAddress && !address) setAddress(defaultAddress);
  }, [open, defaultAddress, address]);

  const submit = async () => {
    setError(null);
    if (!address.trim()) { setError('Adresa je obavezna.'); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Prijavite se za rezervaciju inspekcije.'); setBusy(false); return; }

      const { data: booking, error: insErr } = await supabase
        .from('inspection_bookings')
        .insert({
          user_id: user.id,
          listing_id: listingId,
          address: address.trim(),
          preferred_date: date || null,
          preferred_time_window: timeWindow,
          notes: notes.trim() || null,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      if (!booking) throw new Error('Rezervacija nije uspjela.');

      // Hand off to Stripe Checkout — webhook flips status to 'paid'.
      const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
      if (fnUrl) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Sesija je istekla.');
        const res = await fetch(`${fnUrl}/create-inspection-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ booking_id: booking.id }),
        });
        if (res.ok) {
          const j = await res.json();
          if (j.url) {
            window.location.href = j.url as string;
            return;
          }
          throw new Error('Nedostaje Checkout URL.');
        }
        const txt = await res.text().catch(() => '');
        throw new Error(`(${res.status}) ${txt || 'Greška pri kreiranju kupnje.'}`);
      }
      // Dev fallback (no env): leave row pending, just close the modal so
      // the user gets visual confirmation. Admin can manually mark paid.
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-card border border-border text-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:border-primary transition-colors">
          <Wrench className="w-3.5 h-3.5" strokeWidth={1.5} />
          Rezerviraj inspekciju · 100€
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border p-7 max-h-[92vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.3em] text-primary mb-2">Vozila Inspected</p>
              <Dialog.Title className="text-lg font-light uppercase tracking-tight text-foreground">
                Rezerviraj inspekciju
              </Dialog.Title>
              <p className="text-xs font-light text-muted-foreground mt-2 leading-relaxed">
                Vozila-certificirani mehaničar izlazi na adresu, izrađuje brendirani izvještaj sa slikama i preporukom. Cijena 100€.
              </p>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Zatvori" className="p-1 -m-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" strokeWidth={1.5} /></button>
            </Dialog.Close>
          </div>

          {(
            <div className="space-y-3">
              <label className="block">
                <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Adresa vozila</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                  placeholder="Ilica 1, Zagreb"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Željeni datum</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Vrijeme</span>
                  <select
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value as typeof timeWindow)}
                    className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                  >
                    <option value="morning">Jutro</option>
                    <option value="afternoon">Poslijepodne</option>
                    <option value="evening">Večer</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Napomena</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 resize-none"
                  placeholder="Dodatne informacije, kontakt prodavača…"
                />
              </label>
              {error && <p className="text-xs font-light text-red-400">{error}</p>}
              <button
                onClick={submit}
                disabled={busy || !address.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />}
                Plati i rezerviraj · 100€
              </button>
              <p className="text-[10px] font-light text-muted-foreground/70 leading-relaxed text-center">
                Plaćanje preko Stripe-a. Iznos se vraća ako prodavač odbije termin.
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
