-- ============================================================================
-- Vozila.hr - Phase 9.1: Fix listings drift + add Boost/Subscription columns
-- Migration: 002_fix_listings_drift.sql
-- Run against the live Supabase database BEFORE deploying phase 9 client code.
-- Safe to re-run (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. listings table — ensure user_id, category_slug, and Boost columns exist.
-- The original 001_core_schema.sql is out of date with the live DB.
-- The live DB has flat columns (main_image, images, damage_images, category_slug)
-- and an attributes JSONB. We canonicalize that and add what Boost needs.
-- ----------------------------------------------------------------------------

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS main_image TEXT,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS damage_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'prodaja',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_tier VARCHAR(32),
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_slug ON listings(category_slug);
CREATE INDEX IF NOT EXISTS idx_listings_featured_active
  ON listings(is_featured, featured_until)
  WHERE is_featured = true;

-- ----------------------------------------------------------------------------
-- 2. profiles table — Supabase pattern: auth.users + public.profiles 1:1.
-- Subscription state, dealer KYC, and contact metadata live here.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user',          -- 'user' | 'dealer' | 'admin' | 'moderator' | 'inspector'
  user_type VARCHAR(20) NOT NULL DEFAULT 'private',  -- 'private' | 'business'
  company_name VARCHAR(255),
  vat_id VARCHAR(20),
  office_address VARCHAR(255),
  business_phone VARCHAR(50),
  whatsapp_number VARCHAR(50),
  bio TEXT,
  logo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  dealer_verified BOOLEAN NOT NULL DEFAULT false,
  -- Stripe / subscription state
  stripe_customer_id VARCHAR(64),
  subscription_tier VARCHAR(20),                     -- 'bronze' | 'silver' | 'gold' | NULL
  subscription_status VARCHAR(20),                   -- 'active' | 'canceled' | 'past_due' | 'trialing' | NULL
  subscription_renews_at TIMESTAMP WITH TIME ZONE,
  -- Email opt-in for digests / marketing (transactional always sends)
  email_marketing_opt_in BOOLEAN NOT NULL DEFAULT true,
  email_digest_opt_in BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier)
  WHERE subscription_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Auto-create profile row when a new auth.users row appears.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth.users.
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. stripe_events — webhook idempotency dedupe.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stripe_events (
  id VARCHAR(64) PRIMARY KEY,                    -- evt_xxx
  type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(type);

-- ----------------------------------------------------------------------------
-- 4. RLS — profiles readable by all (public dealer pages), writable by self + admin.
-- listings: read-active for all, write own only.
-- ----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_all ON profiles;
CREATE POLICY profiles_select_all ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_update_self ON profiles;
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner')));

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listings_select_active ON listings;
CREATE POLICY listings_select_active ON listings FOR SELECT USING (status = 'active' OR status = 'published' OR user_id = auth.uid());

DROP POLICY IF EXISTS listings_insert_own ON listings;
CREATE POLICY listings_insert_own ON listings
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS listings_update_own ON listings;
CREATE POLICY listings_update_own ON listings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS listings_delete_own ON listings;
CREATE POLICY listings_delete_own ON listings
  FOR DELETE USING (user_id = auth.uid());

-- Service role (used by Edge Functions) bypasses RLS; webhook uses service role.

-- ----------------------------------------------------------------------------
-- 5. Cron — daily expire featured flags whose featured_until is in the past.
-- Run via Supabase scheduled Edge Function (functions/expire-featured) at 02:00 Europe/Zagreb.
-- (No pg_cron call here so this migration stays portable.)
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Done. After running this migration:
-- 1. Backfill listings.user_id for any seed rows missing it (script).
-- 2. Verify Dashboard.tsx, DealerProfile.tsx, CreateListingWizard.tsx all read.
-- 3. Deploy Edge Functions: create-boost-checkout, stripe-webhook, expire-featured.
-- ----------------------------------------------------------------------------
