import { useEffect, useState } from 'react';
import { Loader2, Clock, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { getCronJobStatuses, listCronRuns, type CronJobStatus, type CronRunRow } from '../../lib/admin';

export const AdminCron = () => {
  const [jobs, setJobs] = useState<CronJobStatus[]>([]);
  const [recent, setRecent] = useState<CronRunRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([getCronJobStatuses(), listCronRuns(40)]).then(([j, r]) => {
      if (!alive) return;
      setJobs(j); setRecent(r); setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>;
  }

  const fmtDuration = (ms: number | null) => ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  const fmtRel = (ts: string | null) => {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'upravo';
    if (min < 60) return `prije ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `prije ${hr} h`;
    return `prije ${Math.floor(hr / 24)} d`;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 mb-3">Stanje poslova</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {jobs.map((j) => {
            const tone =
              j.last_status === 'success' ? 'border-green-500/40 bg-green-500/5'
              : j.last_status === 'failed' ? 'border-red-500/40 bg-red-500/5'
              : j.last_status === 'running' ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-neutral-800 bg-card';
            const Icon =
              j.last_status === 'success' ? CheckCircle2
              : j.last_status === 'failed' ? AlertTriangle
              : Clock;
            const iconColor =
              j.last_status === 'success' ? 'text-green-400'
              : j.last_status === 'failed' ? 'text-red-400'
              : j.last_status === 'running' ? 'text-amber-400'
              : 'text-white/40';
            return (
              <div key={j.job_name} className={`p-5 border ${tone}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} strokeWidth={1.5} />
                  <p className="text-sm font-light text-white">{j.job_name}</p>
                  <span className="ml-auto text-[9px] font-light uppercase tracking-[0.25em] text-white/40">
                    {j.last_status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] font-light text-white/60">
                  <div>
                    <span className="text-white/40 uppercase tracking-[0.2em] block">Posljednji</span>
                    <span className="tabular-nums text-white/80">{fmtRel(j.last_finished_at ?? j.last_started_at)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-[0.2em] block">Trajanje</span>
                    <span className="tabular-nums text-white/80">{fmtDuration(j.last_duration_ms)}</span>
                  </div>
                </div>
                {j.last_error && (
                  <p className="mt-3 text-[10px] font-mono text-red-400/80 break-all">{j.last_error}</p>
                )}
                {j.last_result && Object.keys(j.last_result).length > 0 && j.last_status === 'success' && (
                  <p className="mt-2 text-[10px] font-mono text-white/40 truncate">{JSON.stringify(j.last_result)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-light uppercase tracking-[0.25em] text-white/40 mb-3 inline-flex items-center gap-2">
          <Activity className="w-3 h-3" strokeWidth={1.5} />
          Posljednji runovi
        </p>
        {recent.length === 0 ? (
          <div className="border border-neutral-800 bg-card p-6 text-center">
            <p className="text-sm font-light text-white/40">Nema runova zabilježenih u cron_runs tablici.</p>
            <p className="text-[10px] font-light uppercase tracking-[0.25em] text-white/30 mt-2">Edge Functions zapisuju heartbeat preko `withCron(name, fn)`.</p>
          </div>
        ) : (
          <div className="border border-neutral-800 bg-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <Th>Posao</Th>
                  <Th>Status</Th>
                  <Th>Pokrenut</Th>
                  <Th>Trajanje</Th>
                  <Th>Rezultat</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-800/60 hover:bg-white/[0.02]">
                    <Td className="text-white/80 text-xs">{r.job_name}</Td>
                    <Td>
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border ${
                        r.status === 'success' ? 'border-green-500/40 bg-green-500/5 text-green-400'
                        : r.status === 'failed' ? 'border-red-500/40 bg-red-500/5 text-red-400'
                        : 'border-amber-500/40 bg-amber-500/5 text-amber-400'
                      }`}>
                        {r.status}
                      </span>
                    </Td>
                    <Td className="tabular-nums text-white/40 text-[10px]">{new Date(r.started_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                    <Td className="tabular-nums text-white/60 text-[10px]">{fmtDuration(r.duration_ms)}</Td>
                    <Td className="text-[10px] font-mono text-white/40 max-w-[280px] truncate">
                      {r.error ? <span className="text-red-400/80">{r.error}</span> : (r.result ? JSON.stringify(r.result) : '—')}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
