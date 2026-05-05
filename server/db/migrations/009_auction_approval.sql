-- ============================================================================
-- Vozila.hr - Phase 15: Auction admin approval gate (BaT-style curation)
-- Migration: 009_auction_approval.sql
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. auctions — approval columns. Auctions land in 'pending' until an admin
--    flips them to 'approved'. Public auction listing + bidding gate on
--    approval_status='approved'.
-- ----------------------------------------------------------------------------

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_notes  TEXT,
  ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMP WITH TIME ZONE;

-- Backfill: any pre-existing live auctions are grandfathered as approved
-- so we don't accidentally hide them after deploy.
UPDATE auctions
   SET approval_status = 'approved',
       approved_at     = COALESCE(approved_at, created_at)
 WHERE approval_status = 'pending'
   AND status = 'live'
   AND created_at < NOW() - INTERVAL '1 minute';

-- Index for admin queue.
CREATE INDEX IF NOT EXISTS idx_auctions_approval_status
  ON auctions(approval_status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. RLS — non-approved auctions still readable by their seller (so they
--    can see their submission's status), but invisible to public + bidders.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS auctions_select_all ON auctions;
CREATE POLICY auctions_select_all ON auctions FOR SELECT USING (
  approval_status = 'approved'
  OR auth.uid() = seller_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator'))
);

-- bid policy: only on approved auctions. Defense in depth — place_auction_bid
-- already checks status='live', and approved auctions are the only ones the
-- public can SEE, but RLS belt+suspenders here too.
DROP POLICY IF EXISTS auction_bids_self_insert ON auction_bids;
CREATE POLICY auction_bids_self_insert ON auction_bids
  FOR INSERT WITH CHECK (
    auth.uid() = bidder_id
    AND EXISTS (
      SELECT 1 FROM auctions a
       WHERE a.id = auction_id
         AND a.approval_status = 'approved'
         AND a.status = 'live'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. place_auction_bid — extend with approval check so ANY caller (even
--    service-role) can't bid on an unapproved auction.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION place_auction_bid(p_auction UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auction       auctions%ROWTYPE;
  v_caller        UUID := auth.uid();
  v_min_next      NUMERIC;
  v_anti_snipe_s  INT := 60;
  v_extension_s   INT := 60;
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

  IF v_auction.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_approved');
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

  v_new_end := v_auction.end_at;
  IF (v_auction.end_at - v_now) <= make_interval(secs := v_anti_snipe_s) THEN
    v_new_end := v_auction.end_at + make_interval(secs := v_extension_s);
  END IF;

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
