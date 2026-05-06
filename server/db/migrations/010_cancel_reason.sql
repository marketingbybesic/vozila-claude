-- ============================================================================
-- Vozila.hr - Polish round 2: cancel reason analytics
-- Migration: 010_cancel_reason.sql
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- inspection_bookings.cancel_reason
-- ----------------------------------------------------------------------------

ALTER TABLE inspection_bookings
  ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(48),
  ADD COLUMN IF NOT EXISTS cancel_notes TEXT,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_inspection_bookings_cancel
  ON inspection_bookings(cancel_reason, canceled_at DESC)
  WHERE cancel_reason IS NOT NULL;

-- ----------------------------------------------------------------------------
-- vin_reports.signed_url_expires_at
-- Stored so MyPurchasesCard can decide if a refresh is needed before clicking.
-- ----------------------------------------------------------------------------

ALTER TABLE vin_reports
  ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS storage_path VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_vin_reports_signed_url_expires
  ON vin_reports(signed_url_expires_at)
  WHERE status = 'delivered';
