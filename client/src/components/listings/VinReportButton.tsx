import { useState } from 'react';
import { FileSearch, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  listingId: string;
  vin?: string | null;
}

// VIN history report — €9.99 paid product. Calls Edge Function
// vin-report-checkout which creates a Stripe Checkout. On webhook success,
// the cron 'generate-vin-reports' (or admin) fulfils → emails buyer the PDF.
//
// If env or VIN missing, the button still renders but clicks show a tip.
export const VinReportButton = ({ listingId, vin }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    if (!vin || vin.length !== 17) {
      setError('VIN nedostupan na ovom oglasu.');
      return;
    }
    setBusy(true);
    try {
      const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
      if (!fnUrl) {
        setError('Nije konfigurirano (VITE_SUPABASE_FUNCTIONS_URL).');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Prijavite se za kupnju izvještaja.');
        return;
      }
      const res = await fetch(`${fnUrl}/vin-report-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listing_id: listingId, vin }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setError(`(${res.status}) ${txt || 'Greška pri kreiranju kupnje.'}`);
        return;
      }
      const j = await res.json();
      if (j.url) {
        window.location.href = j.url;
      } else {
        setError('Nedostaje Checkout URL.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mrežna greška.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-card border border-border text-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:border-primary transition-colors disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <FileSearch className="w-3.5 h-3.5" strokeWidth={1.5} />}
        VIN izvještaj · 9,99€
      </button>
      {error && <p className="text-[10px] font-light text-red-400">{error}</p>}
    </div>
  );
};
