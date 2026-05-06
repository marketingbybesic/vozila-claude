-- ============================================================================
-- Vozila.hr - Security: legacy table RLS retrofit + ads admin gate
-- Migration: 011_legacy_rls.sql
-- Idempotent — safe to re-run.
-- Closes SECURITY_AUDIT.md findings S2 (legacy tables had no RLS) +
-- S3 (ads table had no admin-only insert/update/delete policy).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. users — contains email, vat_id, business_phone, whatsapp_number,
--    dealer_verified. Pre-fix: anon SELECT worked, exposing every dealer's
--    contact info (Tier 0 A7 patched the UI, this layer hardens the DB).
-- ----------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Public-readable subset only — same shape as the new whitelist in DealerProfile.
-- We can't selectively expose columns via RLS, so we expose the whole row to
-- the dealer themselves and to admins, and a sanitized VIEW for everyone else.
DROP POLICY IF EXISTS users_self_or_admin ON users;
CREATE POLICY users_self_or_admin ON users
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator'))
  );

DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_admin_all ON users;
CREATE POLICY users_admin_all ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

-- Public-safe view that DealerProfile + DealerIndex can use without
-- triggering RLS denial. Strips email, vat_id, whatsapp_number.
CREATE OR REPLACE VIEW public_dealer_directory AS
SELECT
  id,
  role,
  user_type,
  business_phone,                  -- public business contact, dealer's choice
  company_name,
  office_address,
  dealer_verified,
  created_at,
  updated_at
FROM users
WHERE role IN ('dealer', 'admin', 'owner');

GRANT SELECT ON public_dealer_directory TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. categories — anonymous read OK (used in nav menu), admin-only write.
-- ----------------------------------------------------------------------------

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select_all ON categories;
CREATE POLICY categories_select_all ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS categories_admin_write ON categories;
CREATE POLICY categories_admin_write ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

-- ----------------------------------------------------------------------------
-- 3. listing_analytics — dealer business intel (whatsapp_clicks,
--    phone_reveals). Pre-fix: anon could SELECT every dealer's lead numbers.
-- ----------------------------------------------------------------------------

ALTER TABLE listing_analytics ENABLE ROW LEVEL SECURITY;

-- Owner of the listing can read their own. Admin/moderator can read all.
DROP POLICY IF EXISTS listing_analytics_owner_select ON listing_analytics;
CREATE POLICY listing_analytics_owner_select ON listing_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings l
       WHERE l.id = listing_id
         AND (l.user_id = auth.uid()
              OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator')))
    )
  );

-- Anonymous + authenticated can INSERT — these rows are heartbeat-style
-- counters bumped by trackLead() with rate limit on application side.
DROP POLICY IF EXISTS listing_analytics_anyone_insert ON listing_analytics;
CREATE POLICY listing_analytics_anyone_insert ON listing_analytics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS listing_analytics_anyone_update ON listing_analytics;
CREATE POLICY listing_analytics_anyone_update ON listing_analytics
  FOR UPDATE USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. listing_images — read-public (we want anon to see car photos),
--    write-owner-only (anon could deface listings pre-fix).
-- ----------------------------------------------------------------------------

ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_images_select_all ON listing_images;
CREATE POLICY listing_images_select_all ON listing_images FOR SELECT USING (true);

DROP POLICY IF EXISTS listing_images_owner_write ON listing_images;
CREATE POLICY listing_images_owner_write ON listing_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM listings l
       WHERE l.id = listing_id
         AND (l.user_id = auth.uid()
              OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator')))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings l
       WHERE l.id = listing_id
         AND (l.user_id = auth.uid()
              OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator')))
    )
  );

-- ----------------------------------------------------------------------------
-- 5. favorites — buyer behavior data, only the buyer should read their own.
-- ----------------------------------------------------------------------------

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorites_self_all ON favorites;
CREATE POLICY favorites_self_all ON favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. ads — admin-only write, public read. Closes S3.
--    The ads table is created in an earlier (untracked) seed; we ALTER
--    defensively. If it doesn't exist this whole block is skipped.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ads' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE ads ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS ads_select_all ON ads';
    EXECUTE 'CREATE POLICY ads_select_all ON ads FOR SELECT USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS ads_admin_write ON ads';
    EXECUTE $POLICY$
      CREATE POLICY ads_admin_write ON ads
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
        )
    $POLICY$;
  END IF;
END $$;
