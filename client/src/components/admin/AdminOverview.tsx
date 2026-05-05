import { useEffect, useState } from 'react';
import { Loader2, Car, Users, ShieldCheck, AlertTriangle, MessageCircle, TrendingUp, Sparkles, Mail, ArrowUpRight } from 'lucide-react';
import { getAdminOverview, type AdminOverviewKpis } from '../../lib/admin';

export const AdminOverview = () => {
  const [kpis, setKpis] = useState<AdminOverviewKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getAdminOverview().then((d) => { if (alive) { setKpis(d); setLoading(false); } });
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

  return (
    <div>
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
    </div>
  );
};
