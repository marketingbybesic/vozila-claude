# Supabase Security Implementation Guide

## Overview
This guide explains how to implement the production-ready security configuration for Vozila.hr.

## Quick Start

### Step 1: Copy SQL Script
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `SUPABASE_RLS_SECURITY.sql`
5. Paste into the SQL editor
6. Click **Run**

### Step 2: Verify Installation
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies are created
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public';
```

### Step 3: Test Security
```sql
-- Test rate limiting
SELECT check_listing_rate_limit('192.168.1.1'::INET);

-- Test lead count (requires admin)
SELECT get_listing_lead_count('your-listing-id'::UUID);
```

## Security Policies Explained

### Listings Table

#### Policy 1: Anonymous SELECT (Published/Inactive)
```sql
CREATE POLICY "anon_select_published_inactive"
  ON listings
  FOR SELECT
  TO anon
  USING (status = 'published' OR status = 'inactive');
```
- **Who**: Anonymous users
- **What**: Can view published and inactive listings
- **Why**: Public marketplace visibility
- **Prevents**: Seeing draft listings from other users

#### Policy 2: Owner UPDATE/DELETE
```sql
CREATE POLICY "auth_update_own_listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```
- **Who**: Authenticated users
- **What**: Can only update their own listings
- **Why**: Prevent users from modifying other users' listings
- **Prevents**: Cross-user data manipulation

#### Policy 3: Admin Full Access
```sql
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
```
- **Who**: Admin users
- **What**: Can view, update, delete all listings
- **Why**: Admin moderation and management
- **Prevents**: Non-admins from accessing admin features

### Leads Table

#### Policy 1: Anonymous INSERT (Track Clicks)
```sql
CREATE POLICY "anon_insert_leads"
  ON listing_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);
```
- **Who**: Anonymous users
- **What**: Can create lead records
- **Why**: Track WhatsApp/message clicks
- **Prevents**: Nothing - we want to track all clicks

#### Policy 2: No SELECT (Privacy)
```sql
CREATE POLICY "no_select_leads"
  ON listing_leads
  FOR SELECT
  TO anon
  USING (false);
```
- **Who**: Anonymous users
- **What**: Cannot view any leads
- **Why**: Privacy - prevent data harvesting
- **Prevents**: Scraping lead data

#### Policy 3: Admin SELECT
```sql
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
```
- **Who**: Admin users
- **What**: Can view all leads
- **Why**: Analytics and reporting
- **Prevents**: Non-admins from viewing lead data

#### Policy 4: Owner SELECT Own Leads
```sql
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
```
- **Who**: Authenticated users
- **What**: Can view leads for their own listings
- **Why**: Dealers see their own lead data
- **Prevents**: Seeing other dealers' leads

## Rate Limiting

### How It Works

1. **Check Rate Limit**:
   ```sql
   SELECT check_listing_rate_limit('192.168.1.1'::INET);
   -- Returns: true if under limit, false if exceeded
   ```

2. **Log Creation**:
   ```sql
   PERFORM log_listing_creation(client_ip);
   -- Records the listing creation for this IP
   ```

3. **Enforce via Trigger**:
   ```sql
   CREATE TRIGGER listing_rate_limit_trigger
   BEFORE INSERT ON listings
   FOR EACH ROW
   EXECUTE FUNCTION enforce_listing_rate_limit();
   ```

### Configuration

**Current Limit**: 3 listings per hour per IP

**To Change Limit**:
```sql
-- Edit this line in check_listing_rate_limit function:
RETURN listing_count < 3;  -- Change 3 to desired limit

-- And this line:
AND created_at > NOW() - INTERVAL '1 hour';  -- Change interval
```

### Testing Rate Limiting

```sql
-- Insert 3 listings from same IP (should succeed)
INSERT INTO listings (...) VALUES (...);
INSERT INTO listings (...) VALUES (...);
INSERT INTO listings (...) VALUES (...);

-- Insert 4th listing (should fail with rate limit error)
INSERT INTO listings (...) VALUES (...);
-- Error: Rate limit exceeded: Maximum 3 listings per hour allowed
```

## Analytics Functions

### Get Lead Count for Listing
```typescript
// In your application
const { data, error } = await supabase.rpc('get_listing_lead_count', {
  listing_id: 'your-listing-id'
});
```

**Requirements**:
- User must be admin
- Returns total lead count for listing

### Get Lead Breakdown by Type
```typescript
const { data, error } = await supabase.rpc('get_listing_lead_breakdown', {
  listing_id: 'your-listing-id'
});
// Returns: [{ lead_type: 'whatsapp', count: 5 }, ...]
```

**Requirements**:
- User must be admin
- Returns breakdown: whatsapp, message, phone, email

### Get Owner's Total Leads
```typescript
const { data, error } = await supabase.rpc('get_owner_total_leads');
// Returns: total lead count for all user's listings
```

**Requirements**:
- User must be authenticated
- Returns total leads across all their listings

## Audit Logging

### What Gets Logged
- All INSERT operations on listings
- All UPDATE operations on listings
- All DELETE operations on listings
- User ID, timestamp, old/new values

