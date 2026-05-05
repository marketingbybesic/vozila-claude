// Auctions — Bring-a-Trailer-style timed auctions.
// Listing creators can opt their listing into the auction track. Buyers
// place bids via the Postgres function `place_auction_bid` (atomic +
// anti-snipe extension). Bid placement and current-high updates broadcast
// over Supabase Realtime so detail pages live-update.

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type AuctionStatus =
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'sold'
  | 'reserve_not_met'
  | 'canceled';

export interface AuctionRow {
  id: string;
  listing_id: string;
  seller_id: string;
  start_at: string;
  end_at: string;
  reserve_eur: number | null;
  starting_bid_eur: number;
  current_bid_eur: number | null;
  current_bidder: string | null;
  bid_count: number;
  buyer_premium_pct: number;
  min_bid_increment_eur: number;
  status: AuctionStatus;
  winner_id: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined for the auctions grid.
  listing?: {
    id: string;
    title: string;
    price: number;
    main_image: string | null;
    location: string | null;
    attributes: Record<string, any> | null;
  } | null;
}

export interface AuctionBidRow {
  id: number;
  auction_id: string;
  bidder_id: string;
  amount_eur: number;
  placed_at: string;
  extended_end_to: string | null;
  bidder?: { id: string; company_name: string | null } | null;
}

export async function listLiveAuctions(limit = 30): Promise<AuctionRow[]> {
  const { data } = await supabase
    .from('auctions')
    .select(`
      *,
      listing:listings(id, title, price, main_image, location, attributes)
    `)
    .eq('status', 'live')
    .order('end_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AuctionRow[];
}

export async function listEndedAuctions(limit = 20): Promise<AuctionRow[]> {
  const { data } = await supabase
    .from('auctions')
    .select(`
      *,
      listing:listings(id, title, price, main_image, location, attributes)
    `)
    .in('status', ['sold', 'reserve_not_met'])
    .order('settled_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AuctionRow[];
}

export async function getAuction(id: string): Promise<AuctionRow | null> {
  const { data } = await supabase
    .from('auctions')
    .select(`
      *,
      listing:listings(id, title, price, main_image, location, attributes)
    `)
    .eq('id', id)
    .maybeSingle();
  return (data ?? null) as AuctionRow | null;
}

export async function listAuctionBids(auctionId: string, limit = 50): Promise<AuctionBidRow[]> {
  const { data } = await supabase
    .from('auction_bids')
    .select(`
      *,
      bidder:profiles!auction_bids_bidder_id_fkey(id, company_name)
    `)
    .eq('auction_id', auctionId)
    .order('placed_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AuctionBidRow[];
}

export interface PlaceBidResult {
  ok: boolean;
  error?: string;
  new_high?: number;
  end_at?: string;
  extended?: boolean;
  min_next?: number;
}

export async function placeBid(auctionId: string, amount: number): Promise<PlaceBidResult> {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Iznos mora biti veći od 0.' };
  const { data, error } = await supabase.rpc('place_auction_bid', {
    p_auction: auctionId,
    p_amount: amount,
  });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Nepoznata greška.' }) as PlaceBidResult;
}

// Subscribe to real-time changes for a single auction (UPDATE + new bids).
export function subscribeToAuction(
  auctionId: string,
  onChange: () => void,
): RealtimeChannel {
  return supabase
    .channel(`auction:${auctionId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `auction_id=eq.${auctionId}` }, onChange)
    .subscribe();
}

// Compact countdown helper. Returns "—" once ended, else "Xd Yh Zm Ws".
export function formatCountdown(endAt: string, now = Date.now()): string {
  const end = new Date(endAt).getTime();
  const diff = Math.max(0, end - now);
  if (diff === 0) return 'Završeno';
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

export function statusLabel(s: AuctionStatus): string {
  switch (s) {
    case 'scheduled':       return 'Uskoro';
    case 'live':            return 'Aktivno';
    case 'ended':           return 'Završeno';
    case 'sold':            return 'Prodano';
    case 'reserve_not_met': return 'Rezerva nije dostignuta';
    case 'canceled':        return 'Otkazano';
  }
}
