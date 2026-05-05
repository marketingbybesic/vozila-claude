import { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  attributes: Record<string, any>;
  title?: string;
  onGenerated: (text: string) => void;
}

// AI copywriter button — calls the Supabase Edge Function ai-listing-copy
// (Claude Haiku) with the listing's structured attributes and pipes the
// generated description back into the form. 503 when env not set.
export const AiCopywriterButton = ({ attributes, title, onGenerated }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
      if (!fnUrl) {
        setError('AI generator nije konfiguriran (VITE_SUPABASE_FUNCTIONS_URL).');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Prijavite se za korištenje AI generatora.');
        return;
      }
      const res = await fetch(`${fnUrl}/ai-listing-copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          make: attributes.make,
          model: attributes.model,
          year: attributes.year,
          mileage: attributes.mileage,
          fuel: attributes.fuel,
          transmission: attributes.transmission,
          power_hp: attributes.power_hp,
          body_type: attributes.body_type,
          color: attributes.color,
          condition: attributes.condition,
          equipment: attributes.equipment || [],
          title,
          language: 'hr',
        }),
      });
      if (res.status === 503) {
        setError('AI generator nije konfiguriran na serveru.');
        return;
      }
      if (res.status === 429) {
        setError('Previše zahtjeva. Pokušajte za sat vremena.');
        return;
      }
      if (!res.ok) {
        setError(`Greška ${res.status}. Pokušajte ponovno.`);
        return;
      }
      const j = await res.json();
      if (j?.description) onGenerated(j.description);
      else if (j?.error) setError(j.error);
    } catch (e: any) {
      setError(e?.message || 'Mreža nije dostupna');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 h-10 bg-primary/10 border border-primary/40 text-primary text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/20 disabled:opacity-50 transition-colors"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {busy ? 'Generiram opis…' : 'Generiraj AI opis'}
        {!busy && <Sparkles className="w-3 h-3 opacity-60" />}
      </button>
      {error && <p className="text-[10px] text-muted-foreground/80">{error}</p>}
    </div>
  );
};