### Query Audit Log
```sql
-- Get all changes by a user
SELECT * FROM audit_log 
WHERE user_id = 'user-id'
ORDER BY created_at DESC;

-- Get all deletes
SELECT * FROM audit_log 
WHERE action = 'DELETE'
ORDER BY created_at DESC;

-- Get changes to specific listing
SELECT * FROM audit_log 
WHERE record_id = 'listing-id'
ORDER BY created_at DESC;
```

## Testing Checklist

### Before Production Launch

- [ ] **RLS Enabled**: Verify all tables have RLS enabled
- [ ] **Policies Created**: Check all policies exist
- [ ] **Anonymous Access**: Test anonymous user can only see published listings
- [ ] **Owner Access**: Test user can only modify own listings
- [ ] **Admin Access**: Test admin can see all listings
- [ ] **Lead Privacy**: Test anonymous users cannot view leads
- [ ] **Lead Insert**: Test leads can be inserted
- [ ] **Rate Limiting**: Test 3 listings per hour limit
- [ ] **Audit Logging**: Test changes are logged
- [ ] **Performance**: Run EXPLAIN ANALYZE on key queries

### Test Queries

```sql
-- Test 1: Anonymous can see published
SELECT COUNT(*) FROM listings 
WHERE status = 'published';

-- Test 2: Anonymous cannot see draft
SELECT COUNT(*) FROM listings 
WHERE status = 'draft';

-- Test 3: Owner can see own draft
SELECT COUNT(*) FROM listings 
WHERE status = 'draft' AND owner_id = auth.uid();

-- Test 4: Admin can see all
SELECT COUNT(*) FROM listings;

-- Test 5: Leads cannot be selected by anon
SELECT COUNT(*) FROM listing_leads;
-- Should return 0 or error

-- Test 6: Leads can be inserted
INSERT INTO listing_leads (listing_id, lead_type) 
VALUES ('listing-id', 'whatsapp');

-- Test 7: Rate limit check
SELECT check_listing_rate_limit('192.168.1.1'::INET);
```

## Troubleshooting

### Issue: "Permission denied" when querying
**Solution**: Check RLS policies are correct
```sql
SELECT * FROM pg_policies WHERE tablename = 'listings';
```

### Issue: Rate limiting not working
**Solution**: Verify trigger is attached
```sql
SELECT * FROM pg_trigger WHERE tgrelname = 'listings';
```

### Issue: Admin cannot see all listings
**Solution**: Check admin role is set in profiles table
```sql
SELECT id, role FROM profiles WHERE id = 'user-id';
-- Should show role = 'admin'
```

### Issue: Audit logs not recording
**Solution**: Verify audit trigger is attached
```sql
SELECT * FROM pg_trigger WHERE tgrelname = 'listings';
-- Should include audit_listing_changes_trigger
```

## Performance Optimization

### Index Strategy
```sql
-- Already created indexes:
CREATE INDEX idx_listing_leads_listing_id ON listing_leads(listing_id);
CREATE INDEX idx_listing_leads_user_id ON listing_leads(user_id);
CREATE INDEX idx_listing_leads_created_at ON listing_leads(created_at);
CREATE INDEX idx_rate_limit_ip_action_time ON rate_limit_log(ip_address, action, created_at);
CREATE INDEX idx_audit_log_user_table_time ON audit_log(user_id, table_name, created_at);

-- Add more if needed:
CREATE INDEX idx_listings_owner_status ON listings(owner_id, status);
CREATE INDEX idx_listings_category_status ON listings(category_slug, status);
```

### Query Optimization
```sql
-- Use EXPLAIN ANALYZE to check performance
EXPLAIN ANALYZE
SELECT * FROM listings 
WHERE status = 'published' 
ORDER BY created_at DESC 
LIMIT 20;

-- Look for:
-- - Sequential scans (should use indexes)
-- - High execution time
-- - High memory usage
```

## Production Checklist

- [ ] All RLS policies are enabled
- [ ] Rate limiting is configured
- [ ] Audit logging is active
- [ ] Indexes are created
- [ ] Backup strategy is in place
- [ ] Monitoring is set up
- [ ] Error handling is implemented
- [ ] Load testing is complete
- [ ] Security audit is passed
- [ ] Documentation is updated

## Support & Monitoring

### Monitor Rate Limiting
```sql
-- See rate limit activity
SELECT ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM rate_limit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY attempts DESC;
```

### Monitor Audit Log
```sql
-- See recent changes
SELECT user_id, table_name, action, COUNT(*) as count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, table_name, action;
```

### Monitor Lead Activity
```sql
-- See lead trends
SELECT DATE(created_at) as date, lead_type, COUNT(*) as count
FROM listing_leads
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), lead_type
ORDER BY date DESC;
```

## Next Steps

1. **Run SQL Script**: Execute the security configuration
2. **Test Policies**: Verify all RLS policies work correctly
3. **Monitor Performance**: Check query performance with indexes
4. **Set Up Alerts**: Configure monitoring for suspicious activity
5. **Document Access**: Keep records of who has admin access
6. **Regular Audits**: Review audit logs weekly
7. **Update Procedures**: Document security procedures for team

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
