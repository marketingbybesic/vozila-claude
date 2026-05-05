import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Flag, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  listingId: string;
}

const REASONS: { id: string; label: string }[] = [
  { id: 'scam',           label: 'Prevara / sumnjivo niska cijena' },
  { id: 'duplicate',      label: 'Duplikat oglasa' },
  { id: 'wrong_category', label: 'Pogrešna kategorija' },
  { id: 'sold',           label: 'Vozilo je prodano (ne aktivno)' },
  { id: 'nsfw',           label: 'Neprikladan sadržaj / slike' },
  { id: 'other',          label: 'Drugo' },
];

// Compact "Prijavi oglas" trigger + reason picker + free-text notes.
// Inserts into reports table — RLS lets any authed user insert.
export const ReportListingButton = ({ listingId }: Props) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) { setError('Odaberite razlog prijave.'); return; }
    setBusy(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Prijavite se da biste prijavili oglas.'); setBusy(false); return; }
      const { error: insErr } = await supabase
        .from('reports')
        .insert({ listing_id: listingId, reporter_id: user.id, reason, notes: notes.trim() || null });
      if (insErr) throw insErr;
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setReason(null); setNotes(''); }, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška pri prijavi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          title="Prijavi oglas"
        >
          <Flag className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Prijavi oglas
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border p-7 max-h-[92vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-5">
            <Dialog.Title className="text-lg font-light uppercase tracking-tight text-foreground">
              Prijavi oglas
            </Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Zatvori" className="p-1 -m-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" strokeWidth={1.5} /></button>
            </Dialog.Close>
          </div>

          {done ? (
            <div className="flex items-center gap-3 p-4 border border-green-500/30 bg-green-500/5 text-sm font-light text-green-400">
              <Check className="w-4 h-4" strokeWidth={2} /> Hvala — vaša prijava je u redu za pregled.
            </div>
          ) : (
            <>
              <p className="text-xs font-light text-muted-foreground mb-4 leading-relaxed">
                Pomažete očuvati Vozila.hr sigurnim. Pregledat ćemo prijavu i poduzeti akciju ako je potrebno.
              </p>
              <div className="space-y-2 mb-4">
                {REASONS.map((r) => (
                  <label key={r.id} className={`flex items-center gap-3 px-3 py-2.5 border cursor-pointer transition-colors ${reason === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/40'}`}>
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reason === r.id}
                      onChange={() => setReason(r.id)}
                      className="sr-only"
                    />
                    <span className={`w-3 h-3 border ${reason === r.id ? 'border-primary bg-primary' : 'border-border'}`} aria-hidden="true" />
                    <span className="text-sm font-light text-foreground">{r.label}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatne informacije (opcionalno)…"
                rows={3}
                maxLength={1000}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/40 mb-4"
              />
              {error && <p className="text-xs font-light text-red-400 mb-3">{error}</p>}
              <button
                onClick={submit}
                disabled={busy || !reason}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />}
                Pošalji prijavu
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
