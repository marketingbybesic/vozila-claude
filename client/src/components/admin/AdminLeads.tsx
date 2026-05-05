import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Phone, Mail, ExternalLink, Check } from 'lucide-react';
import { listAdminLeads, adminSetLeadStatus, type AdminLeadRow } from '../../lib/admin';

const PARTNER_LABEL: Record<string, string> = {
  financing: 'Financiranje',
  insurance: 'Osiguranje',
  transport: 'Transport',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Novi',
  contacted: 'Kontaktiran',
  won: 'Dobiven',
  lost: 'Izgubljen',
};

export const AdminLeads = () => {
  const [rows, setRows] = useState<AdminLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerType, setPartnerType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listAdminLeads({ partner_type: partnerType, status }));
    setLoading(false);
  }, [partnerType, status]);

  useEffect(() => { load(); }, [load]);

  const setStatusFor = async (id: string, next: 'new' | 'contacted' | 'won' | 'lost') => {
    setBusy(id);
    const payoutPrompt = next === 'won' ? prompt('Payout u EUR (ostavite prazno za 0):') : null;
    const payout = payoutPrompt ? Number(payoutPrompt) : undefined;
    const res = await adminSetLeadStatus(id, next, payout);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <select value={partnerType} onChange={(e) => setPartnerType(e.target.value)}
          className="bg-card border border-neutral-800 px-3 py-2 text-xs font-light text-white focus:outline-none focus:border-primary/40">
          <option value="all">Svi partneri</option>
          <option value="financing">Financiranje</option>
          <option value="insurance">Osiguranje</option>
          <option value="transport">Transport</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-card border border-neutral-800 px-3 py-2 text-xs font-light text-white focus:outline-none focus:border-primary/40">
          <option value="all">Svi statusi</option>
          <option value="new">Novi</option>
          <option value="contacted">Kontaktirani</option>
          <option value="won">Dobiveni</option>
          <option value="lost">Izgubljeni</option>
        </select>
        <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
          {rows.length} leadova
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>
      ) : rows.length === 0 ? (
        <div className="border border-neutral-800 bg-card p-8 text-center">
          <p className="text-sm font-light text-white/40">Nema leadova s odabranim filterima.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((l) => (
            <li key={l.id} className="border border-neutral-800 bg-card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border border-primary/40 bg-primary/5 text-primary">
                      {PARTNER_LABEL[l.partner_type] ?? l.partner_type}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border ${
                      l.status === 'new' ? 'border-amber-500/40 bg-amber-500/5 text-amber-400'
                      : l.status === 'won' ? 'border-green-500/40 bg-green-500/5 text-green-400'
                      : l.status === 'lost' ? 'border-red-500/40 bg-red-500/5 text-red-400'
                      : 'border-neutral-800 text-white/50'
                    }`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                    <span className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
                      {new Date(l.created_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {l.payout_eur != null && (
                      <span className="text-[10px] font-light uppercase tracking-[0.25em] text-green-400 tabular-nums">
                        +{Number(l.payout_eur).toLocaleString('hr-HR')} €
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-light text-white">
                    {l.payload?.name || '(bez imena)'}
                  </p>

                  <div className="flex items-center gap-4 flex-wrap text-[10px] font-light text-white/60">
                    {l.payload?.phone && (
                      <a href={`tel:${l.payload.phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
                        <Phone className="w-3 h-3" strokeWidth={1.5} /> {l.payload.phone}
                      </a>
                    )}
                    {l.payload?.email && (
                      <a href={`mailto:${l.payload.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                        <Mail className="w-3 h-3" strokeWidth={1.5} /> {l.payload.email}
                      </a>
                    )}
                    {l.listing_id && (
                      <Link to={`/listing/${l.listing_id}`} target="_blank" className="inline-flex items-center gap-1.5 hover:text-white">
                        <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> Oglas
                      </Link>
                    )}
                  </div>

                  {/* Per-partner payload extras */}
                  <details className="mt-1">
                    <summary className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 hover:text-white cursor-pointer">Detalji</summary>
                    <pre className="mt-2 text-[10px] font-light text-white/60 leading-relaxed bg-black/40 p-3 overflow-x-auto">
                      {JSON.stringify(l.payload, null, 2)}
                    </pre>
                  </details>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {l.status === 'new' && (
                    <button onClick={() => setStatusFor(l.id, 'contacted')} disabled={busy === l.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white hover:border-white/30 disabled:opacity-30">
                      <Check className="w-3 h-3" strokeWidth={1.5} /> Kontaktiran
                    </button>
                  )}
                  {l.status !== 'won' && l.status !== 'lost' && (
                    <>
                      <button onClick={() => setStatusFor(l.id, 'won')} disabled={busy === l.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 disabled:opacity-30">
                        <Check className="w-3 h-3" strokeWidth={1.5} /> Dobiven
                      </button>
                      <button onClick={() => setStatusFor(l.id, 'lost')} disabled={busy === l.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white/60 hover:border-white/30 disabled:opacity-30">
                        Izgubljen
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
