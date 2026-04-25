-- ============================================================================
-- SUPABASE RLS SECURITY CONFIGURATION
-- Production-Ready Security Policies for Vozila.hr
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on listings table
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on listing_images table
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- Enable RLS on listing_leads table (create if not exists)
ALTER TABLE listing_leads ENABLE ROW LEVEL SECURITY;

-- Enable RLS on messages table (if exists)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: LISTINGS TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Anonymous users can SELECT only published and inactive listings
CREATE POLICY "anon_select_published_inactive"
  ON listings
  FOR SELECT
  TO anon
  USING (status = 'published' OR status = 'inactive');

-- Policy 2: Authenticated users can SELECT published and inactive listings
CREATE POLICY "auth_select_published_inactive"
  ON listings
  FOR SELECT
  TO authenticated
  USING (status = 'published' OR status = 'inactive');

-- Policy 3: Authenticated users can SELECT their own draft listings
CREATE POLICY "auth_select_own_drafts"
  ON listings
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() AND status = 'draft');

-- Policy 4: Authenticated users can INSERT listings
CREATE POLICY "auth_insert_listings"
  ON listings
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Policy 5: Authenticated users can UPDATE their own listings
CREATE POLICY "auth_update_own_listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy 6: Authenticated users can DELETE their own listings
CREATE POLICY "auth_delete_own_listings"
  ON listings
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Policy 7: Admin can SELECT all listings (requires admin role)
CREATE POLICY "admin_select_all_listings"
  ON listings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 8: Admin can UPDATE all listings
CREATE POLICY "admin_update_all_listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 9: Admin can DELETE all listings
CREATE POLICY "admin_delete_all_listings"
  ON listings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 3: LISTING_IMAGES TABLE RLS POLICIES
-- ============================================================================

-- Policy 1: Anonymous users can SELECT images for published/inactive listings
CREATE POLICY "anon_select_listing_images"
  ON listing_images
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND (listings.status = 'published' OR listings.status = 'inactive')
    )
  );

-- Policy 2: Authenticated users can SELECT images for their own listings
CREATE POLICY "auth_select_own_listing_images"
  ON listing_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Policy 3: Authenticated users can INSERT images for their own listings
CREATE POLICY "auth_insert_own_listing_images"
  ON listing_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Policy 4: Authenticated users can DELETE images from their own listings
CREATE POLICY "auth_delete_own_listing_images"
  ON listing_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: LISTING_LEADS TABLE RLS POLICIES
-- ============================================================================

-- Create listing_leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS listing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_type VARCHAR(20) NOT NULL CHECK (lead_type IN ('whatsapp', 'message', 'phone', 'email')),
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create index for faster queries
CREATE INDEX idx_listing_leads_listing_id ON listing_leads(listing_id);
CREATE INDEX idx_listing_leads_user_id ON listing_leads(user_id);
CREATE INDEX idx_listing_leads_created_at ON listing_leads(created_at);

-- Policy 1: Anonymous users can INSERT leads (track clicks)
CREATE POLICY "anon_insert_leads"
  ON listing_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 2: Authenticated users can INSERT leads
CREATE POLICY "auth_insert_leads"
  ON listing_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: Users cannot SELECT leads (privacy)
CREATE POLICY "no_select_leads"
  ON listing_leads
  FOR SELECT
  TO anon
  USING (false);

-- Policy 4: Authenticated users cannot SELECT leads
CREATE POLICY "auth_no_select_leads"
  ON listing_leads
  FOR SELECT
  TO authenticated
  USING (false);

-- Policy 5: Admin can SELECT all leads
CREATE POLICY "admin_select_all_leads"
  ON listing_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 6: Listing owner can SELECT leads for their own listings
CREATE POLICY "owner_select_own_listing_leads"
  ON listing_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_leads.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: RATE LIMITING FUNCTION
-- ============================================================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient rate limit checks
CREATE INDEX idx_rate_limit_ip_action_time ON rate_limit_log(ip_address, action, created_at);

-- Function to check rate limit (max 3 listings per hour per IP)
CREATE OR REPLACE FUNCTION check_listing_rate_limit(ip_address INET)
RETURNS BOOLEAN AS $$
DECLARE
  listing_count INTEGER;
BEGIN
  -- Count listings created by this IP in the last hour
  SELECT COUNT(*) INTO listing_count
  FROM rate_limit_log
  WHERE rate_limit_log.ip_address = check_listing_rate_limit.ip_address
    AND action = 'create_listing'
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Return true if under limit (3 listings per hour)
  RETURN listing_count < 3;
END;
$$ LANGUAGE plpgsql;

-- Function to log listing creation for rate limiting
CREATE OR REPLACE FUNCTION log_listing_creation(ip_address INET)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limit_log (ip_address, action, created_at)
  VALUES (ip_address, 'create_listing', NOW());
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce rate limiting on listing creation
CREATE OR REPLACE FUNCTION enforce_listing_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  client_ip INET;
BEGIN
  -- Get client IP from request headers (set via Supabase)
  client_ip := current_setting('request.headers')::json->>'x-forwarded-for'::INET;
  
  -- If IP is not available, use a default
  IF client_ip IS NULL THEN
    client_ip := '0.0.0.0'::INET;
  END IF;

  -- Check rate limit
  IF NOT check_listing_rate_limit(client_ip) THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 listings per hour allowed';
  END IF;

  -- Log the creation
  PERFORM log_listing_creation(client_ip);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to listings table
