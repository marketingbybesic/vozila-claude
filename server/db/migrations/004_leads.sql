-- ============================================================================
-- Vozila.hr - Phase 11: Leads, reviews, inspections, VIN reports
-- Migration: 004_leads.sql
-- Idempotent — safe to re-run.
-- Depends on 002_fix_listings_drift.sql (profiles) + 003_messaging.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. leads — financing / insurance / transport lead capture.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- buyer; nullable for anon
  partner_type VARCHAR(32) NOT NULL,  -- 'financing' | 'insurance' | 'transport'
  payload JSONB NOT NULL DEFAULT '{}',  -- name, phone, email, postcode, monthly_income, …
  status VARCHAR(20) NOT NULL DEFAULT 'new',  -- 'new' | 'contacted' | 'won' | 'lost'
  partner_id VARCHAR(64),
  payout_eur DECIMAL(8, 2),
  contacted_at TIMESTAMP WITH TIME ZONE,
  won_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  -- Soft-rate-limit signal — admin can see clusters of submissions.
  ip_hash VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_listing ON leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_partner_type ON leads(partner_type, status);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. reviews — buyer reviews of dealers (post-sale).
-- Eligibility check enforced at app level: only buyers with a message thread
-- > 7 days old can submit. RLS still allows the insert; admin moderation
-- removes fake reviews.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  dealer_response TEXT,
  response_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'published',  -- 'published' | 'flagged' | 'removed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (dealer_id, buyer_id, listing_id)  -- one review per buyer-listing pair
);

CREATE INDEX IF NOT EXISTS idx_reviews_dealer ON reviews(dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer ON reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- ----------------------------------------------------------------------------
-- 3. inspection_bookings — paid Vozila Inspection requests.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inspection_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  address VARCHAR(255) NOT NULL,
  preferred_date DATE,
  preferred_time_window VARCHAR(20),  -- 'morning' | 'afternoon' | 'evening'
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'assigned' | 'completed' | 'canceled'
  inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_url TEXT,
  paid_eur DECIMAL(8, 2),
  stripe_session_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_inspection_bookings_user ON inspection_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_listing ON inspection_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_status ON inspection_bookings(status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. vin_reports — paid VIN history reports.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vin_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vin VARCHAR(17) NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'generated' | 'delivered' | 'failed'
  paid_eur DECIMAL(8, 2),
  stripe_session_id VARCHAR(64),
  report_url TEXT,
  vpic_data JSONB,
  cross_references JSONB,
  generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vin_reports_user ON vin_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_vin_reports_vin ON vin_reports(vin);
CREATE INDEX IF NOT EXISTS idx_vin_reports_status ON vin_reports(status);

-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_anyone_insert ON leads;
CREATE POLICY leads_anyone_insert ON leads
  FOR INSERT WITH CHECK (true);  -- anonymous lead capture allowed

DROP POLICY IF EXISTS leads_self_select ON leads;
CREATE POLICY leads_self_select ON leads
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS leads_admin_all ON leads;
CREATE POLICY leads_admin_all ON leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_select_published ON reviews;
CREATE POLICY reviews_select_published ON reviews
  FOR SELECT USING (status = 'published' OR auth.uid() = buyer_id OR auth.uid() = dealer_id);

DROP POLICY IF EXISTS reviews_buyer_insert ON reviews;
CREATE POLICY reviews_buyer_insert ON reviews
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS reviews_dealer_respond ON reviews;
CREATE POLICY reviews_dealer_respond ON reviews
  FOR UPDATE USING (auth.uid() = dealer_id)
  WITH CHECK (auth.uid() = dealer_id);

ALTER TABLE inspection_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inspections_self_all ON inspection_bookings;
CREATE POLICY inspections_self_all ON inspection_bookings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS inspections_inspector_select ON inspection_bookings;
CREATE POLICY inspections_inspector_select ON inspection_bookings
  FOR SELECT USING (auth.uid() = inspector_id);

DROP POLICY IF EXISTS inspections_admin_all ON inspection_bookings;
CREATE POLICY inspections_admin_all ON inspection_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

ALTER TABLE vin_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vin_reports_self_select ON vin_reports;
CREATE POLICY vin_reports_self_select ON vin_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vin_reports_admin_all ON vin_reports;
CREATE POLICY vin_reports_admin_all ON vin_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

-- Service role bypasses RLS for Edge Function writes (Stripe webhook, AI cron, etc.).

-- ----------------------------------------------------------------------------
-- 6. Aggregated dealer rating view — keeps DealerProfile query light.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW dealer_rating_summary AS
SELECT
  dealer_id,
  COUNT(*) AS review_count,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*) FILTER (WHERE rating = 5) AS count_5,
  COUNT(*) FILTER (WHERE rating = 4) AS count_4,
  COUNT(*) FILTER (WHERE rating = 3) AS count_3,
  COUNT(*) FILTER (WHERE rating = 2) AS count_2,
  COUNT(*) FILTER (WHERE rating = 1) AS count_1
FROM reviews
WHERE status = 'published'
GROUP BY dealer_id;
