-- ============================================================================
-- Vozila.hr - Phase 14: Inspections fulfilment + auctions stub
-- Migration: 008_phase14.sql
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. inspections — already created in 004_leads.sql as inspection_bookings.
-- This phase adds two helpers + the inspector workflow surface.
-- ----------------------------------------------------------------------------

-- Add a 'report_pdf_storage_path' column for the actual file the inspector
-- uploads (separate from the public report_url which can be a signed URL).
ALTER TABLE inspection_bookings
  ADD COLUMN IF NOT EXISTS report_pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS report_summary TEXT,
  ADD COLUMN IF NOT EXISTS report_score INT CHECK (report_score IS NULL OR (report_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS inspector_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_inspection_bookings_inspector_status
  ON inspection_bookings(inspector_id, status, created_at DESC);

-- View — inspector workspace queue. Shows unassigned 'paid' bookings + the
-- inspector's own assigned ones.
CREATE OR REPLACE VIEW inspection_queue AS
SELECT
  ib.id,
  ib.user_id AS buyer_id,
  ib.listing_id,
  ib.address,
  ib.preferred_date,
  ib.preferred_time_window,
  ib.notes,
  ib.status,
  ib.inspector_id,
  ib.report_url,
  ib.report_summary,
  ib.report_score,
  ib.paid_eur,
  ib.created_at,
  ib.scheduled_at,
  ib.completed_at,
  l.title AS listing_title,
  l.price AS listing_price,
  l.main_image AS listing_image
FROM inspection_bookings ib
LEFT JOIN listings l ON l.id = ib.listing_id;

-- ----------------------------------------------------------------------------
-- 2. auctions — Bring-a-Trailer-style 7-day auction track.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reserve_eur DECIMAL(12, 2),
  starting_bid_eur DECIMAL(12, 2) NOT NULL DEFAULT 0,
  current_bid_eur DECIMAL(12, 2),
  current_bidder UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bid_count INT NOT NULL DEFAULT 0,
  buyer_premium_pct DECIMAL(4, 2) NOT NULL DEFAULT 5.0,    -- 5% default
  min_bid_increment_eur DECIMAL(8, 2) NOT NULL DEFAULT 100,
  status VARCHAR(20) NOT NULL DEFAULT 'live',  -- 'scheduled' | 'live' | 'ended' | 'sold' | 'reserve_not_met' | 'canceled'
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auctions_status_end ON auctions(status, end_at);
CREATE INDEX IF NOT EXISTS idx_auctions_seller ON auctions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_live_end ON auctions(end_at) WHERE status = 'live';

CREATE TABLE IF NOT EXISTS auction_bids (
  id BIGSERIAL PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_eur DECIMAL(12, 2) NOT NULL,
  placed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Anti-snipe: when a bid arrives in the last 60 seconds, end_at is bumped.
  extended_end_to TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_placed
  ON auction_bids(auction_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder
  ON auction_bids(bidder_id, placed_at DESC);

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auctions_select_all ON auctions;
CREATE POLICY auctions_select_all ON auctions FOR SELECT USING (true);

DROP POLICY IF EXISTS auctions_seller_insert ON auctions;
CREATE POLICY auctions_seller_insert ON auctions
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS auctions_seller_update ON auctions;
CREATE POLICY auctions_seller_update ON auctions
  FOR UPDATE USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS auctions_admin_all ON auctions;
CREATE POLICY auctions_admin_all ON auctions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auction_bids_select_all ON auction_bids;
CREATE POLICY auction_bids_select_all ON auction_bids FOR SELECT USING (true);

DROP POLICY IF EXISTS auction_bids_self_insert ON auction_bids;
CREATE POLICY auction_bids_self_insert ON auction_bids
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- ----------------------------------------------------------------------------
-- 4. Bid placement function — atomic bid validation + anti-snipe extension.
-- Encapsulates: ownership check (sellers can't bid on own auction), minimum
-- bid validation, current-bid update, anti-snipe end-time extension.
-- Called via supabase.rpc('place_auction_bid', { auction, amount }).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION place_auction_bid(p_auction UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auction       auctions%ROWTYPE;
  v_caller        UUID := auth.uid();
  v_min_next      NUMERIC;
  v_anti_snipe_s  INT := 60;          -- seconds-from-end threshold
  v_extension_s   INT := 60;          -- seconds added when sniped
  v_now           TIMESTAMPTZ := NOW();
  v_new_end       TIMESTAMPTZ;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_auction.seller_id = v_caller THEN
    RETURN jsonb_build_object('ok', false, 'error', 'seller_cannot_bid');
  END IF;

  IF v_auction.status <> 'live' OR v_auction.end_at < v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_live');
  END IF;

  v_min_next := COALESCE(v_auction.current_bid_eur, v_auction.starting_bid_eur)
                + v_auction.min_bid_increment_eur;
  IF p_amount < v_min_next THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bid_too_low', 'min_next', v_min_next);
  END IF;

  -- Anti-snipe extension when bid lands inside the buffer window.
  v_new_end := v_auction.end_at;
  IF (v_auction.end_at - v_now) <= make_interval(secs := v_anti_snipe_s) THEN
    v_new_end := v_auction.end_at + make_interval(secs := v_extension_s);
  END IF;

  -- Insert bid + bump auction.
  INSERT INTO auction_bids (auction_id, bidder_id, amount_eur, extended_end_to)
  VALUES (p_auction, v_caller, p_amount,
          CASE WHEN v_new_end <> v_auction.end_at THEN v_new_end ELSE NULL END);

  UPDATE auctions SET
    current_bid_eur = p_amount,
    current_bidder  = v_caller,
    bid_count       = bid_count + 1,
    end_at          = v_new_end,
    updated_at      = v_now
  WHERE id = p_auction;

  RETURN jsonb_build_object(
    'ok', true,
    'new_high', p_amount,
    'end_at', v_new_end,
    'extended', v_new_end <> v_auction.end_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION place_auction_bid(UUID, NUMERIC) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. End-of-auction cron helper. Edge function 'auction-settle' (cron, every
-- 5 min) calls this to flip ended auctions to 'sold' / 'reserve_not_met'.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION settle_ended_auctions()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT := 0;
BEGIN
  WITH ended AS (
    UPDATE auctions
       SET status = CASE
                      WHEN current_bid_eur IS NULL THEN 'reserve_not_met'
                      WHEN reserve_eur IS NOT NULL AND current_bid_eur < reserve_eur THEN 'reserve_not_met'
                      ELSE 'sold'
                    END,
           winner_id = CASE
                      WHEN current_bid_eur IS NULL THEN NULL
                      WHEN reserve_eur IS NOT NULL AND current_bid_eur < reserve_eur THEN NULL
                      ELSE current_bidder
                    END,
           settled_at = NOW(),
           updated_at = NOW()
     WHERE status = 'live' AND end_at <= NOW()
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM ended;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION settle_ended_auctions() TO service_role;

-- Realtime publication for auctions + auction_bids so bid pages can update live.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'auctions') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE auctions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'auction_bids') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
