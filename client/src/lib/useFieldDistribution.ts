import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

/**
 * Sample-and-bucket the distribution of a numeric field across active
 * listings (optionally scoped to a category). Produces 10 height
 * percentages [0..100] suitable for a sparkline-style filter histogram.
 *
 * Uses a capped sample (1000 rows) to keep payload predictable —
 * histogram precision doesn't need every row in the DB.
 */
export type DistributionField =
  | { kind: 'price' }            // top-level numeric column
  | { kind: 'year' }             // attributes.year (string in JSONB)
  | { kind: 'mileage' }          // attributes.mileage_km
  | { kind: 'power' };           // attributes.power_kw

interface CacheEntry {
  heights: number[];
  ts: number;
}

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 min

function bucketize(values: number[], bins = 10): number[] {
  if (values.length === 0) return new Array(bins).fill(0);
  const sorted = [...values].sort((a, b) => a - b);
  // Use 5th–95th percentile range so a single luxury outlier doesn't flatten everything.
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  if (hi <= lo) return new Array(bins).fill(0);
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    if (v < lo || v > hi) continue;
    const idx = Math.min(bins - 1, Math.floor(((v - lo) / (hi - lo)) * bins));
    counts[idx]++;
  }
  const max = Math.max(...counts, 1);
  return counts.map((c) => Math.round((c / max) * 100));
}

export function useFieldDistribution(
  field: DistributionField,
  categorySlug?: string | null
): { heights: number[]; loading: boolean } {
  const cacheKey = `${field.kind}:${categorySlug ?? '_all'}`;
  const [heights, setHeights] = useState<number[]>(() => {
    const cached = CACHE.get(cacheKey);
    return cached?.heights ?? new Array(10).fill(20);
  });
  const [loading, setLoading] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      setHeights(cached.heights);
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const select = field.kind === 'price' ? 'price' : 'attributes';
        let q = supabase
          .from('listings')
          .select(select)
          .eq('status', 'active')
          .limit(1000);
        if (categorySlug) q = q.eq('category_slug', categorySlug);
        const { data, error } = await q;
        if (error || !data) return;

        const values: number[] = [];
        for (const row of data as any[]) {
          let v: number | null = null;
          if (field.kind === 'price') v = Number(row.price);
          else {
            const attrs = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;
            const raw = attrs?.[
              field.kind === 'year' ? 'year' : field.kind === 'mileage' ? 'mileage_km' : 'power_kw'
            ];
            v = raw == null ? null : Number(raw);
          }
          if (v != null && Number.isFinite(v) && v > 0) values.push(v);
        }
        const buckets = bucketize(values, 10);
        if (!cancelled) {
          CACHE.set(cacheKey, { heights: buckets, ts: Date.now() });
          setHeights(buckets);
        }
      } catch {
        /* swallow — UI keeps default heights */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, field.kind, categorySlug]);

  return { heights, loading };
}
