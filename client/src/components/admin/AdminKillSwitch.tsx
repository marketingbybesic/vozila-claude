import { useEffect, useState } from 'react';
import { Loader2, Power, AlertTriangle } from 'lucide-react';
import { listKillSwitches, setKillSwitch, type KillSwitch } from '../../lib/admin';

const LABEL: Record<string, string> = {
  new_listings: 'Novi oglasi',
  payments: 'Plaćanja',
  messaging: 'Poruke',
  signups: 'Registracije',
  maintenance_banner: 'Maintenance banner',
};

const HINT: Record<string, string> = {
  new_listings: 'Onemogući predaju novih oglasa. Postojeći ostaju vidljivi.',
  payments: 'Onemogući Stripe Checkout (Boost + pretplate + VIN izvještaj).',
  messaging: 'Onemogući slanje novih poruka. Postojeći threadi i dalje rade.',
  signups: 'Onemogući registraciju novih korisnika.',
  maintenance_banner: 'Prikaži maintenance banner svim posjetiteljima.',
};

export const AdminKillSwitch = () => {
  const [rows, setRows] = useState<KillSwitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setRows(await listKillSwitches());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (sw: KillSwitch) => {
    const next = !sw.enabled;
    if (next && !confirm(`AKTIVIRATI kill-switch "${LABEL[sw.name] ?? sw.name}"? Korisnici će izgubiti pristup.`)) return;
    const reason = next ? prompt('Razlog (opcionalno):') ?? undefined : undefined;
    setBusy(sw.name);
    const res = await setKillSwitch(sw.name, next, reason);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>;
  }

  return (
    <div>
      <div className="flex items-start gap-3 mb-5 p-4 border border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-xs font-light text-amber-300/90 leading-relaxed">
          Kill-switchevi mijenjaju ponašanje stranice odmah za sve korisnike. Promjene se zapisuju u audit log. Ne aktivirati bez plana.
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map((sw) => (
          <li key={sw.name} className="border border-neutral-800 bg-card p-5 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Power className={`w-3.5 h-3.5 ${sw.enabled ? 'text-red-400' : 'text-white/30'}`} strokeWidth={1.5} />
                <p className="text-sm font-light text-white">{LABEL[sw.name] ?? sw.name}</p>
                {sw.enabled && (
                  <span className="inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border border-red-500/40 bg-red-500/5 text-red-400">
                    Aktivan
                  </span>
                )}
              </div>
              <p className="text-xs font-light text-white/50 leading-relaxed">{HINT[sw.name] ?? ''}</p>
              {sw.enabled && sw.reason && (
                <p className="mt-2 text-[10px] font-light uppercase tracking-[0.2em] text-amber-400/80">Razlog: {sw.reason}</p>
              )}
            </div>
            <button
              onClick={() => toggle(sw)}
              disabled={busy === sw.name}
              className={`relative w-12 h-6 transition-colors ${sw.enabled ? 'bg-red-500/30 border border-red-500/40' : 'bg-white/5 border border-neutral-800'} disabled:opacity-50`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 transition-transform ${sw.enabled ? 'translate-x-6 bg-red-400' : 'translate-x-0 bg-white'}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
