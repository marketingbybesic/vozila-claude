// Notifications — feed of per-user events surfaced in the bell flyout.
// Rows live in public.notifications, written by Edge Functions
// (notify-new-message, saved-searches-digest) and any future producers.

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType =
  | 'new_message'
  | 'saved_search_hits'
  | 'boost_purchased'
  | 'subscription_started'
  | 'subscription_canceled'
  | 'listing_expiring'
  | 'listing_sold'
  | string;  // forward-compatible for unknown types

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export async function listMyNotifications(limit = 30): Promise<NotificationRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[notifications] list failed', error.message);
    return [];
  }
  return (data ?? []) as NotificationRow[];
}

export async function getMyUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);
  return count ?? 0;
}

// Mark a single notification read.
export async function markNotificationRead(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
}

// Bulk mark all read — used by "Označi sve kao pročitano" in the flyout.
export async function markAllRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
}

// Subscribe to realtime inserts on the current user's notifications.
// Returns the channel — caller must `.unsubscribe()` on cleanup.
export function subscribeToMyNotifications(
  userId: string,
  onInsert: (n: NotificationRow) => void,
): RealtimeChannel {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as NotificationRow),
    )
    .subscribe();
}

// Build a navigation target from a notification payload. Bell flyout uses
// this to make each row clickable.
export function notificationLink(n: NotificationRow): string | null {
  switch (n.type) {
    case 'new_message': {
      const cid = n.payload?.conversation_id;
      return cid ? `/poruke/${cid}` : '/poruke';
    }
    case 'saved_search_hits':
      // Saved-search digest links back to the feed URL; we don't have it here,
      // so just go to the feed. The email already links to specific listings.
      return '/pretraga';
    case 'boost_purchased': {
      const lid = n.payload?.listing_id;
      return lid ? `/listing/${lid}` : '/dashboard';
    }
    case 'listing_expiring':
    case 'listing_sold': {
      const lid = n.payload?.listing_id;
      return lid ? `/listing/${lid}` : '/dashboard';
    }
    case 'subscription_started':
    case 'subscription_canceled':
      return '/postavke';
    case 'auction_outbid':
    case 'auction_won':
    case 'auction_seller_sold':
    case 'auction_seller_unsold':
    case 'auction_approved':
    case 'auction_rejected': {
      const aid = n.payload?.auction_id;
      return aid ? `/aukcija/${aid}` : '/aukcija';
    }
    case 'vin_report_ready': {
      const url = n.payload?.report_url;
      return typeof url === 'string' && url ? url : '/postavke';
    }
    case 'vin_url_expiring':
    case 'inspection_assigned':
    case 'inspection_canceled':
      return '/postavke';
    case 'ai_copy_call':
      // Internal sentinel — not user-visible navigation.
      return null;
    default:
      return null;
  }
}

// Croatian-locale label per type for the flyout.
export function notificationTitle(n: NotificationRow): string {
  switch (n.type) {
    case 'new_message':         return 'Nova poruka';
    case 'saved_search_hits': {
      const c = n.payload?.count ?? 0;
      const label = n.payload?.label ?? 'spremljena pretraga';
      return `${c} ${c === 1 ? 'novi rezultat' : 'novih rezultata'} — "${label}"`;
    }
    case 'boost_purchased':       return 'Boost aktiviran';
    case 'subscription_started':  return 'Pretplata aktivna';
    case 'subscription_canceled': return 'Pretplata otkazana';
    case 'listing_expiring':      return 'Oglas ističe uskoro';
    case 'listing_sold':          return 'Oglas označen kao prodan';
    case 'auction_outbid': {
      const high = n.payload?.new_high;
      return high
        ? `Niste više najbolji ponuđač (nova ponuda ${Number(high).toLocaleString('hr-HR')} €)`
        : 'Niste više najbolji ponuđač';
    }
    case 'auction_won': {
      const fp = n.payload?.final_price;
      return fp
        ? `Pobijedili ste aukciju (${Number(fp).toLocaleString('hr-HR')} €)`
        : 'Pobijedili ste aukciju';
    }
    case 'auction_seller_sold': {
      const fp = n.payload?.final_price;
      return fp
        ? `Aukcija prodana za ${Number(fp).toLocaleString('hr-HR')} €`
        : 'Aukcija prodana';
    }
    case 'auction_seller_unsold':
      return 'Aukcija završena bez prodaje';
    case 'auction_approved':
      return 'Aukcija odobrena';
    case 'auction_rejected':
      return 'Aukcija nije odobrena';
    case 'vin_report_ready': {
      const vin = n.payload?.vin;
      return vin ? `VIN izvještaj spreman — ${vin}` : 'VIN izvještaj spreman';
    }
    case 'vin_url_expiring': {
      const vin = n.payload?.vin;
      return vin ? `VIN link uskoro istječe — ${vin}` : 'VIN link uskoro istječe';
    }
    case 'inspection_assigned':
      return 'Inspektor je preuzeo rezervaciju';
    case 'inspection_canceled':
      return 'Rezervacija inspekcije otkazana';
    default:
      return n.type;
  }
}
