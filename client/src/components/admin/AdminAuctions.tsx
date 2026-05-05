import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ExternalLink, Check, X, Gavel, Clock } from 'lucide-react';
import {
  listAdminAuctions,
  adminApproveAuction,
  adminRejectAuction,
  type AdminAuctionRow,
} from '../../lib/admin';

const APPROVAL_LABEL: Record<string, string> = {
  pending:  'Čeka odobrenje',
  approved: 'Odobreno',
  rejected: 'Odbijeno',
};

export const AdminAuctions = () => {
  const [rows, setRows] = useState<AdminAuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listAdminAuctions(filter));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    const notes = prompt('Bilješka prodavaču (opcionalno):') ?? undefined;
    setBusy(id);
    const res = await adminApproveAuction(id, notes);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  const reject = async (id: string) => {
    const notes = prompt('Razlog odbijanja (vidi prodavač):');
    if (notes === null) return;
    setBusy(id);
    const res = await adminRejectAuction(id, notes);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.25em] border transition-colors ${
              filter === f ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-foreground/30'
            }`}
          >
            {APPROVAL_LABEL[f] ?? 'Sve'}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
          {rows.length} aukcija
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} /></div>
      ) : rows.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <Gavel className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm font-light text-muted-foreground">Nema aukcija u ovom statusu.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="border border-border bg-card p-5">
              <div className="flex items-start gap-4 flex-wrap">
                {a.listing?.main_image && (
                  <img
                    src={a.listing.main_image}
                    alt={a.listing.title}
                    className="w-24 h-24 object-cover border border-border flex-shrink-0"
                    loading="lazy"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border ${
                      a.approval_status === 'pending' ? 'border-amber-500/40 bg-amber-500/5 text-amber-500'
                      : a.approval_status === 'approved' ? 'border-green-500/40 bg-green-500/5 text-green-500'
                      : 'border-red-500/40 bg-red-500/5 text-red-500'
                    }`}>
                      {APPROVAL_LABEL[a.approval_status]}
                    </span>
                    <span className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
                      {new Date(a.created_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  {a.listing && (
                    <Link to={`/listing/${a.listing.id}`} target="_blank" className="block group">
                      <p className="text-sm font-light text-foreground group-hover:text-primary transition-colors line-clamp-1 inline-flex items-center gap-1.5">
                        {a.listing.title}
                        <ExternalLink className="w-3 h-3 opacity-40" strokeWidth={1.5} />
                      </p>
                    </Link>
                  )}

                  <div className="flex items-center gap-4 flex-wrap text-[10px] font-light text-muted-foreground tabular-nums">
                    <span>Početna: {Number(a.starting_bid_eur).toLocaleString('hr-HR')} €</span>
                    {a.reserve_eur != null && <span>Rezerva: {Number(a.reserve_eur).toLocaleString('hr-HR')} €</span>}
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3" strokeWidth={1.5} />
                      {Math.round((new Date(a.end_at).getTime() - new Date(a.start_at).getTime()) / 86_400_000)} dana
                    </span>
                  </div>

                  <div className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
                    Prodavač: <span className="text-foreground/80">{a.seller?.company_name || a.seller?.email || a.seller_id.slice(0, 8)}</span>
                  </div>

                  {a.approval_notes && (
                    <p className="text-xs font-light text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
                      Bilješka: {a.approval_notes}
                    </p>
                  )}

                  {a.approval_status === 'approved' && (
                    <Link
                      to={`/aukcija/${a.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.2em] text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> Otvori javnu stranicu
                    </Link>
                  )}
                </div>

                {a.approval_status === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => approve(a.id)}
                      disabled={busy === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20 disabled:opacity-30"
                    >
                      <Check className="w-3 h-3" strokeWidth={1.5} /> Odobri
                    </button>
                    <button
                      onClick={() => reject(a.id)}
                      disabled={busy === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-30"
                    >
                      <X className="w-3 h-3" strokeWidth={1.5} /> Odbij
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
