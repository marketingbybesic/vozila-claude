-- ============================================================================
-- Vozila.hr - Phase 13.1: Admin extras — payments + cron heartbeat
-- Migration: 007_admin_extras.sql
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. cron_runs — heartbeat row per Edge Function cron invocation.
--    Decorated cron Edge Functions (saved-searches-digest, expire-featured)
--    write a row at start + end so the admin Cron tab can show last-run +
--    success/failure + duration.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cron_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL,                 -- 'running' | 'success' | 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT,
  result JSONB,                                -- per-job summary (sent/skipped/expired/etc.)
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_started
  ON cron_runs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_runs_started ON cron_runs(started_at DESC);

ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cron_runs_admin_select ON cron_runs;
CREATE POLICY cron_runs_admin_select ON cron_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator'))
  );

-- Service role inserts/updates rows from Edge Functions.

-- ----------------------------------------------------------------------------
-- 2. RLS for stripe_events (already exists from migration 002) — admin select.
-- ----------------------------------------------------------------------------

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_events_admin_select ON stripe_events;
CREATE POLICY stripe_events_admin_select ON stripe_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

-- ----------------------------------------------------------------------------
-- 3. View — payments_summary aggregating Stripe activity for the admin Pay tab.
--    Counts per-event-type for the last 30 days, plus boost/sub revenue.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW payments_summary AS
SELECT
  (SELECT COUNT(*) FROM stripe_events WHERE processed_at > NOW() - INTERVAL '30 days') AS events_30d,
  (SELECT COUNT(*) FROM stripe_events WHERE type = 'checkout.session.completed' AND processed_at > NOW() - INTERVAL '30 days') AS checkouts_30d,
  (SELECT COUNT(*) FROM stripe_events WHERE type = 'customer.subscription.created' AND processed_at > NOW() - INTERVAL '30 days') AS new_subs_30d,
  (SELECT COUNT(*) FROM stripe_events WHERE type = 'customer.subscription.deleted' AND processed_at > NOW() - INTERVAL '30 days') AS canceled_subs_30d,
  (SELECT COUNT(*) FROM stripe_events WHERE type = 'invoice.payment_failed' AND processed_at > NOW() - INTERVAL '30 days') AS failed_invoices_30d,
  (SELECT COUNT(*) FROM listings WHERE is_featured = true AND featured_until > NOW()) AS featured_active,
  (SELECT COUNT(*) FROM profiles WHERE subscription_status IN ('active', 'trialing')) AS subs_active,
  (SELECT COUNT(*) FROM profiles WHERE subscription_status = 'past_due') AS subs_past_due,
  (SELECT COUNT(*) FROM vin_reports WHERE status IN ('paid', 'generated', 'delivered')) AS vin_reports_paid,
  (SELECT COUNT(*) FROM inspection_bookings WHERE status IN ('paid', 'assigned', 'completed')) AS inspections_paid;
