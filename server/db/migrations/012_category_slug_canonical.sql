-- ============================================================================
-- Vozila.hr - Phase 9.1 closeout: canonicalize categories on category_slug
-- Migration: 012_category_slug_canonical.sql
-- Run against the live Supabase DB after 011_legacy_rls.sql.
-- Idempotent. No data changes — only column constraints.
-- ============================================================================
--
-- Background: 001_core_schema.sql declared listings.category_id UUID NOT NULL.
-- The live DB diverged onto category_slug VARCHAR (added by 002_fix_listings_drift)
-- and the client (CreateListingWizard.tsx) inserts category_slug, never category_id.
-- A fresh replay of 001 → 002 would still leave category_id NOT NULL, so any new
-- environment (preview, staging, restored backup) would reject inserts that work
-- in prod. This migration aligns schema with reality.
-- ----------------------------------------------------------------------------

-- 1. Drop NOT NULL on category_id so inserts that omit it succeed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'category_id'
      AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE listings ALTER COLUMN category_id DROP NOT NULL';
  END IF;
END $$;

-- 2. Backfill category_id from category_slug for any rows still missing it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'category_id'
  ) THEN
    EXECUTE $sql$
      UPDATE listings l
      SET category_id = c.id
      FROM categories c
      WHERE l.category_slug IS NOT NULL
        AND l.category_id IS NULL
        AND c.slug = l.category_slug
    $sql$;
  END IF;
END $$;

-- 3. Add a CHECK that at least one of (category_id, category_slug) is set.
--    This protects RLS / search RPCs that filter by either column.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_present_chk;
ALTER TABLE listings
  ADD CONSTRAINT listings_category_present_chk
  CHECK (category_id IS NOT NULL OR category_slug IS NOT NULL);

-- 4. Trigger: keep category_id and category_slug in sync on INSERT/UPDATE.
--    If client supplies one, fill the other from categories table.
CREATE OR REPLACE FUNCTION public.sync_listing_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_slug IS NOT NULL AND NEW.category_id IS NULL THEN
    SELECT id INTO NEW.category_id FROM categories WHERE slug = NEW.category_slug;
  ELSIF NEW.category_id IS NOT NULL AND NEW.category_slug IS NULL THEN
    SELECT slug INTO NEW.category_slug FROM categories WHERE id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_listing_category_trg ON listings;
CREATE TRIGGER sync_listing_category_trg
  BEFORE INSERT OR UPDATE OF category_id, category_slug ON listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_category();

COMMENT ON CONSTRAINT listings_category_present_chk ON listings IS
  'Phase 9.1: at least one of category_id (FK) or category_slug (canonical) must be present';
COMMENT ON FUNCTION public.sync_listing_category() IS
  'Phase 9.1: keeps listings.category_id and listings.category_slug in sync on write';

-- ----------------------------------------------------------------------------
-- 5. Declare listings.user_id → profiles.id FK so PostgREST embed works.
-- Surfaced 2026-05-07 by Playwright walk: client uses
--   .select('owner:profiles!listings_user_id_fkey(...)')
-- but no such constraint existed (002 only added FK to auth.users). Result:
-- Supabase returns PGRST200 "Could not find a relationship between listings
-- and profiles". profiles.id mirrors auth.users.id 1:1 so this is safe.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_user_id_fkey'
      AND conrelid = 'public.listings'::regclass
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
    -- Validate after seeding profiles for any orphan user_ids.
    -- ALTER TABLE listings VALIDATE CONSTRAINT listings_user_id_fkey;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. S5 hardening: enforce category_slug ⊆ categories.slug at insert time.
-- The sync trigger sets category_id from category_slug, but a malicious
-- client could plant a slug that has no matching category row (the trigger
-- silently leaves category_id null). Reject such inserts so the search-log
-- + admin queue never see ghost slugs.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_listing_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_slug IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM categories WHERE slug = NEW.category_slug) THEN
      RAISE EXCEPTION 'Unknown category_slug: %', NEW.category_slug
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_listing_category_slug_trg ON listings;
CREATE TRIGGER enforce_listing_category_slug_trg
  BEFORE INSERT OR UPDATE OF category_slug ON listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_category_slug();

COMMENT ON FUNCTION public.enforce_listing_category_slug() IS
  'S5: rejects listings.category_slug values that do not exist in categories.slug';

-- Refresh PostgREST schema cache so embeds resolve immediately.
NOTIFY pgrst, 'reload schema';
