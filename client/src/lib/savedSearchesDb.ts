// DB-backed saved searches — the authoritative store for signed-in users.
// localStorage savedSearches.ts stays as the anonymous fallback + UI cache.
//
// The daily cron (saved-searches-digest Edge Function) only knows about the
// DB rows. So whenever a user toggles email_alert=true on a search, we
// upsert it into saved_searches with structured `params`. When they remove
// the alert, we delete the row.

import { supabase } from './supabase';

export interface DbSavedSearch {
  id: string;
  user_id: string;
  label: string;
  url: string;
  category_slug: string | null;
  params: Record<string, unknown>;
  last_seen_ids: string[];
  email_alert: boolean;
  push_alert: boolean;
  last_visited_at: string;
  last_digest_sent_at: string | null;
  created_at: string;
}

// Parse the URL search string into a structured params object the Edge
// Function can replay server-side. Mirrors ListingFeed.tsx queryState shape.
export function paramsFromUrl(url: string): Record<string, unknown> {
  const q = url.includes('?') ? url.split('?')[1] : '';
  const sp = new URLSearchParams(q);
  const out: Record<string, unknown> = {};
  for (const [k, v] of sp.entries()) {
    if (!v) continue;
    // numeric coercion for the params the digest cron understands.
    if (['price_min', 'price_max', 'year_min', 'year_max', 'mileage_max', 'power_min'].includes(k)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Upsert a saved search under the user's account, optionally enabling email
// alerts. Idempotent on (user_id, url).
export async function upsertSavedSearchDb(opts: {
  url: string;
  label: string;
  categorySlug?: string | null;
  emailAlert?: boolean;
  currentIds?: string[];
}): Promise<DbSavedSearch | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const params = paramsFromUrl(opts.url);
  const payload = {
    user_id: user.id,
    label: opts.label,
    url: opts.url,
    category_slug: opts.categorySlug ?? null,
    params,
    last_seen_ids: opts.currentIds ?? [],
    email_alert: opts.emailAlert ?? false,
    last_visited_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('saved_searches')
    .upsert(payload, { onConflict: 'user_id,url' })
    .select('*')
    .single();
  if (error) {
    console.warn('[saved-searches] upsert failed', error.message);
    return null;
  }
  return data as DbSavedSearch;
}

export async function setEmailAlertDb(url: string, enabled: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (enabled) {
    // Ensure row exists then set alert.
    await upsertSavedSearchDb({ url, label: url, emailAlert: true });
    await supabase
      .from('saved_searches')
      .update({ email_alert: true })
      .eq('user_id', user.id)
      .eq('url', url);
  } else {
    await supabase
      .from('saved_searches')
      .update({ email_alert: false })
      .eq('user_id', user.id)
      .eq('url', url);
  }
}

export async function listMyDbSavedSearches(): Promise<DbSavedSearch[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('last_visited_at', { ascending: false });
  return (data ?? []) as DbSavedSearch[];
}

export async function deleteSavedSearchDb(url: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('saved_searches').delete().eq('user_id', user.id).eq('url', url);
}
