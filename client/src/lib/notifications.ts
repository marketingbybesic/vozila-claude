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
    case 'boost_purchased':     return 'Boost aktiviran';
    case 'subscription_started':  return 'Pretplata aktivna';
    case 'subscription_canceled': return 'Pretplata otkazana';
    case 'listing_expiring':    return 'Oglas ističe uskoro';
    case 'listing_sold':        return 'Oglas označen kao prodan';
    default:                    return n.type;
  }
}
