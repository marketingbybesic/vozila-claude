import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { runSeed } from '../../lib/runSeed';
import {
  LayoutDashboard, Users, Car, ShieldCheck, DatabaseZap, CheckCircle,
  Flag, ArrowUpRight, Search, ScrollText, Power, Loader2, BarChart3,
  CreditCard, Activity
} from 'lucide-react';
import { getMyAdminRole, type AdminRole, canModerate, canViewPayments, canWrite } from '../../lib/admin';

// Lazy-load each section so the admin shell stays small.
const AdminOverview      = lazy(() => import('./AdminOverview').then(m => ({ default: m.AdminOverview })));
const AdminListings      = lazy(() => import('./AdminListings').then(m => ({ default: m.AdminListings })));
const AdminUsers         = lazy(() => import('./AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminModeration    = lazy(() => import('./AdminModeration').then(m => ({ default: m.AdminModeration })));
const AdminLeads         = lazy(() => import('./AdminLeads').then(m => ({ default: m.AdminLeads })));
const AdminPayments      = lazy(() => import('./AdminPayments').then(m => ({ default: m.AdminPayments })));
const AdminCron          = lazy(() => import('./AdminCron').then(m => ({ default: m.AdminCron })));
const AdminSearchInsights = lazy(() => import('./AdminSearchInsights').then(m => ({ default: m.AdminSearchInsights })));
const AdminAuditLog      = lazy(() => import('./AdminAuditLog').then(m => ({ default: m.AdminAuditLog })));
const AdminKillSwitch    = lazy(() => import('./AdminKillSwitch').then(m => ({ default: m.AdminKillSwitch })));
const AdManager          = lazy(() => import('./AdManager').then(m => ({ default: m.AdManager })));

type SectionId =
  | 'overview' | 'listings' | 'users' | 'moderation' | 'leads' | 'payments'
  | 'search' | 'ads' | 'cron' | 'audit' | 'killswitch' | 'seed';

interface SectionDef {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  // Required role bucket. 'any' = any admin role works.
  gate: 'any' | 'moderate' | 'write' | 'payments';
}

const SECTIONS: SectionDef[] = [
  { id: 'overview',   label: 'Pregled',           icon: LayoutDashboard, gate: 'any' },
  { id: 'listings',   label: 'Oglasi',            icon: Car,             gate: 'moderate' },
  { id: 'users',      label: 'Korisnici',         icon: Users,           gate: 'write' },
  { id: 'moderation', label: 'Moderacija',        icon: Flag,            gate: 'moderate' },
  { id: 'leads',      label: 'Leadovi',           icon: ArrowUpRight,    gate: 'any' },
  { id: 'payments',   label: 'Plaćanja',          icon: CreditCard,      gate: 'payments' },
  { id: 'search',     label: 'Pretrage',          icon: Search,          gate: 'any' },
  { id: 'ads',        label: 'Reklame',           icon: BarChart3,       gate: 'write' },
  { id: 'cron',       label: 'Cron',              icon: Activity,        gate: 'any' },
  { id: 'audit',      label: 'Audit log',         icon: ScrollText,      gate: 'any' },
  { id: 'killswitch', label: 'Kill-switch',       icon: Power,           gate: 'write' },
  { id: 'seed',       label: 'Seed',              icon: DatabaseZap,     gate: 'write' },
];

function canAccess(role: AdminRole | null, gate: SectionDef['gate']): boolean {
  if (!role) return false;
  if (gate === 'any') return true;
  if (gate === 'write') return canWrite(role);
  if (gate === 'payments') return canViewPayments(role);
  if (gate === 'moderate') return canModerate(role);
  return false;
}

export const AdminDashboard = () => {
  const [role, setRole] = useState<AdminRole | null | 'pending'>('pending');
  const [params, setParams] = useSearchParams();
  const sectionParam = (params.get('section') as SectionId | null) ?? 'overview';
  const [active, setActive] = useState<SectionId>(sectionParam);

  useEffect(() => {
    let alive = true;
    getMyAdminRole().then((r) => { if (alive) setRole(r); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setActive(sectionParam);
  }, [sectionParam]);

  const setSection = (id: SectionId) => {
    setActive(id);
    const next = new URLSearchParams(params);
    next.set('section', id);
    setParams(next, { replace: true });
  };

  if (role === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-8">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-neutral-800 rounded-none flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-white/40" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-light text-white tracking-widest mb-2">Pristup odbijen</h1>
            <p className="text-sm font-light text-white/40">
              Samo administratori, vlasnici, moderatori i podrška imaju pristup.
            </p>
          </div>
          <Link to="/" className="inline-flex items-center justify-center px-8 py-4 bg-white text-black text-[11px] font-light uppercase tracking-widest hover:bg-neutral-200 transition-all">
            Natrag na početnu
          </Link>
        </div>
      </div>
    );
  }

  const visibleSections = SECTIONS.filter((s) => canAccess(role, s.gate));
  const activeDef = visibleSections.find((s) => s.id === active) ?? visibleSections[0];
  const ActiveIcon = activeDef.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="w-5 h-5 text-white/40" strokeWidth={1.5} />
          <h1 className="text-xl font-light text-white tracking-widest">Admin Command Center</h1>
          <span className="ml-auto inline-flex items-center px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border border-primary/40 bg-primary/5 text-primary">
            {role}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <nav className="lg:sticky lg:top-6 lg:self-start">
            <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2 lg:pb-0">
              {visibleSections.map((s) => {
                const Icon = s.icon;
                const isActive = s.id === active;
                return (
                  <li key={s.id} className="flex-shrink-0">
                    <button
                      onClick={() => setSection(s.id)}
                      className={`w-full inline-flex items-center gap-3 px-3 py-2.5 text-[11px] font-light uppercase tracking-[0.2em] border transition-colors whitespace-nowrap ${
                        isActive
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-white/60 hover:bg-white/[0.03] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Main */}
          <main className="min-w-0">
            <div className="flex items-center gap-2 mb-5">
              <ActiveIcon className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h2 className="text-sm font-light uppercase tracking-[0.25em] text-white">{activeDef.label}</h2>
            </div>

            <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>}>
              {active === 'overview'   && <AdminOverview />}
              {active === 'listings'   && <AdminListings />}
              {active === 'users'      && <AdminUsers />}
              {active === 'moderation' && <AdminModeration />}
              {active === 'leads'      && <AdminLeads />}
              {active === 'payments'   && <AdminPayments />}
              {active === 'search'     && <AdminSearchInsights />}
              {active === 'ads'        && <AdManager />}
              {active === 'cron'       && <AdminCron />}
              {active === 'audit'      && <AdminAuditLog />}
              {active === 'killswitch' && <AdminKillSwitch />}
              {active === 'seed'       && <SeedSection />}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
};

// Seed section kept small — same flow as before, in its own slot.
const SeedSection = () => {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);

  const run = async () => {
    if (!confirm('Insertati 50 testnih oglasa u bazu podataka?')) return;
    setSeeding(true);
    setResult(null);
    try {
      const r = await runSeed();
      setResult({ inserted: r.inserted, errors: r.errors });
    } catch (err: any) {
      setResult({ inserted: 0, errors: [err?.message || 'Nepoznata greška'] });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white/[0.02] border border-neutral-800 p-6">
        <div className="flex items-start gap-4 mb-4">
          <DatabaseZap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-light text-white/70 mb-1 uppercase tracking-widest">Seed baze podataka</p>
            <p className="text-xs font-light text-white/40 leading-relaxed">
              Insertiraj 50 realnih hrvatskih oglasa za testiranje. Zahtijeva kategoriju "osobni-automobili" u bazi.
            </p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-light uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {seeding ? <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />Seediranje…</> : <><DatabaseZap className="w-4 h-4" strokeWidth={1.5} />Pokreni Seed</>}
        </button>
      </div>

      {result && (
        <div className={`border p-4 flex items-start gap-3 ${result.errors.length === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${result.errors.length === 0 ? 'text-green-400' : 'text-amber-400'}`} strokeWidth={1.5} />
          <div className="space-y-1">
            <p className="text-xs font-light uppercase tracking-widest text-white/70">Insertirano: {result.inserted} oglasa</p>
            {result.errors.length > 0 && (
              <ul className="space-y-0.5">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-[10px] font-light text-amber-400/80 uppercase tracking-widest">{err}</li>
                ))}
                {result.errors.length > 5 && <li className="text-[10px] font-light text-white/30 uppercase tracking-widest">+{result.errors.length - 5} više grešaka</li>}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
