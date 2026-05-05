import { useEffect, useState, useCallback } from 'react';
import { Loader2, CreditCard, AlertTriangle, TrendingUp, Wrench, FileSearch } from 'lucide-react';
import {
  getPaymentsSummary,
  listStripeEvents,
  type PaymentsSummary,
  type StripeEventRow,
} from '../../lib/admin';

const EVENT_TYPES = [
  'all',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
];

export const AdminPayments = () => {
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [events, setEvents] = useState<StripeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [s, e] = await Promise.all([getPaymentsSummary(), listStripeEvents(filter, 100)]);
    setSummary(s);
    setEvents(e);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const cards = summary ? [
    { label: 'Aktivne pretplate', value: summary.subs_active, icon: TrendingUp, accent: true },
    { label: 'Past due',         value: summary.subs_past_due, icon: AlertTriangle, accent: summary.subs_past_due > 0 },
    { label: 'Featured live',     value: summary.featured_active, icon: TrendingUp, accent: false },
    { label: 'Checkouts 30d',     value: summary.checkouts_30d, icon: CreditCard, accent: false },
    { label: 'Nove pretplate 30d', value: summary.new_subs_30d, icon: TrendingUp, accent: false },
    { label: 'Otkazane 30d',      value: summary.canceled_subs_30d, icon: AlertTriangle, accent: false },
    { label: 'Failed invoices 30d', value: summary.failed_invoices_30d, icon: AlertTriangle, accent: summary.failed_invoices_30d > 0 },
    { label: 'VIN izvještaji plaćeni', value: summary.vin_reports_paid, icon: FileSearch, accent: false },
    { label: 'Inspekcije plaćene', value: summary.inspections_paid, icon: Wrench, accent: false },
    { label: 'Stripe eventi 30d', value: summary.events_30d, icon: CreditCard, accent: false },
  ] : [];

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`p-5 border ${c.accent ? 'border-primary/40 bg-primary/5' : 'border-neutral-800 bg-card'}`}>
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
      )}

      {/* Events feed */}
      <div>
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="bg-card border border-neutral-800 px-3 py-2 text-xs font-light text-white focus:outline-none focus:border-primary/40">
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-white/40 tabular-nums">
            {events.length} eventova
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-white/40 animate-spin" strokeWidth={1.5} /></div>
        ) : events.length === 0 ? (
          <div className="border border-neutral-800 bg-card p-8 text-center">
            <CreditCard className="w-8 h-8 text-white/20 mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm font-light text-white/40">Nema Stripe eventova.</p>
            <p className="text-[10px] font-light uppercase tracking-[0.25em] text-white/30 mt-2">Webhook će popuniti tablicu nakon prve transakcije.</p>
          </div>
        ) : (
          <div className="border border-neutral-800 bg-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <Th>Vrijeme</Th>
                  <Th>Tip</Th>
                  <Th>Event ID</Th>
                  <Th>Iznos / Meta</Th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const obj = e.payload?.data?.object ?? {};
                  const meta = obj.metadata ?? {};
                  const amount = obj.amount_total ?? obj.amount_paid ?? null;
                  return (
                    <tr key={e.id} className="border-b border-neutral-800/60 hover:bg-white/[0.02]">
                      <Td className="tabular-nums text-white/40 text-[10px]">{new Date(e.processed_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                      <Td><code className="text-[10px] font-mono">{e.type}</code></Td>
                      <Td><code className="text-[10px] font-mono text-white/40">{e.id.slice(0, 16)}…</code></Td>
                      <Td className="text-xs">
                        {amount != null && (
                          <span className="text-white tabular-nums mr-2">
                            {(amount / 100).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {(obj.currency ?? 'eur').toUpperCase()}
                          </span>
                        )}
                        {meta.kind && (
                          <span className="text-[10px] text-white/50">[{meta.kind}{meta.tier ? ` · ${meta.tier}` : ''}]</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
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
