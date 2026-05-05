// Messaging — conversations + messages + realtime subscription.
// Phone obfuscation rule: seller's contact_phone is hidden until the buyer
// has sent ≥1 message OR explicitly clicks Reveal. We track the reveal flag
// on the conversation row to keep state consistent across devices.

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  buyer_unread: number;
  seller_unread: number;
  status: 'open' | 'archived' | 'blocked';
  buyer_revealed_phone: boolean;
  created_at: string;
  // Joined for inbox rendering.
  listing?: {
    id: string;
    title: string;
    price: number;
    main_image?: string | null;
    listing_images?: { url: string; is_primary: boolean }[];
    user_id: string;
    contact_phone?: string | null;
  } | null;
  buyer_profile?: { id: string; company_name?: string | null; logo_url?: string | null } | null;
  seller_profile?: { id: string; company_name?: string | null; logo_url?: string | null } | null;
  last_message?: { body: string; sender_id: string; created_at: string } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
}

export class NotAuthedError extends Error {
  constructor() { super('Niste prijavljeni.'); }
}

async function requireUser(): Promise<{ id: string; email: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new NotAuthedError();
  return { id: user.id, email: user.email ?? null };
}

// Find or create a conversation for (listing, buyer). Buyer = current user.
// Seller is read off the listing.user_id. Refuses self-message.
export async function ensureConversation(listingId: string): Promise<Conversation> {
  const me = await requireUser();

  const { data: listing, error: listErr } = await supabase
    .from('listings')
    .select('id, user_id, title, price')
    .eq('id', listingId)
    .maybeSingle();
  if (listErr) throw listErr;
  if (!listing) throw new Error('Oglas nije pronađen.');
  if (listing.user_id === me.id) throw new Error('Ne možete poslati poruku samom sebi.');

  // Try to find existing.
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('listing_id', listingId)
    .eq('buyer_id', me.id)
    .maybeSingle();
  if (existing) return existing as Conversation;

  // Insert new — UNIQUE (listing_id, buyer_id) handles concurrent inserts.
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_id: me.id,
      seller_id: listing.user_id,
    })
    .select('*')
    .single();
  if (error) {
    // If race lost, re-read.
    const { data: again } = await supabase
      .from('conversations')
      .select('*')
      .eq('listing_id', listingId)
      .eq('buyer_id', me.id)
      .single();
    if (again) return again as Conversation;
    throw error;
  }
  return data as Conversation;
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const me = await requireUser();
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Poruka ne može biti prazna.');
  if (trimmed.length > 4000) throw new Error('Poruka je predugačka (max 4000 znakova).');
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: me.id, body: trimmed })
    .select('*')
    .single();
  if (error) throw error;
  // Fire-and-forget notify the recipient. Failure is non-fatal — the message
  // is still saved + delivered via realtime; only the email is best-effort.
  notifyRecipientOfMessage((data as Message).id).catch(() => {});
  return data as Message;
}

// Calls the Edge Function notify-new-message to email the other participant
// and drop a notification row. Missing env -> no-op.
async function notifyRecipientOfMessage(messageId: string): Promise<void> {
  const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (!fnUrl) return;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;
  await fetch(`${fnUrl}/notify-new-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message_id: messageId }),
  });
}

export async function listMyConversations(): Promise<Conversation[]> {
  const me = await requireUser();
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title, price, main_image, listing_images(url, is_primary), user_id, contact_phone),
      buyer_profile:profiles!conversations_buyer_id_fkey(id, company_name, logo_url),
      seller_profile:profiles!conversations_seller_id_fkey(id, company_name, logo_url)
    `)
    .or(`buyer_id.eq.${me.id},seller_id.eq.${me.id}`)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title, price, main_image, listing_images(url, is_primary), user_id, contact_phone),
      buyer_profile:profiles!conversations_buyer_id_fkey(id, company_name, logo_url),
      seller_profile:profiles!conversations_seller_id_fkey(id, company_name, logo_url)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Conversation | null;
}

export async function listMessages(conversationId: string, limit = 200): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}

// Mark all unread messages in this conversation (sent by the OTHER party) as
// read. Also resets the unread counter on the conversation for the current
// user. Called when the user opens a thread.
export async function markConversationRead(conversationId: string): Promise<void> {
  const me = await requireUser();
  const conv = await getConversation(conversationId);
  if (!conv) return;
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', me.id)
    .is('read_at', null);
  const isBuyer = conv.buyer_id === me.id;
  await supabase
    .from('conversations')
    .update(isBuyer ? { buyer_unread: 0 } : { seller_unread: 0 })
    .eq('id', conversationId);
}

export async function revealPhone(conversationId: string): Promise<void> {
  await supabase
    .from('conversations')
    .update({ buyer_revealed_phone: true })
    .eq('id', conversationId);
}

// Sum of unread counters across all of my conversations. Used by the bell.
export async function getUnreadTotal(): Promise<number> {
  const me = await requireUser().catch(() => null);
  if (!me) return 0;
  const { data: asBuyer } = await supabase
    .from('conversations').select('buyer_unread').eq('buyer_id', me.id);
  const { data: asSeller } = await supabase
    .from('conversations').select('seller_unread').eq('seller_id', me.id);
  const buyerSum = (asBuyer ?? []).reduce((s, r) => s + (r.buyer_unread ?? 0), 0);
  const sellerSum = (asSeller ?? []).reduce((s, r) => s + (r.seller_unread ?? 0), 0);
  return buyerSum + sellerSum;
}

// Realtime subscription helper — watches new messages in a single thread.
// Returns the channel so the caller can `.unsubscribe()` on unmount.
export function subscribeToMessages(
  conversationId: string,
  onMessage: (m: Message) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
  return channel;
}

// Watches all conversations for the current user — used by the inbox + bell
// to refresh totals on any conversation change.
export function subscribeToMyConversations(onChange: () => void): RealtimeChannel | null {
  const channel = supabase
    .channel('my-conversations')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      onChange,
    )
    .subscribe();
  return channel;
}

// Heuristic: phone numbers / external contact attempts in message body.
// Used both client-side (warn before send) and server-side (flag for review).
export function detectScamSignals(body: string): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  // Croatian + EU phone-like patterns
  if (/(\+?\d[\s\-]?){7,}/.test(body)) reasons.push('Sadrži broj telefona — koristite poruke na platformi.');
  if (/whatsapp|viber|telegram|signal/i.test(body)) reasons.push('Spominje vanjske kanale.');
  if (/wire|bitcoin|crypto|moneygram|western\s?union/i.test(body)) reasons.push('Spominje rizične načine plaćanja.');
  if (/click here|click below|verify (your )?account/i.test(body)) reasons.push('Phishing-style poziv na akciju.');
  return { suspicious: reasons.length > 0, reasons };
}
