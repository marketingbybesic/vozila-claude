import { useEffect, useState } from 'react';
import { Loader2, Car, Users, ShieldCheck, AlertTriangle, MessageCircle, TrendingUp, Sparkles, Mail, ArrowUpRight, X } from 'lucide-react';
import { getAdminOverview, getCancelReasonStats, type AdminOverviewKpis, type CancelReasonStat } from '../../lib/admin';

const CANCEL_REASON_LABEL: Record<string, string> = {
  found_other_inspector: 'Drugi inspektor',
  no_longer_buying:      'Više ne kupuje',
  seller_unresponsive:   'Prodavač ne javlja',
  scheduling_conflict:   'Termin ne odgovara',
  price_changed:         'Cijena promijenjena',
  vehicle_sold:          'Vozilo prodano',
  other:                 'Drugo',
};

export const AdminOverview = () => {
  const [kpis, setKpis] = useState<AdminOverviewKpis | null>(null);
  const [reasons, setReasons] = useState<CancelReasonStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([getAdminOverview(), getCancelReasonStats(30)]).then(([k, r]) => {
      if (!alive) return;
      setKpis(k);
      setReasons(r);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>;
  }
  if (!kpis) {
    return <p className="text-sm font-light text-white/40">Pregled nije dostupan.</p>;
  }

  const cards = [
    { label: 'Aktivnih oglasa',  value: kpis.listings_active,  icon: Car,           accent: false },
    { label: 'Novi (7d)',        value: kpis.listings_new_7d,  icon: TrendingUp,    accent: false },
    { label: 'Featured live',    value: kpis.listings_featured, icon: Sparkles,     accent: true },
    { label: 'Korisnici',        value: kpis.users_total,      icon: Users,         accent: false },
    { label: 'Aktivne pretplate', value: kpis.subscribers_active, icon: ShieldCheck, accent: true },
    { label: 'Otvorene prijave', value: kpis.reports_open,     icon: AlertTriangle, accent: kpis.reports_open > 0 },
    { label: 'Novi leadovi',     value: kpis.leads_new,        icon: ArrowUpRight,  accent: kpis.leads_new > 0 },
    { label: 'Razgovori 24h',    value: kpis.conversations_active_24h, icon: MessageCircle, accent: false },
    { label: 'Poruke 24h',       value: kpis.messages_24h,     icon: Mail,          accent: false },
    { label: 'Prodano',          value: kpis.listings_sold,    icon: Car,           accent: false },
  ];

  const totalCancels = reasons.reduce((s, r) => s + r.count, 0);
  const totalRefunded = reasons.reduce((s, r) => s + r.refunded_eur, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`p-5 border ${c.accent ? 'border-primary/40 bg-primary/5' : 'border-neutral-800 bg-card'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-3.5 h-3.5 ${c.accent ? 'text-primary' : 'text-white/40'}`} strokeWidth={1.5} />
                <span className="text-[9px] font-light uppercase tracking-[0.3em] text-white/40">{c.label}</span>
              </div>
              <p className={`text-3xl font-light tabular-nums ${c.accent ? 'text-primary' : 'text-white'}`}>
                {c.value.toLocaleString('hr-HR')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Cancel reasons (last 30 days) */}
      {reasons.length > 0 && (
        <div className="border border-neutral-800 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <X className="w-3.5 h-3.5 text-white/40" strokeWidth={1.5} />
            <p className="text-[9px] font-light uppercase tracking-[0.3em] text-white/40">
              Razlozi otkazivanja inspekcija (30 dana)
            </p>
            <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
              {totalCancels} otkaza · {totalRefunded.toLocaleString('hr-HR')} € povrata
            </span>
          </div>
          <ul className="space-y-2">
            {reasons.map((r) => {
              const pct = totalCancels > 0 ? (r.count / totalCancels) * 100 : 0;
              return (
                <li key={r.reason}>
                  <div className="flex items-center justify-between text-[10px] font-light uppercase tracking-[0.2em] text-white/60 mb-1 tabular-nums">
                    <span>{CANCEL_REASON_LABEL[r.reason] ?? r.reason}</span>
                    <span>
                      {r.count} · {pct.toFixed(0)}% · {r.refunded_eur.toLocaleString('hr-HR')} €
                    </span>
                  </div>
                  <div className="h-1 bg-white/5">
                    <div className="h-full bg-primary/60" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
