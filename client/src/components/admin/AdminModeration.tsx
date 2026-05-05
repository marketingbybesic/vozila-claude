import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ExternalLink, Check, X, Eye, Flag } from 'lucide-react';
import {
  listAdminReports,
  adminResolveReport,
  adminDeleteListing,
  type AdminReportRow,
} from '../../lib/admin';

const REASON_LABEL: Record<string, string> = {
  scam: 'Prevara',
  duplicate: 'Duplikat',
  wrong_category: 'Pogrešna kategorija',
  sold: 'Vozilo prodano',
  nsfw: 'Neprikladno',
  other: 'Drugo',
};

export const AdminModeration = () => {
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'reviewed' | 'all'>('open');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listAdminReports(filter));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, action: 'reviewed' | 'resolved' | 'rejected') => {
    setBusy(id);
    const res = await adminResolveReport(id, action);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  const removeListing = async (reportId: string, listingId: string) => {
    if (!confirm('Obriši oglas i označiti prijavu kao riješenu?')) return;
    setBusy(reportId);
    await adminDeleteListing(listingId);
    await adminResolveReport(reportId, 'resolved');
    setBusy(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        {(['open', 'reviewed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.25em] border transition-colors ${
              filter === f ? 'border-primary text-primary bg-primary/5' : 'border-neutral-800 text-white/60 hover:border-white/30'
            }`}
          >
            {f === 'open' ? 'Otvoreno' : f === 'reviewed' ? 'Pregledano' : 'Sve'}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
          {rows.length} prijava
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>
      ) : rows.length === 0 ? (
        <div className="border border-neutral-800 bg-card p-8 text-center">
          <Flag className="w-8 h-8 text-white/20 mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm font-light text-white/40">Nema prijava za pregled.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border border-neutral-800 bg-card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border ${
                      r.reason === 'scam' ? 'border-red-500/40 bg-red-500/5 text-red-400'
                      : 'border-amber-500/40 bg-amber-500/5 text-amber-400'
                    }`}>
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border ${
                      r.status === 'open' ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-neutral-800 text-white/40'
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
                      {new Date(r.created_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  {r.listing && (
                    <Link to={`/listing/${r.listing.id}`} target="_blank" className="block group">
                      <p className="text-sm font-light text-white group-hover:text-primary transition-colors line-clamp-1 inline-flex items-center gap-1.5">
                        {r.listing.title}
                        <ExternalLink className="w-3 h-3 opacity-40" strokeWidth={1.5} />
                      </p>
                    </Link>
                  )}

                  {r.notes && (
                    <p className="text-xs font-light text-white/60 leading-relaxed border-l-2 border-neutral-800 pl-3 mt-2">
                      {r.notes}
                    </p>
                  )}
                </div>

                {r.status === 'open' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => resolve(r.id, 'reviewed')}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white hover:border-white/30 disabled:opacity-30"
                    >
                      <Eye className="w-3 h-3" strokeWidth={1.5} /> Pregledano
                    </button>
                    <button
                      onClick={() => resolve(r.id, 'rejected')}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white/60 hover:border-white/30 disabled:opacity-30"
                    >
                      <X className="w-3 h-3" strokeWidth={1.5} /> Odbij
                    </button>
                    {r.listing && (
                      <button
                        onClick={() => removeListing(r.id, r.listing!.id)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-30"
                      >
                        <Check className="w-3 h-3" strokeWidth={1.5} /> Obriši oglas
                      </button>
                    )}
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
