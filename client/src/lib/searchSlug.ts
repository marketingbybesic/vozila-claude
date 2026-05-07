// SEO slugs for /pretraga searches.
//
// Forward:  query state  →  /pretraga/bmw-320d-2018-do-20000
// Reverse:  slug → query state (so the route component can hydrate
// nuqs without a re-redirect loop).
//
// Goal: every meaningful filter combination has ONE canonical URL
// that's keyword-rich + speakable. Less-meaningful combos fall back
// to /pretraga?... (which is already covered by nuqs).

import type { ParsedSearchQuery } from '../types/search';

interface QueryShape {
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  mileage_max?: number;
  fuel?: string;
  transmission?: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const FUEL_LABELS: Record<string, string> = {
  benzin: 'benzin',
  dizel: 'dizel',
  hibrid: 'hibrid',
  ev: 'elektricno',
  elektricno: 'elektricno',
  plin: 'plin',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  rucni: 'rucni',
  automatik: 'automatik',
  poluautomatik: 'poluautomatik',
};

export function buildSearchSlug(q: QueryShape): string | null {
  const parts: string[] = [];
  if (q.make) parts.push(slugify(q.make));
  if (q.model) parts.push(slugify(q.model));
  // Year: prefer explicit year_min as "2018+" else range
  if (q.year_min && q.year_min > 0 && (!q.year_max || q.year_max === q.year_min)) {
    parts.push(`${q.year_min}-i-noviji`);
  } else if (q.year_min && q.year_max && q.year_min > 0 && q.year_max > 0) {
    parts.push(`${q.year_min}-${q.year_max}`);
  } else if (q.year_max && q.year_max > 0) {
    parts.push(`do-${q.year_max}`);
  }
  // Price: prefer "do X" since most users filter by upper bound
  if (q.price_max && q.price_max > 0) parts.push(`do-${q.price_max}`);
  else if (q.price_min && q.price_min > 0) parts.push(`od-${q.price_min}`);
  // Fuel + transmission only if no other body parts already make the slug noisy
  if (parts.length < 4 && q.fuel && FUEL_LABELS[q.fuel]) parts.push(FUEL_LABELS[q.fuel]);
  if (parts.length < 4 && q.transmission && TRANSMISSION_LABELS[q.transmission])
    parts.push(TRANSMISSION_LABELS[q.transmission]);

  if (parts.length === 0) return null;
  return parts.join('-');
}

export function parseSearchSlug(slug: string): ParsedSearchQuery {
  const out: ParsedSearchQuery = {};
  if (!slug) return out;
  const tokens = slug.split('-').filter(Boolean);

  // Walk tokens left → right, pulling well-known shapes off the front.
  // make/model are non-numeric tokens at the start (until we hit a number
  // or a known year/price prefix).
  const consumed = new Set<number>();
  const numericIdx: number[] = [];
  tokens.forEach((t, i) => {
    if (/^\d+$/.test(t)) numericIdx.push(i);
  });

  // The first contiguous non-numeric, non-keyword token = make.
  // The second one (if any, before the first numeric) = model.
  // Stops at the first number / fuel / transmission keyword.
  const skip = new Set([
    'do', 'od', 'i', 'noviji',
    ...Object.values(FUEL_LABELS),
    ...Object.values(TRANSMISSION_LABELS),
  ]);
  const words: string[] = [];
  for (const t of tokens) {
    if (/^\d+$/.test(t)) break;
    if (skip.has(t)) break;
    words.push(t);
  }
  // First word → make, remaining → model (model can be multi-word like "a4 avant")
  if (words.length >= 1) out.make = words[0];
  if (words.length >= 2) out.model = words.slice(1).join(' ');

  // Year + price: walk numbers and look for the prefix word
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!/^\d+$/.test(tok)) continue;
    consumed.add(i);
    const n = parseInt(tok, 10);
    const prev = tokens[i - 1];
    if (prev === 'do') {
      // could be "do 2018" (year) or "do 20000" (price). Years are 4 digits ≤ current year.
      const isYear = tok.length === 4 && n >= 1980 && n <= new Date().getFullYear() + 1;
      if (isYear) out.year_max = n;
      else out.price_max = n;
    } else if (prev === 'od') {
      const isYear = tok.length === 4 && n >= 1980 && n <= new Date().getFullYear() + 1;
      if (isYear) out.year_min = n;
      else out.price_min = n;
    } else if (tokens[i + 1] === 'i' && tokens[i + 2] === 'noviji') {
      out.year_min = n;
    } else if (/^\d{4}$/.test(tok) && n >= 1980 && n <= new Date().getFullYear() + 1) {
      // bare year — treat as year_min if no explicit prefix
      if (out.year_min == null) out.year_min = n;
    } else {
      // bare price
      if (out.price_max == null) out.price_max = n;
    }
  }

  // Fuel / transmission
  for (const t of tokens) {
    if (Object.values(FUEL_LABELS).includes(t)) {
      const canonical = Object.entries(FUEL_LABELS).find(([_, v]) => v === t)?.[0];
      if (canonical) out.fuel = canonical;
    }
    if (Object.values(TRANSMISSION_LABELS).includes(t)) out.transmission = t;
  }

  return out;
}
