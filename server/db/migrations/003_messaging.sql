-- ============================================================================
-- Vozila.hr - Phase 10: Messaging, notifications, reports, saved-searches DB
-- Migration: 003_messaging.sql
-- Idempotent — safe to re-run.
-- Depends on 002_fix_listings_drift.sql (profiles table must exist).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. conversations — one row per buyer↔seller↔listing thread.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  buyer_unread INT NOT NULL DEFAULT 0,
  seller_unread INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',  -- 'open' | 'archived' | 'blocked'
  buyer_revealed_phone BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- One thread per (listing, buyer) pair. Buyer can't open multiple threads
  -- on the same listing — protects sellers from spam and keeps history tidy.
  UNIQUE (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id);

-- ----------------------------------------------------------------------------
-- 2. messages — append-only message log per conversation.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  read_at TIMESTAMP WITH TIME ZONE,
  -- Soft-flag for moderation (set by anti-scam rules or admin action).
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- After-insert trigger: bumps last_message_at + the recipient's unread counter.
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
BEGIN
  SELECT buyer_id, seller_id INTO conv FROM conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_id = conv.buyer_id THEN
    UPDATE conversations
       SET last_message_at = NEW.created_at,
           seller_unread = seller_unread + 1
     WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations
       SET last_message_at = NEW.created_at,
           buyer_unread = buyer_unread + 1
     WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- ----------------------------------------------------------------------------
-- 3. notifications — generic per-user feed (messages, saved-search hits,
--    boost-purchased, listing-expiring, dealer-payout, etc.)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(48) NOT NULL,  -- 'new_message' | 'saved_search_hits' | 'boost_purchased' | 'listing_expiring' | etc.
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ----------------------------------------------------------------------------
-- 4. reports — listing reports (scam, duplicate, wrong-category, etc.)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason VARCHAR(48) NOT NULL,  -- 'scam' | 'duplicate' | 'wrong_category' | 'nsfw' | 'sold' | 'other'
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',  -- 'open' | 'reviewed' | 'resolved' | 'rejected'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_listing ON reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. saved_searches — promote from localStorage to DB so cron can run digests.
-- localStorage stays as anonymous fallback.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,                    -- /pretraga?make=BMW&priceMax=25000
  category_slug VARCHAR(100),
  params JSONB NOT NULL DEFAULT '{}',   -- structured copy for server-side replay
  last_seen_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  email_alert BOOLEAN NOT NULL DEFAULT false,
  push_alert BOOLEAN NOT NULL DEFAULT false,
  last_visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_digest_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Same user can't have duplicate saved searches.
  UNIQUE (user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id, last_visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_email_alert ON saved_searches(email_alert) WHERE email_alert = true;

-- ----------------------------------------------------------------------------
-- 6. email_unsubscribes — HMAC-signed unsubscribe tokens go here so we can
-- record + idempotently process unsubscribe clicks per category.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(48) NOT NULL,  -- 'saved_search_digest' | 'marketing' | 'all'
  unsubscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user ON email_unsubscribes(user_id);

-- ----------------------------------------------------------------------------
-- 7. RLS policies
-- ----------------------------------------------------------------------------

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_participant_select ON conversations;
CREATE POLICY conversations_participant_select ON conversations
  FOR SELECT USING (auth.uid() IN (buyer_id, seller_id));

DROP POLICY IF EXISTS conversations_buyer_insert ON conversations;
CREATE POLICY conversations_buyer_insert ON conversations
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS conversations_participant_update ON conversations;
CREATE POLICY conversations_participant_update ON conversations
  FOR UPDATE USING (auth.uid() IN (buyer_id, seller_id))
  WITH CHECK (auth.uid() IN (buyer_id, seller_id));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_participant_select ON messages;
CREATE POLICY messages_participant_select ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND auth.uid() IN (c.buyer_id, c.seller_id)
    )
  );

DROP POLICY IF EXISTS messages_participant_insert ON messages;
CREATE POLICY messages_participant_insert ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND auth.uid() IN (c.buyer_id, c.seller_id)
        AND c.status = 'open'
    )
  );

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_self_select ON notifications;
CREATE POLICY notifications_self_select ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_self_update ON notifications;
CREATE POLICY notifications_self_update ON notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_anyone_insert ON reports;
CREATE POLICY reports_anyone_insert ON reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS reports_admin_select ON reports;
CREATE POLICY reports_admin_select ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator'))
  );

DROP POLICY IF EXISTS reports_admin_update ON reports;
CREATE POLICY reports_admin_update ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator'))
  );

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_searches_self_all ON saved_searches;
CREATE POLICY saved_searches_self_all ON saved_searches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_unsubscribes_self_select ON email_unsubscribes;
CREATE POLICY email_unsubscribes_self_select ON email_unsubscribes
  FOR SELECT USING (auth.uid() = user_id);

-- Service role (Edge Functions) bypasses RLS — webhooks + cron use it.

-- ----------------------------------------------------------------------------
-- 8. Realtime: enable for messages + conversations + notifications.
-- Run once per Supabase project (idempotent — pg adds to publication).
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE conversations';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- supabase_realtime publication may not exist on self-hosted setups; ignore.
  NULL;
END $$;
