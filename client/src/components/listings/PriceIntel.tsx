import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Listing } from '../../types';

interface Props { listing: Listing }

interface Stats {
  count: number;     // total comparable listings
  median: number;    // median price
  min: number;
  max: number;
  delta: number;     // % difference of THIS listing vs median (negative = cheaper)
}

// Price intelligence rail — "Kako stoji ova cijena?"
// Pulls comparable listings (same make+model OR same category if make/model
// missing) from the live DB and computes median + min + max + delta.
// Drives buyer confidence on price + signals to seller when they're off-market.
export const PriceIntel = ({ listing }: Props) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const attrs = (listing.attributes || {}) as Record<string, any>;
  const categoryId = (listing as any).category_id;

  useEffect(() => {
    const run = async () => {
      try {
        // Try most-specific first (make + model). Fall back to make-only,
        // then to category-only, until we get ≥3 comparables.
        const tryQuery = async (filters: Array<(q: any) => any>) => {
          let q: any = supabase
            .from('listings')
            .select('price, attributes')
            .neq('id', listing.id)
            .gt('price', 0)
            .limit(200);
          for (const f of filters) q = f(q);
          const { data, error } = await q;
          if (error) return [] as number[];
          return (data || []).map((r: any) => Number(r.price)).filter((p: number) => p > 0);
        };

        const filterSets: Array<Array<(q: any) => any>> = [];
        if (attrs.make && attrs.model) {
          filterSets.push([
            (q) => categoryId ? q.eq('category_id', categoryId) : q,
            (q) => q.eq('attributes->>make', attrs.make),
            (q) => q.eq('attributes->>model', attrs.model),
          ]);
        }
        if (attrs.make) {
          filterSets.push([
            (q) => categoryId ? q.eq('category_id', categoryId) : q,
            (q) => q.eq('attributes->>make', attrs.make),
          ]);
        }
        if (categoryId) {
          filterSets.push([(q) => q.eq('category_id', categoryId)]);
        }

        let prices: number[] = [];
        for (const fs of filterSets) {
          prices = await tryQuery(fs);
          if (prices.length >= 3) break;
        }
        prices.sort((a, b) => a - b);

        if (prices.length < 3) {
          setStats(null);
          setLoading(false);
          return;
        }
        const median = prices[Math.floor(prices.length / 2)];
        const min = prices[0];
        const max = prices[prices.length - 1];
        const delta = ((listing.price - median) / median) * 100;
        setStats({ count: prices.length, median, min, max, delta });
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    if (listing.price > 0) run();
    else setLoading(false);
  }, [listing.id, listing.price, categoryId, attrs.make, attrs.model]);

  if (loading || !stats) return null;

  const verdict = stats.delta < -10
    ? { label: 'Odlična cijena', tone: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/5', Icon: TrendingDown }
    : stats.delta > 10
    ? { label: 'Iznad prosjeka', tone: 'text-amber-500 border-amber-500/40 bg-amber-500/5', Icon: TrendingUp }
    : { label: 'Tržišna cijena', tone: 'text-foreground border-border bg-muted/20', Icon: Activity };

  const Icon = verdict.Icon;

  return (
    <div className={`p-5 lg:p-6 border ${verdict.tone}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="text-[10px] font-light uppercase tracking-[0.3em]">
          Cijena u kontekstu — {verdict.label}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[9px] font-light uppercase tracking-[0.25em] opacity-60 mb-1">Najjeftiniji</p>
          <p className="text-sm font-light tabular-nums">{stats.min.toLocaleString('hr-HR')} €</p>
        </div>
        <div>
          <p className="text-[9px] font-light uppercase tracking-[0.25em] opacity-60 mb-1">Medijan</p>
          <p className="text-base font-light tabular-nums">{stats.median.toLocaleString('hr-HR')} €</p>
        </div>
        <div>
          <p className="text-[9px] font-light uppercase tracking-[0.25em] opacity-60 mb-1">Najskuplji</p>
          <p className="text-sm font-light tabular-nums">{stats.max.toLocaleString('hr-HR')} €</p>
        </div>
      </div>

      {/* Bar showing where THIS listing sits in the [min..max] range */}
      <div className="relative h-1 bg-current/10">
        <div
          className="absolute -top-1 -translate-x-1/2 w-px h-3 bg-current"
          style={{ left: `${Math.max(0, Math.min(100, ((listing.price - stats.min) / Math.max(1, stats.max - stats.min)) * 100))}%` }}
        />
      </div>

      <p className="mt-4 text-[10px] font-light opacity-80 leading-relaxed">
        Ovaj oglas je <span className="font-medium tabular-nums">{stats.delta >= 0 ? '+' : ''}{stats.delta.toFixed(0)}%</span>{' '}
        u odnosu na medijan ({stats.count} usporedivih oglasa).
      </p>
    </div>
  );
};
