import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, ShieldCheck, ShieldOff, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listAdminUsers, adminSetUserRole, adminSetDealerVerified, type AdminUserRow } from '../../lib/admin';

const PAGE = 25;
const ROLES = ['user', 'dealer', 'moderator', 'admin', 'inspector', 'support', 'read-only'];

export const AdminUsers = () => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { rows, total } = await listAdminUsers({ search: search || undefined, limit: PAGE, offset });
    setRows(rows);
    setTotal(total);
    setLoading(false);
  }, [search, offset]);

  useEffect(() => { load(); }, [load]);

  const onRoleChange = async (id: string, role: string) => {
    setBusy(id);
    const res = await adminSetUserRole(id, role);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  const onToggleVerify = async (id: string, current: boolean) => {
    setBusy(id);
    const res = await adminSetDealerVerified(id, !current);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <label className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Email ili naziv tvrtke…"
            className="w-full bg-card border border-neutral-800 px-9 py-2 text-sm font-light text-white focus:outline-none focus:border-primary/40"
          />
        </label>
        <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
          {total.toLocaleString('hr-HR')} korisnika
        </span>
      </div>

      <div className="border border-neutral-800 bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <Th>Email</Th>
              <Th>Tvrtka</Th>
              <Th>Rola</Th>
              <Th>Pretplata</Th>
              <Th>Verificiran</Th>
              <Th>Registriran</Th>
              <Th>Akcije</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="w-4 h-4 text-white/40 animate-spin inline-block" strokeWidth={1.5} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm font-light text-white/40">Nema rezultata.</td></tr>
            ) : rows.map((r) => {
              const subActive = r.subscription_status === 'active' || r.subscription_status === 'trialing';
              return (
                <tr key={r.id} className="border-b border-neutral-800/60 hover:bg-white/[0.02]">
                  <Td className="text-white/80">{r.email || '—'}</Td>
                  <Td className="text-white/60 max-w-[180px] truncate">{r.company_name || '—'}</Td>
                  <Td>
                    <select
                      value={r.role}
                      onChange={(e) => onRoleChange(r.id, e.target.value)}
                      disabled={busy === r.id}
                      className="bg-transparent border border-neutral-800 px-2 py-1 text-[10px] font-light uppercase tracking-[0.2em] text-white focus:outline-none focus:border-primary/40 disabled:opacity-50"
                    >
                      {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </Td>
                  <Td>
                    {r.subscription_tier && subActive ? (
                      <span className="inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] bg-primary/10 text-primary border border-primary/30">
                        {r.subscription_tier}
                      </span>
                    ) : <span className="text-white/30 text-[10px]">—</span>}
                  </Td>
                  <Td>
                    <button
                      onClick={() => onToggleVerify(r.id, !!(r.dealer_verified || r.is_verified))}
                      disabled={busy === r.id}
                      title={r.dealer_verified ? 'Ukloni verifikaciju' : 'Verificiraj'}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 border text-[9px] font-light uppercase tracking-[0.2em] transition-colors ${
                        r.dealer_verified || r.is_verified ? 'border-primary/40 text-primary bg-primary/5' : 'border-neutral-800 text-white/50 hover:border-white/30'
                      }`}
                    >
                      {(r.dealer_verified || r.is_verified) ? <><ShieldCheck className="w-3 h-3" strokeWidth={1.5} />Verified</> : <><ShieldOff className="w-3 h-3" strokeWidth={1.5} />Off</>}
                    </button>
                  </Td>
                  <Td className="tabular-nums text-white/40 text-[10px]">{new Date(r.created_at).toLocaleDateString('hr-HR')}</Td>
                  <Td>
                    <Link
                      to={`/saloni/${(r.email ?? '').split('@')[0]}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[10px] font-light uppercase tracking-[0.2em] text-white/60 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                      Profil
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > PAGE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
            {offset + 1} – {Math.min(offset + PAGE, total)} / {total.toLocaleString('hr-HR')}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - PAGE))} disabled={offset === 0}
              className="px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed">Prethodno</button>
            <button onClick={() => setOffset(offset + PAGE)} disabled={offset + PAGE >= total}
              className="px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-neutral-800 text-white hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed">Sljedeće</button>
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
