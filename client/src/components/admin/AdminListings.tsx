import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Sparkles, Trash2, ExternalLink, Pause, CheckCircle2, Play } from 'lucide-react';
import {
  listAdminListings,
  adminSetListingStatus,
  adminForceFeature,
  adminUnfeatureListing,
  adminDeleteListing,
  type AdminListingRow,
} from '../../lib/admin';

const PAGE = 25;

export const AdminListings = () => {
  const [rows, setRows] = useState<AdminListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'paused' | 'sold' | 'draft'>('all');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { rows, total } = await listAdminListings({ search: search || undefined, status, limit: PAGE, offset });
    setRows(rows);
    setTotal(total);
    setLoading(false);
  }, [search, status, offset]);

  useEffect(() => { load(); }, [load]);

  const onAction = async (id: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(id);
    const res = await action();
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <label className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Pretraži po naslovu…"
            className="w-full bg-card border border-neutral-800 px-9 py-2 text-sm font-light text-white focus:outline-none focus:border-primary/40"
          />
        </label>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as any); setOffset(0); }}
          className="bg-card border border-neutral-800 px-3 py-2 text-xs font-light text-white focus:outline-none focus:border-primary/40"
        >
          <option value="all">Svi statusi</option>
          <option value="active">Aktivni</option>
          <option value="paused">Pauzirani</option>
          <option value="sold">Prodani</option>
          <option value="draft">Nacrti</option>
        </select>
        <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
          {total.toLocaleString('hr-HR')} oglasa
        </span>
      </div>

      <div className="border border-neutral-800 bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <Th>Naslov</Th>
              <Th>Cijena</Th>
              <Th>Status</Th>
              <Th>Featured</Th>
              <Th>Vlasnik</Th>
              <Th>Pregledi</Th>
              <Th>Datum</Th>
              <Th>Akcije</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-4 h-4 text-white/40 animate-spin inline-block" strokeWidth={1.5} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-sm font-light text-white/40">Nema rezultata.</td></tr>
            ) : rows.map((r) => {
              const featured = r.is_featured && r.featured_until && new Date(r.featured_until) > new Date();
              return (
                <tr key={r.id} className="border-b border-neutral-800/60 hover:bg-white/[0.02]">
                  <Td>
                    <Link to={`/listing/${r.id}`} target="_blank" className="text-sm font-light text-white hover:text-primary inline-flex items-center gap-1.5">
                      <span className="line-clamp-1 max-w-[260px]">{r.title}</span>
                      <ExternalLink className="w-3 h-3 opacity-40" strokeWidth={1.5} />
                    </Link>
                  </Td>
                  <Td className="tabular-nums">{r.price.toLocaleString('hr-HR')} €</Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td>{featured ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/30"><Sparkles className="w-2.5 h-2.5" strokeWidth={1.5} />{r.featured_tier ?? 'on'}</span> : <span className="text-white/30 text-[10px]">—</span>}</Td>
                  <Td className="text-xs text-white/60 max-w-[160px] truncate">{r.owner?.company_name || r.owner?.email || '—'}</Td>
                  <Td className="tabular-nums text-white/60">{(r.views_count ?? 0).toLocaleString('hr-HR')}</Td>
                  <Td className="tabular-nums text-white/40 text-[10px]">{new Date(r.created_at).toLocaleDateString('hr-HR')}</Td>
                  <Td>
                    <div className="inline-flex items-center gap-1.5">
                      {featured ? (
                        <ActionBtn title="Ukloni featured" onClick={() => onAction(r.id, () => adminUnfeatureListing(r.id))} disabled={busy === r.id}>
                          <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                        </ActionBtn>
                      ) : (
                        <ActionBtn title="Force featured 7d" tone="primary" onClick={() => onAction(r.id, () => adminForceFeature(r.id, 7))} disabled={busy === r.id}>
                          <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                        </ActionBtn>
                      )}
                      {r.status === 'active' ? (
                        <ActionBtn title="Pauziraj" onClick={() => onAction(r.id, () => adminSetListingStatus(r.id, 'paused'))} disabled={busy === r.id}>
                          <Pause className="w-3 h-3" strokeWidth={1.5} />
                        </ActionBtn>
                      ) : r.status === 'paused' ? (
                        <ActionBtn title="Aktiviraj" onClick={() => onAction(r.id, () => adminSetListingStatus(r.id, 'active'))} disabled={busy === r.id}>
                          <Play className="w-3 h-3" strokeWidth={1.5} />
                        </ActionBtn>
                      ) : null}
                      {(r.status === 'active' || r.status === 'paused') && (
                        <ActionBtn title="Označi kao prodano" onClick={() => onAction(r.id, () => adminSetListingStatus(r.id, 'sold'))} disabled={busy === r.id}>
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                        </ActionBtn>
                      )}
                      <ActionBtn title="Obriši" tone="danger" onClick={() => {
                        if (confirm('Obriši ovaj oglas? Akcija nepovratna.')) onAction(r.id, () => adminDeleteListing(r.id));
                      }} disabled={busy === r.id}>
                        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                      </ActionBtn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
            {offset + 1} – {Math.min(offset + PAGE, total)} / {total.toLocaleString('hr-HR')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE))}
              disabled={offset === 0}
              className="px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >Prethodno</button>
            <button
              onClick={() => setOffset(offset + PAGE)}
              disabled={offset + PAGE >= total}
              className="px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >Sljedeće</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left px-4 py-3 text-[9px] font-light uppercase tracking-[0.25em] text-white/40">{children}</th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 text-sm font-light text-white/80 ${className}`}>{children}</td>
);
const StatusPill = ({ status }: { status: string }) => {
  const tone =
    status === 'active' || status === 'published' ? 'text-green-400 border-green-500/40 bg-green-500/5'
    : status === 'paused' ? 'text-amber-400 border-amber-500/40 bg-amber-500/5'
    : status === 'sold' ? 'text-red-400 border-red-500/40 bg-red-500/5'
    : 'text-white/50 border-neutral-800 bg-white/5';
  return <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border ${tone}`}>{status}</span>;
};
const ActionBtn = ({ children, title, tone, onClick, disabled }: { children: React.ReactNode; title: string; tone?: 'primary' | 'danger'; onClick: () => void; disabled?: boolean }) => {
  const cls = tone === 'danger'
    ? 'text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/30'
    : tone === 'primary'
    ? 'text-primary hover:bg-primary/10 border-transparent hover:border-primary/30'
    : 'text-white/60 hover:text-white border border-neutral-800 hover:border-white/30';
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center justify-center w-7 h-7 transition-colors disabled:opacity-30 disabled:cursor-wait ${cls}`}>
      {children}
    </button>
  );
};
