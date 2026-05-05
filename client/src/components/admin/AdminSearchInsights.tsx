import { useEffect, useState } from 'react';
import { Loader2, Search as SearchIcon, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTopSearchQueries } from '../../lib/admin';

export const AdminSearchInsights = () => {
  const [rows, setRows] = useState<{ url: string; count: number; zero_pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getTopSearchQueries(50).then((d) => { if (alive) { setRows(d); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>;
  }

  if (rows.length === 0) {
    return (
      <div className="border border-neutral-800 bg-card p-8 text-center">
        <SearchIcon className="w-8 h-8 text-white/20 mx-auto mb-3" strokeWidth={1} />
        <p className="text-sm font-light text-white/40 mb-2">Nema zabilježenih pretraga (zadnjih 7 dana).</p>
        <p className="text-[10px] font-light uppercase tracking-[0.25em] text-white/30">Logiranje pretraga aktivira se kad ListingFeed pošalje search_log redove.</p>
      </div>
    );
  }

  const zeroResultRows = rows.filter((r) => r.zero_pct > 50);

  return (
    <div className="space-y-6">
      {zeroResultRows.length > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-[10px] font-light uppercase tracking-[0.25em] text-amber-400 mb-2 inline-flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
            {zeroResultRows.length} pretraga s 0 rezultata u {'>'}50% slučajeva
          </p>
          <p className="text-xs font-light text-amber-300/80 leading-relaxed">
            Ove pretrage označavaju kategoriju ili kombinaciju filtera koja nedostaje. Pregled niže.
          </p>
        </div>
      )}

      <div className="border border-neutral-800 bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <Th>URL</Th>
              <Th>Pretraga (7d)</Th>
              <Th>0-rezultata %</Th>
              <Th>Akcije</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.url} className="border-b border-neutral-800/60 hover:bg-white/[0.02]">
                <Td className="text-white/80 max-w-[320px] truncate font-mono text-[10px]">{r.url}</Td>
                <Td className="tabular-nums">{r.count.toLocaleString('hr-HR')}</Td>
                <Td className="tabular-nums">
                  <span className={r.zero_pct > 50 ? 'text-amber-400' : r.zero_pct > 20 ? 'text-yellow-400/80' : 'text-white/60'}>
                    {r.zero_pct.toFixed(0)}%
                  </span>
                </Td>
                <Td>
                  <Link to={r.url} target="_blank" className="text-[10px] font-light uppercase tracking-[0.2em] text-primary hover:underline">
                    Otvori
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left px-4 py-3 text-[9px] font-light uppercase tracking-[0.25em] text-white/40">{children}</th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 text-sm font-light text-white/80 ${className}`}>{children}</td>
);
