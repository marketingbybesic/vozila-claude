-- ============================================================================
-- Vozila.hr - Phase 12: SEO + observability
-- Migration: 005_seo.sql
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. search_log — top queries + 0-result queries to inform admin SEO console.
--    Anon-allowed insert. We only persist URL params + result count, never
--    PII. Old rows trimmed by a daily cron (deferred to phase 13).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS search_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_slug VARCHAR(100),
  params JSONB NOT NULL DEFAULT '{}',
  url TEXT NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_log_created ON search_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_log_zero_results
  ON search_log(created_at DESC) WHERE result_count = 0;
CREATE INDEX IF NOT EXISTS idx_search_log_category ON search_log(category_slug, created_at DESC);

ALTER TABLE search_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_log_anyone_insert ON search_log;
CREATE POLICY search_log_anyone_insert ON search_log
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS search_log_admin_select ON search_log;
CREATE POLICY search_log_admin_select ON search_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

-- ----------------------------------------------------------------------------
-- 2. og_image_cache — pre-rendered listing OG cards. Edge Function 'og-image'
--    looks up by listing_id; if found and listing.updated_at matches, returns
--    the cached PNG. Otherwise renders fresh + upserts.
--    Storage: Supabase Storage 'og-cache' bucket (created out-of-band).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS og_image_cache (
  listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  listing_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  rendered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_og_image_cache_rendered ON og_image_cache(rendered_at DESC);

-- ----------------------------------------------------------------------------
-- 3. gdpr_export_jobs — async job tracking for /postavke "Download my data".
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gdpr_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'ready' | 'failed'
  download_url TEXT,
  download_token VARCHAR(64),  -- random URL-safe token, used in download URL
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_gdpr_export_user ON gdpr_export_jobs(user_id, created_at DESC);

ALTER TABLE gdpr_export_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gdpr_export_self ON gdpr_export_jobs;
CREATE POLICY gdpr_export_self ON gdpr_export_jobs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
