import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAuditLog, type AuditRow } from '../../lib/admin';

export const AdminAuditLog = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listAuditLog(200).then((d) => { if (alive) { setRows(d); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>;
  }

  return (
    <div className="border border-neutral-800 bg-card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-800">
            <Th>Vrijeme</Th>
            <Th>Akter</Th>
            <Th>Akcija</Th>
            <Th>Entitet</Th>
            <Th>Payload</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="py-12 text-center text-sm font-light text-white/40">Nema zapisa.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="border-b border-neutral-800/60 hover:bg-white/[0.02]">
              <Td className="tabular-nums text-white/60 text-[10px]">{new Date(r.created_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}</Td>
              <Td className="text-white/60 text-xs">{r.actor_role ?? '—'}</Td>
              <Td className="text-white"><code className="text-[10px] font-mono">{r.action}</code></Td>
              <Td className="text-white/60 text-[10px] max-w-[260px] truncate"><code className="font-mono">{r.entity_type}/{r.entity_id?.slice(0, 8) ?? '—'}</code></Td>
              <Td className="text-white/40 text-[10px] max-w-[300px] truncate font-mono">{Object.keys(r.payload ?? {}).length > 0 ? JSON.stringify(r.payload) : '—'}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left px-4 py-3 text-[9px] font-light uppercase tracking-[0.25em] text-white/40">{children}</th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 text-sm font-light text-white/80 ${className}`}>{children}</td>
);
