// Admin helpers — RBAC check + audit-log writer + bulk-action wrappers.
// All queries assume profile.role is set on the current user; the migration
// 002_fix_listings_drift.sql adds 'admin' / 'owner' / 'moderator' to the role enum.

import { supabase } from './supabase';

export type AdminRole = 'admin' | 'owner' | 'moderator' | 'support' | 'read-only';

export interface AdminProfile {
  id: string;
  email: string | null;
  role: string;
}

export async function getMyAdminRole(): Promise<AdminRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (data?.role ?? '').toString();
  if (role === 'admin' || role === 'owner' || role === 'moderator' || role === 'support' || role === 'read-only') {
    return role as AdminRole;
  }
  return null;
}

export function canWrite(role: AdminRole | null): boolean {
  return role === 'admin' || role === 'owner';
}
export function canModerate(role: AdminRole | null): boolean {
  return role === 'admin' || role === 'owner' || role === 'moderator';
}
export function canViewPayments(role: AdminRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

// ----------------------------------------------------------------------------
// Audit log
// ----------------------------------------------------------------------------

export async function audit(action: string, opts?: {
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const role = await getMyAdminRole();
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_role: role,
      action,
      entity_type: opts?.entity_type ?? null,
      entity_id: opts?.entity_id ?? null,
      payload: opts?.payload ?? {},
    });
  } catch (e) {
    console.warn('[audit] write failed', e);
  }
}

// ----------------------------------------------------------------------------
// Overview KPIs — read from admin_overview view (created in 006_admin.sql).
// ----------------------------------------------------------------------------

export interface AdminOverviewKpis {
  listings_active: number;
  listings_sold: number;
  listings_new_7d: number;
  users_total: number;
  subscribers_active: number;
  reports_open: number;
  leads_new: number;
  conversations_active_24h: number;
  messages_24h: number;
  listings_featured: number;
}

export async function getAdminOverview(): Promise<AdminOverviewKpis | null> {
  const { data, error } = await supabase.from('admin_overview').select('*').maybeSingle();
  if (error) {
    console.warn('[admin] overview query failed', error.message);
    return null;
  }
  return (data ?? null) as AdminOverviewKpis | null;
}

// ----------------------------------------------------------------------------
// Listings table — admin-side filtered query.
// ----------------------------------------------------------------------------

export interface AdminListingRow {
  id: string;
  title: string;
  price: number;
  status: string;
  user_id: string | null;
  category_slug: string | null;
  is_featured: boolean | null;
  featured_until: string | null;
  views_count: number | null;
  created_at: string;
  owner?: { id: string; email: string | null; company_name: string | null } | null;
}

export async function listAdminListings(opts: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ rows: AdminListingRow[]; total: number }> {
  let q = supabase
    .from('listings')
    .select('id, title, price, status, user_id, category_slug, is_featured, featured_until, views_count, created_at, owner:profiles!listings_user_id_fkey(id, email, company_name)', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (opts.search) {
    const s = opts.search.replace(/[%_]/g, '');
    q = q.ilike('title', `%${s}%`);
  }
  if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
  q = q.range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 25) - 1);
  const { data, error, count } = await q;
  if (error) {
    console.warn('[admin] listings query failed', error.message);
    return { rows: [], total: 0 };
  }
  return { rows: (data ?? []) as any, total: count ?? 0 };
}

export async function adminSetListingStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('listing.status_change', { entity_type: 'listing', entity_id: id, payload: { status } });
  return { ok: true };
}