DROP TRIGGER IF EXISTS listing_rate_limit_trigger ON listings;
CREATE TRIGGER listing_rate_limit_trigger
BEFORE INSERT ON listings
FOR EACH ROW
EXECUTE FUNCTION enforce_listing_rate_limit();

-- ============================================================================
-- STEP 6: HELPER FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Function to get lead count for a listing (admin only)
CREATE OR REPLACE FUNCTION get_listing_lead_count(listing_id UUID)
RETURNS INTEGER AS $$
DECLARE
  lead_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view lead counts';
  END IF;

  -- Get lead count
  SELECT COUNT(*) INTO lead_count
  FROM listing_leads
  WHERE listing_leads.listing_id = get_listing_lead_count.listing_id;

  RETURN COALESCE(lead_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get lead breakdown by type (admin only)
CREATE OR REPLACE FUNCTION get_listing_lead_breakdown(listing_id UUID)
RETURNS TABLE(lead_type VARCHAR, count INTEGER) AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view lead breakdown';
  END IF;

  RETURN QUERY
  SELECT 
    listing_leads.lead_type,
    COUNT(*)::INTEGER
  FROM listing_leads
  WHERE listing_leads.listing_id = get_listing_lead_breakdown.listing_id
  GROUP BY listing_leads.lead_type;
END;
$$ LANGUAGE plpgsql;

-- Function to get total leads for owner's listings
CREATE OR REPLACE FUNCTION get_owner_total_leads()
RETURNS INTEGER AS $$
DECLARE
  total_leads INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_leads
  FROM listing_leads
  WHERE EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = listing_leads.listing_id
    AND listings.owner_id = auth.uid()
  );

  RETURN COALESCE(total_leads, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: AUDIT LOGGING
-- ============================================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for audit queries
CREATE INDEX idx_audit_log_user_table_time ON audit_log(user_id, table_name, created_at);

-- Function to log changes to listings
CREATE OR REPLACE FUNCTION audit_listing_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, table_name, action, record_id, new_values, created_at)
    VALUES (auth.uid(), 'listings', 'INSERT', NEW.id, to_jsonb(NEW), NOW());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, table_name, action, record_id, old_values, new_values, created_at)
    VALUES (auth.uid(), 'listings', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), NOW());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, table_name, action, record_id, old_values, created_at)
    VALUES (auth.uid(), 'listings', 'DELETE', OLD.id, to_jsonb(OLD), NOW());
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach audit trigger to listings
DROP TRIGGER IF EXISTS audit_listing_changes_trigger ON listings;
CREATE TRIGGER audit_listing_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON listings
FOR EACH ROW
EXECUTE FUNCTION audit_listing_changes();

-- ============================================================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Verify policies are created
-- SELECT tablename, policyname, permissive, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public';

-- Test rate limiting (should fail if more than 3 in last hour)
-- SELECT check_listing_rate_limit('192.168.1.1'::INET);

-- Get admin lead count for a listing
-- SELECT get_listing_lead_count('listing-id-here'::UUID);

-- Get lead breakdown
-- SELECT * FROM get_listing_lead_breakdown('listing-id-here'::UUID);

-- ============================================================================
-- STEP 9: CLEANUP (Optional - Remove if not needed)
-- ============================================================================

-- Drop all RLS policies (if you need to start over)
-- DO $$
-- DECLARE
--   policy_record RECORD;
-- BEGIN
--   FOR policy_record IN
--     SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
--   LOOP
--     EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || 
--             ' ON ' || quote_ident(policy_record.tablename);
--   END LOOP;
-- END $$;

-- ============================================================================
-- NOTES FOR PRODUCTION
-- ============================================================================

-- 1. RATE LIMITING:
--    - The rate limiting function uses x-forwarded-for header
--    - Make sure your Supabase project is configured to pass this header
--    - Alternative: Use IP from auth.jwt() if available
--    - Consider using a Redis-based solution for higher traffic

-- 2. RLS POLICIES:
--    - Test all policies thoroughly before going live
--    - Use Supabase dashboard to verify policies are working
--    - Monitor performance - RLS can add query overhead

-- 3. AUDIT LOGGING:
--    - Audit logs can grow large - consider archiving old logs
--    - Use partitioning for better performance
--    - Set up automated cleanup jobs

-- 4. SECURITY BEST PRACTICES:
--    - Never expose auth.uid() in client-side code
--    - Always validate input on the server
--    - Use HTTPS for all connections
--    - Implement CORS properly
--    - Monitor for suspicious activity

-- 5. PERFORMANCE OPTIMIZATION:
--    - Add indexes for frequently queried columns
--    - Use EXPLAIN ANALYZE to check query performance
--    - Consider materialized views for complex queries
--    - Monitor database size and growth

-- ============================================================================
