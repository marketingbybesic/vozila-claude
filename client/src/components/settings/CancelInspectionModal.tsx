import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, AlertCircle } from 'lucide-react';
import {
  cancelMyInspection,
  CANCEL_REASON_LABEL_HR,
  type CancelReason,
} from '../../lib/inspections';

interface Props {
  bookingId: string;
  refundEligible: boolean;       // true when status is 'paid' or 'assigned'
  paidEur: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCanceled: (refunded: boolean, refundId: string | null) => void;
}

const REASONS: CancelReason[] = [
  'found_other_inspector',
  'no_longer_buying',
  'seller_unresponsive',
  'scheduling_conflict',
  'price_changed',
  'vehicle_sold',
  'other',
];

// Replaces the previous confirm() dialog with structured cancellation
// reasons. Reason + optional notes flow to the cancel-inspection Edge
// Function which persists them on inspection_bookings.cancel_reason +
// .cancel_notes for admin analytics.
export const CancelInspectionModal = ({ bookingId, refundEligible, paidEur, open, onOpenChange, onCanceled }: Props) => {
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) { setError('Odaberite razlog otkazivanja.'); return; }
    setBusy(true);
    setError(null);
    const res = await cancelMyInspection(bookingId, reason, notes.trim() || undefined);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Otkazivanje nije uspjelo.');
      return;
    }
    onCanceled(!!res.refunded, res.refund_id ?? null);
    onOpenChange(false);
    setReason(null);
    setNotes('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border p-7 max-h-[92vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-lg font-light uppercase tracking-tight text-foreground">
                Otkaži rezervaciju
              </Dialog.Title>
              <p className="text-xs font-light text-muted-foreground mt-2 leading-relaxed">
                {refundEligible && paidEur != null
                  ? `Iznos od ${paidEur.toLocaleString('hr-HR')} € vraćamo na karticu (Stripe refund, 5-10 radnih dana).`
                  : 'Niste plaćeni — nema povrata sredstava.'}
              </p>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Zatvori" className="p-1 -m-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <div>
              <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-2">Razlog otkazivanja</span>
              <div className="grid grid-cols-1 gap-1.5">
                {REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-start gap-2.5 px-3 py-2 border cursor-pointer transition-colors ${
                      reason === r ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="mt-1"
                    />
                    <span className="text-xs font-light text-foreground">{CANCEL_REASON_LABEL_HR[r]}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Napomena (opcionalno)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 resize-none"
                placeholder="Što bismo mogli bolje?"
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 text-xs font-light text-red-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => onOpenChange(false)}
                disabled={busy}
                className="flex-1 px-4 py-2.5 text-[10px] font-light uppercase tracking-[0.25em] border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors disabled:opacity-50"
              >
                Zatvori
              </button>
              <button
                onClick={submit}
                disabled={busy || !reason}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-light uppercase tracking-[0.25em] bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : null}
                Potvrdi otkazivanje
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