export async function adminForceFeature(id: string, days: number): Promise<{ ok: boolean; error?: string }> {
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const { error } = await supabase.from('listings').update({
    is_featured: true,
    featured_tier: days <= 2 ? 'top-2d' : days <= 7 ? 'featured-7d' : 'premium-30d',
    featured_until: until,
  }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('listing.force_feature', { entity_type: 'listing', entity_id: id, payload: { days } });
  return { ok: true };
}

export async function adminUnfeatureListing(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('listings').update({ is_featured: false, featured_tier: null, featured_until: null }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('listing.unfeature', { entity_type: 'listing', entity_id: id });
  return { ok: true };
}

export async function adminDeleteListing(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('listing.delete', { entity_type: 'listing', entity_id: id });
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Users table.
// ----------------------------------------------------------------------------

export interface AdminUserRow {
  id: string;
  email: string | null;
  role: string;
  user_type: string | null;
  company_name: string | null;
  is_verified: boolean | null;
  dealer_verified: boolean | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  created_at: string;
}

export async function listAdminUsers(opts: { search?: string; limit?: number; offset?: number } = {}): Promise<{ rows: AdminUserRow[]; total: number }> {
  let q = supabase
    .from('profiles')
    .select('id, email, role, user_type, company_name, is_verified, dealer_verified, subscription_tier, subscription_status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (opts.search) {
    const s = opts.search.replace(/[%_]/g, '');
    q = q.or(`email.ilike.%${s}%,company_name.ilike.%${s}%`);
  }
  q = q.range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 25) - 1);
  const { data, error, count } = await q;
  if (error) {
    console.warn('[admin] users query failed', error.message);
    return { rows: [], total: 0 };
  }
  return { rows: (data ?? []) as any, total: count ?? 0 };
}

export async function adminSetUserRole(id: string, role: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('user.role_change', { entity_type: 'user', entity_id: id, payload: { role } });
  return { ok: true };
}

export async function adminSetDealerVerified(id: string, verified: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('profiles').update({ dealer_verified: verified, is_verified: verified }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('user.dealer_verify', { entity_type: 'user', entity_id: id, payload: { verified } });
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Moderation queue — reports.
// ----------------------------------------------------------------------------

export interface AdminReportRow {
  id: string;
  listing_id: string;
  reporter_id: string | null;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  listing?: { id: string; title: string; status: string; user_id: string | null } | null;
}

export async function listAdminReports(status: 'open' | 'reviewed' | 'all' = 'open'): Promise<AdminReportRow[]> {
  let q = supabase
    .from('reports')
    .select('id, listing_id, reporter_id, reason, notes, status, created_at, reviewed_at, listing:listings(id, title, status, user_id)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) {
    console.warn('[admin] reports query failed', error.message);
    return [];
  }
  return (data ?? []) as any;
}

export async function adminResolveReport(id: string, resolution: 'reviewed' | 'resolved' | 'rejected'): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('reports')
    .update({ status: resolution, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('report.resolve', { entity_type: 'report', entity_id: id, payload: { resolution } });
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Kill switches.
// ----------------------------------------------------------------------------

export interface KillSwitch {
  name: string;
  enabled: boolean;
  reason: string | null;
  toggled_at: string;
}

export async function listKillSwitches(): Promise<KillSwitch[]> {
  const { data } = await supabase.from('kill_switches').select('*').order('name');
  return (data ?? []) as KillSwitch[];
}

export async function setKillSwitch(name: string, enabled: boolean, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('kill_switches').update({
    enabled,
    reason: reason ?? null,
    toggled_by: user?.id ?? null,
    toggled_at: new Date().toISOString(),
  }).eq('name', name);
  if (error) return { ok: false, error: error.message };
  await audit('kill_switch.toggle', { entity_type: 'kill_switch', entity_id: name, payload: { enabled, reason } });
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Audit log read.
// ----------------------------------------------------------------------------

export interface AuditRow {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function listAuditLog(limit = 100): Promise<AuditRow[]> {
  const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []) as AuditRow[];
}

// ----------------------------------------------------------------------------
// Leads queue.
// ----------------------------------------------------------------------------

export interface AdminLeadRow {
  id: string;
  partner_type: string;
  status: string;
  payload: Record<string, any>;
  listing_id: string | null;
  user_id: string | null;
  created_at: string;
  contacted_at: string | null;
  won_at: string | null;
  payout_eur: number | null;
  notes: string | null;
}

export async function listAdminLeads(opts: { partner_type?: string; status?: string } = {}): Promise<AdminLeadRow[]> {
  let q = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200);
  if (opts.partner_type && opts.partner_type !== 'all') q = q.eq('partner_type', opts.partner_type);
  if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
  const { data } = await q;
  return (data ?? []) as AdminLeadRow[];
}

export async function adminSetLeadStatus(id: string, status: 'new' | 'contacted' | 'won' | 'lost', payout_eur?: number): Promise<{ ok: boolean; error?: string }> {
  const update: Record<string, unknown> = { status };
  if (status === 'contacted') update.contacted_at = new Date().toISOString();
  if (status === 'won') {
    update.won_at = new Date().toISOString();
    if (payout_eur != null) update.payout_eur = payout_eur;
  }
  const { error } = await supabase.from('leads').update(update).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await audit('lead.status_change', { entity_type: 'lead', entity_id: id, payload: { status, payout_eur } });
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Search insights.
// ----------------------------------------------------------------------------

export async function getTopSearchQueries(limit = 25): Promise<{ url: string; count: number; zero_pct: number }[]> {
  // Coarse aggregation — takes one round-trip and is good enough for v1.
  const { data } = await supabase
    .from('search_log')
    .select('url, result_count')
    .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(2000);
  if (!data) return [];
  const buckets = new Map<string, { count: number; zero: number }>();
  for (const row of data as { url: string; result_count: number }[]) {
    const cur = buckets.get(row.url) ?? { count: 0, zero: 0 };
    cur.count += 1;
    if ((row.result_count ?? 0) === 0) cur.zero += 1;
    buckets.set(row.url, cur);
  }
  return [...buckets.entries()]
    .map(([url, v]) => ({ url, count: v.count, zero_pct: v.count === 0 ? 0 : (v.zero / v.count) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
