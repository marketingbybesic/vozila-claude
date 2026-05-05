# Vozila.hr — Live Deploy Runbook v2

**Covers:** every phase shipped (9 → 14.1). Walks from a fresh Supabase project + Stripe account + Resend account to a fully operational `https://vozila.hr` (or `https://testiranje.cloud`) deploy.

**Time:** ~90 minutes the first time. ~5 minutes per re-deploy after that.

**Prerequisites:**
- macOS / Linux terminal
- Supabase CLI: `brew install supabase/tap/supabase`
- Stripe CLI: `brew install stripe/stripe-cli/stripe`
- Logged in: `supabase login`, `stripe login`
- Access to: Supabase Dashboard, Stripe Dashboard, Resend Dashboard, GitHub repo, Hostinger (or wherever the static site is hosted)
- A working `keychain` setup or password manager — never paste secrets into chat

---

## Section 0 — One-time accounts

| Service | Sign up at | Why we need it |
|---|---|---|
| Supabase | supabase.com — create new project | DB + Auth + Storage + Edge Functions + Realtime |
| Stripe | dashboard.stripe.com — keep TEST mode for now | Payments (Boost, Subs, VIN, Inspection) |
| Resend | resend.com — verify `vozila.hr` domain | Transactional + digest emails |
| Anthropic | console.anthropic.com — create API key | AI listing copywriter |
| Sentry | sentry.io — free tier | Error monitoring (optional) |
| Mapbox | mapbox.com — free tier | Map view (optional, phase 12.x) |

Stash every API key in the macOS keychain (use `security add-generic-password ...` or a password manager). Never paste into chat.

---

## Section 1 — Run all migrations

Open Supabase Dashboard → **SQL Editor** → **New query**.

Run these in order, one at a time. Each is idempotent — safe to re-run.

```sql
-- Open server/db/migrations/001_core_schema.sql in your editor, paste, RUN.
-- Open server/db/migrations/002_fix_listings_drift.sql, paste, RUN.
-- Open server/db/migrations/003_messaging.sql, paste, RUN.
-- Open server/db/migrations/004_leads.sql, paste, RUN.
-- Open server/db/migrations/005_seo.sql, paste, RUN.
-- Open server/db/migrations/006_admin.sql, paste, RUN.
-- Open server/db/migrations/007_admin_extras.sql, paste, RUN.
-- Open server/db/migrations/008_phase14.sql, paste, RUN.
```

**Verify (paste in SQL editor):**

```sql
-- Should return 8+ tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'listings','profiles','stripe_events','conversations','messages',
    'notifications','reports','saved_searches','email_unsubscribes',
    'leads','reviews','inspection_bookings','vin_reports',
    'search_log','og_image_cache','gdpr_export_jobs',
    'audit_log','kill_switches','cron_runs',
    'auctions','auction_bids')
ORDER BY table_name;

-- Should return 'admin_overview', 'payments_summary', 'inspection_queue', 'dealer_rating_summary'
SELECT table_name FROM information_schema.views WHERE table_schema='public';

-- Should return place_auction_bid, settle_ended_auctions, handle_new_user, bump_conversation_on_message, update_updated_at_column
SELECT routine_name FROM information_schema.routines
WHERE routine_schema='public' AND routine_type='FUNCTION';

-- Should return 5 rows (one per default kill switch)
SELECT name, enabled FROM kill_switches ORDER BY name;
```

**Make yourself an admin** so the `/admin` console is reachable. Find your user id in Auth → Users, then:

```sql
UPDATE profiles SET role = 'owner' WHERE id = '<your-auth-user-id>';
```

---

## Section 2 — Stripe products + prices (test mode)

Stripe Dashboard → toggle **Test mode** (top-right) → **Catalog → Products**.

Create 9 prices total. Copy each Price ID into a scratchpad — you'll set them as env in Section 3.

### Boost (one-time)
| Product | Price | Type | Env var |
|---|---|---|---|
| Vozila Boost — Top 48h | 4.99 EUR | One-time | `STRIPE_PRICE_BOOST_TOP` |
| Vozila Boost — Featured 7 dana | 14.99 EUR | One-time | `STRIPE_PRICE_BOOST_FEATURED` |
| Vozila Boost — Premium 30 dana | 49.00 EUR | One-time | `STRIPE_PRICE_BOOST_PREMIUM` |

### Dealer subscriptions (recurring monthly)
| Product | Price | Type | Env var |
|---|---|---|---|
| Vozila Bronze | 39 EUR / month | Recurring | `STRIPE_PRICE_SUB_BRONZE` |
| Vozila Silver | 99 EUR / month | Recurring | `STRIPE_PRICE_SUB_SILVER` |
| Vozila Gold | 299 EUR / month | Recurring | `STRIPE_PRICE_SUB_GOLD` |

### One-shot products
| Product | Price | Type | Env var |
|---|---|---|---|
| VIN izvještaj | 9.99 EUR | One-time | `STRIPE_PRICE_VIN_REPORT` |

(Inspection at 100 EUR is currently captured-intent only — Stripe wire-up is phase 14.x; skip for now.)

### Customer Portal
Stripe → **Settings → Billing → Customer portal** → enable: cancel subscription, update payment method, view invoices, switch plan (link Bronze/Silver/Gold).

### Stripe Tax (EU)
Stripe → **Settings → Tax** → enable Stripe Tax → add `Hrvatska / VAT 25%` as origin and target.

---

## Section 3 — Edge Function secrets

Create `supabase/.env.local` (NOT committed — gitignored):

```bash
# === Supabase ===
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
SUPABASE_ANON_KEY=eyJhbGciOi...

# === Stripe (test) ===
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...                 # filled in after Section 5
STRIPE_PRICE_BOOST_TOP=price_...
STRIPE_PRICE_BOOST_FEATURED=price_...
STRIPE_PRICE_BOOST_PREMIUM=price_...
STRIPE_PRICE_SUB_BRONZE=price_...
STRIPE_PRICE_SUB_SILVER=price_...
STRIPE_PRICE_SUB_GOLD=price_...
STRIPE_PRICE_VIN_REPORT=price_...

# === Email — Resend ===
RESEND_API_KEY=re_...
RESEND_FROM='Vozila <noreply@vozila.hr>'        # after domain verification
PUBLIC_SITE_URL=https://testiranje.cloud        # or https://vozila.hr
EMAIL_HMAC_SECRET=$(openssl rand -hex 32)       # generate once, keep stable

# === AI ===
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

Push to Supabase:

```bash
cd "/Users/zmaj/Documents/Vozila Claude"
supabase link --project-ref <your-ref>      # one-time
supabase secrets set --env-file ./supabase/.env.local
supabase secrets list                       # verify all 17 keys present
```

---

## Section 4 — Deploy all Edge Functions

```bash
cd "/Users/zmaj/Documents/Vozila Claude"

# Phase 9 — Stripe
supabase functions deploy create-boost-checkout
supabase functions deploy create-subscription-checkout
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy expire-featured --no-verify-jwt

# Phase 10 — email
supabase functions deploy send-email --no-verify-jwt        # service-role gated internally
supabase functions deploy notify-new-message                # accepts user JWT or service-role
supabase functions deploy saved-searches-digest --no-verify-jwt
supabase functions deploy unsubscribe --no-verify-jwt

# Phase 11 — AI + VIN
supabase functions deploy ai-listing-copy
supabase functions deploy vin-report-checkout

# Phase 12 — SEO + GDPR
supabase functions deploy sitemap --no-verify-jwt
supabase functions deploy og-image --no-verify-jwt
supabase functions deploy gdpr-export

# Phase 14 — auctions
supabase functions deploy auction-settle --no-verify-jwt
supabase functions deploy notify-auction-event              # accepts user JWT or service-role
```

**Total: 16 functions.** Verify in Supabase Dashboard → Edge Functions.

Smoke-test the public ones:

```bash
REF=<your-ref>
curl https://$REF.supabase.co/functions/v1/sitemap | head -20      # XML
curl https://$REF.supabase.co/functions/v1/expire-featured         # {"expired":0}
curl https://$REF.supabase.co/functions/v1/auction-settle          # {"settled":0,"dispatched":0}
```

---

## Section 5 — Stripe webhook

Stripe Dashboard → **Developers → Webhooks → Add endpoint**.

- **URL:** `https://<your-ref>.supabase.co/functions/v1/stripe-webhook`
- **Events:** add exactly these 5:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the signing secret (`whsec_...`), update `STRIPE_WEBHOOK_SECRET` in `supabase/.env.local`, then:

```bash
supabase secrets set --env-file ./supabase/.env.local
```

**Verify:** Stripe Dashboard → Webhooks → click your endpoint → **Send test webhook** → `checkout.session.completed`. Should return 200. Check `SELECT * FROM stripe_events LIMIT 5;` — row appears.

---

## Section 6 — Schedule the 4 crons

Supabase Dashboard → **Database → Extensions** → enable `pg_cron` and `pg_net` if not already.

Run this SQL **once**, replacing `<REF>` and `<SERVICE_ROLE_KEY>`:

```sql
-- Daily 02:00 Europe/Zagreb — clear expired featured flags
SELECT cron.schedule('expire-featured-daily', '0 2 * * *', $$
  SELECT net.http_get(
    url := 'https://<REF>.supabase.co/functions/v1/expire-featured',
    headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);

-- Daily 08:00 Europe/Zagreb — saved-search digest emails
SELECT cron.schedule('saved-searches-digest-daily', '0 8 * * *', $$
  SELECT net.http_get(
    url := 'https://<REF>.supabase.co/functions/v1/saved-searches-digest',
    headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);

-- Every 5 minutes — settle ended auctions + dispatch winner/seller emails
SELECT cron.schedule('auction-settle-5min', '*/5 * * * *', $$
  SELECT net.http_get(
    url := 'https://<REF>.supabase.co/functions/v1/auction-settle',
    headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);

-- Verify
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
```

(There are only 3 cron jobs — VIN report generator + email-fail handler are deferred.)

---

## Section 7 — Resend (email)

Resend Dashboard → **Domains → Add domain** `vozila.hr`. Copy the DNS records (3 × CNAME for DKIM + 1 × MX optional + 1 × SPF TXT) into your DNS provider. Wait for verification (~10 min).

For testiranje.cloud: skip for now and use Resend's `onboarding@resend.dev` — works for testing only, gets flagged in production.

Once verified, **send a test:**

```bash
curl -X POST 'https://<REF>.supabase.co/functions/v1/send-email' \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H 'Content-Type: application/json' \
  -d '{
    "to":"<your@email.com>",
    "subject":"Test",
    "html":"<p>hello from vozila</p>",
    "text":"hello from vozila",
    "category":"all",
    "user_id":"<any-valid-auth-user-uuid>"
  }'
```

Inbox should land in 5-30s. Check spam folder if not.

---

## Section 8 — Client environment

`client/.env` (NOT committed):

```bash
# Required
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_FUNCTIONS_URL=https://<your-ref>.supabase.co/functions/v1

# Stripe (publishable + price IDs that the client uses for label display)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_BOOST_TOP=price_...
VITE_STRIPE_BOOST_FEATURED=price_...
VITE_STRIPE_BOOST_PREMIUM=price_...

# Analytics + tracking
VITE_GA4_MEASUREMENT_ID=G-...
VITE_META_PIXEL_ID=...

# Optional
VITE_SENTRY_DSN=https://...@...ingest.sentry.io/...
VITE_RELEASE=$(git rev-parse --short HEAD)
VITE_MAPBOX_TOKEN=pk.eyJ...
```

Build + deploy locally to verify:

```bash
cd "/Users/zmaj/Documents/Vozila Claude"
npm run build       # green
git push origin main # auto-deploy to testiranje.cloud via .github/workflows/deploy.yml
```

---

## Section 9 — Hosting rewrites (sitemap + OG)

Make `/sitemap.xml` and `/api/og` proxies to the corresponding Edge Functions so Google + social previews don't see the Supabase URL.

**Hostinger / Apache `.htaccess`** (in the deployed dist):

```apache
RewriteEngine On
RewriteRule ^sitemap\.xml$ https://<REF>.supabase.co/functions/v1/sitemap [P,L]
RewriteRule ^api/og$ https://<REF>.supabase.co/functions/v1/og-image [P,L]
RewriteRule ^api/unsubscribe$ https://<REF>.supabase.co/functions/v1/unsubscribe [P,L]
```

**Vercel `vercel.json`:**

```json
{
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "https://<REF>.supabase.co/functions/v1/sitemap" },
    { "source": "/api/og", "destination": "https://<REF>.supabase.co/functions/v1/og-image" },
    { "source": "/api/unsubscribe", "destination": "https://<REF>.supabase.co/functions/v1/unsubscribe" }
  ]
}
```

Verify after deploy: `curl -I https://testiranje.cloud/sitemap.xml` → 200 + `Content-Type: application/xml`.

---

## Section 10 — End-to-end live test (45 min)

Use a fresh Chrome incognito + DevTools Network panel.

### 10.1 — Sign-up + role
1. Visit `/profil` → register a new test account.
2. Verify the welcome email lands.
3. Make this user an admin via SQL: `UPDATE profiles SET role='owner' WHERE email='<test-email>';`
4. Sign in → `/admin` should load with the sidebar.

### 10.2 — Listing creation flow
5. Visit `/predaj-oglas` → fill all 3 steps.
6. **In Step 3 leave auction toggle OFF.** Submit. Should land on `/listing/<id>`.
7. Verify the listing appears at `/pretraga`.

### 10.3 — Boost (Stripe test card)
8. From the dashboard, click "Boost" on the listing.
9. Pick "Featured 7 dana" (14.99€). Card: `4242 4242 4242 4242`, any future expiry, any CVC.
10. After redirect to `/listing/<id>?boost=success`, refresh — listing should show **TOP/FEATURED** badge.
11. SQL: `SELECT is_featured, featured_tier, featured_until FROM listings WHERE id='<id>';` — `true`, `featured-7d`, ~7 days from now.
12. Stripe Dashboard → Webhooks → 200 on `checkout.session.completed`.

### 10.4 — Subscription
13. Visit `/za-partnere` → click **Pokreni Bronze**. Same test card.
14. After redirect to `/postavke?sub=success`, the **Pretplata** card should show **Bronze** + renewal date + **Upravljaj pretplatom** button within ~5s (page polls).
15. Click portal button → redirected to Stripe Billing Portal.
16. Cancel sub → return to `/postavke` → SQL eventually shows `subscription_status='canceled'`.

### 10.5 — Messaging
17. Sign in as a second account (different browser profile). Go to seller's listing.
18. Click **Pošalji poruku prodavaču**. Type a message, send. Should redirect to `/poruke/<id>`.
19. Switch to seller's tab → bell + flyout should show 1 unread within ~1s (Realtime).
20. Reply. Switch back to buyer → Realtime should append the new message.
21. Verify the recipient gets a "Nova poruka" email via Resend.

### 10.6 — Saved search digest
22. As buyer, visit `/pretraga?make=BMW` → click **Spremi pretragu** → toggle the bell icon ON.
23. SQL: `SELECT * FROM saved_searches WHERE user_id='<buyer-id>';` — row exists, `email_alert=true`.
24. Manually trigger the digest cron: `curl https://<REF>.supabase.co/functions/v1/saved-searches-digest -H "Authorization: Bearer <SERVICE_ROLE_KEY>"`. Response: `{sent, skipped, errors, total}`.

### 10.7 — VIN report
25. As buyer on a listing with a VIN attribute, click **VIN izvještaj · 9,99€**.
26. Pay with `4242 4242 4242 4242`. After redirect, SQL: `SELECT * FROM vin_reports WHERE user_id='<buyer-id>';` — row with `status='paid'`, `paid_eur=9.99`.

### 10.8 — Auction
27. As seller, create a new listing in `/predaj-oglas`. **In Step 3 toggle Aukcija ON.** Set duration 1, starting bid 1000, reserve 5000. Submit.
28. SQL: `SELECT * FROM auctions WHERE listing_id='<new-listing-id>';` — row with `status='live'`, `end_at` ~24h from now.
29. Visit `/aukcija` — listing appears in the live grid with countdown.
30. Click into `/aukcija/<id>`. As **buyer** (different account), place a bid of 1100 EUR. Should succeed; current bid updates via Realtime; bid history shows the entry.
31. Place another bid as a third account — first bidder gets an "Niste više najbolji ponuđač" email.
32. Manually advance: `UPDATE auctions SET end_at = NOW() WHERE id='<id>';` then `curl https://<REF>.supabase.co/functions/v1/auction-settle -H "Authorization: Bearer <SERVICE_ROLE_KEY>"`. SQL: `SELECT status, winner_id, settled_at FROM auctions WHERE id='<id>';` — `sold` (because reserve 5000 not met → actually `reserve_not_met`; either is correct depending on the bids).
33. Seller + winner get appropriate emails.

### 10.9 — Inspection
34. As buyer, click **Rezerviraj inspekciju · 100€** on a listing → fill form → submit. SQL: `SELECT * FROM inspection_bookings;` — row with `status='pending'`.
35. Manually mark as paid (Stripe wire-up deferred): `UPDATE inspection_bookings SET status='paid' WHERE id='<id>';`.
36. As `inspector` role user (set via SQL: `UPDATE profiles SET role='inspector' WHERE email='<inspector-email>';`), visit `/inspector`. Click **Preuzmi**. Fill report URL + summary + score. Submit.
37. SQL: `SELECT status, report_url, completed_at FROM inspection_bookings WHERE id='<id>';` — `completed` with values set.

### 10.10 — Admin console
38. Visit `/admin?section=overview` → 10 KPI cards populated.
39. `/admin?section=listings` → search, force-feature, mark-sold, delete. Each writes an `audit_log` row.
40. `/admin?section=moderation` → trigger from a buyer using **Prijavi oglas** on a listing. Resolve here.
41. `/admin?section=payments` → 10 financial KPIs + Stripe events feed populated from your test payments.
42. `/admin?section=cron` → 3 jobs visible (`expire-featured`, `saved-searches-digest`, `auction-settle`) with last-run timestamps.
43. `/admin?section=killswitch` → toggle `payments` ON, verify the dropdown change is in `audit_log`. Toggle OFF.

### 10.11 — GDPR export + delete
44. From `/postavke`, click **Preuzmi moje podatke**. JSON download with profile + listings + messages + leads + reviews + saved_searches + notifications + inspections + vin_reports + conversations.
45. Click **Obriši moje podatke**, confirm with `obrisi`. User + cascading rows gone.

### 10.12 — Sitemap + OG
46. `https://testiranje.cloud/sitemap.xml` returns valid XML with home + categories + listings.
47. `curl -I https://testiranje.cloud/api/og?listing=<some-listing-id>` returns `Content-Type: image/png` + 200.
48. View source on `/listing/<id>`: SEOHead injects `<meta property="og:image">` (if you wired the OG image URL into SEOHead, which is phase 12.x polish — skip if not).

---

## Section 11 — Going to production

Once everything in Section 10 passes:

1. Stripe Dashboard → switch to **Live mode**. Recreate all 7 prices in live (Stripe doesn't share prices between modes). Update `STRIPE_PRICE_*` env to live IDs.
2. Add a new live webhook endpoint, copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
3. `STRIPE_SECRET_KEY` → `sk_live_...`
4. Re-run `supabase secrets set --env-file ./supabase/.env.local`.
5. Re-deploy all 16 Edge Functions.
6. DNS: point `vozila.hr` to your hosting. Update `PUBLIC_SITE_URL` to `https://vozila.hr` and re-deploy.
7. Resend: confirm domain verification stays green after the cutover.
8. Test once with a real card + immediate refund.
9. Submit `https://vozila.hr/sitemap.xml` to Google Search Console.

---

## Section 12 — Rollback playbook

If a deploy breaks production:

```bash
# Revert client to last known good
git revert <bad-commit-sha>
git push origin main           # auto-deploys

# Disable Stripe webhook (don't delete — toggle):
# Stripe Dashboard → Webhooks → endpoint → Disable

# Disable a specific Edge Function while you investigate:
supabase functions delete <function-name>
# Re-deploy from main when fixed.

# Pause new listings instantly via the kill switch:
# /admin?section=killswitch → toggle 'new_listings' ON.

# Pause payments instantly:
# /admin?section=killswitch → toggle 'payments' ON.
# (You'll need to wire these toggles into the relevant guards in 14.x — for now they're recorded in the audit log only.)
```

Migrations are forward-compatible (only add columns/tables). No DB rollback needed for any phase 9-14.1 migration.

---

## Section 13 — Post-launch monitoring

Daily 5-minute check:

```sql
-- Bigger picture
SELECT * FROM admin_overview;
SELECT * FROM payments_summary;

-- Cron health
SELECT job_name, last_status, last_finished_at, last_duration_ms, last_error
FROM (
  SELECT DISTINCT ON (job_name) *
  FROM cron_runs
  ORDER BY job_name, started_at DESC
) AS recent
ORDER BY job_name;

-- Open moderation queue
SELECT count(*) FROM reports WHERE status='open';

-- Stuck pending Stripe events (should be 0; if not, investigate webhook)
SELECT type, count(*) FROM stripe_events
WHERE processed_at > NOW() - INTERVAL '1 day'
GROUP BY type;

-- Top searches
SELECT url, count(*) FROM search_log
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY url ORDER BY count DESC LIMIT 20;

-- Lead funnel
SELECT partner_type, status, count(*) FROM leads
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY partner_type, status;

-- Auction health
SELECT status, count(*) FROM auctions GROUP BY status;
```

Alarms (set up after the first 100 users):
- Sentry: error rate > 1% over 1 hour
- Resend: bounce rate > 5%
- Stripe: webhook 4xx/5xx > 0
- Cron: any `last_status='failed'`
- DB: any policy denial in Postgres logs

---

## Section 14 — What's NOT covered yet

These phases are deliberately deferred and require additional work before live launch:

- **Wizard `?edit=<id>` mode** — Edit button on Dashboard sends user to a fresh wizard. (carried since phase 9.4)
- **Map view** with Mapbox — phase 12.x.
- **Dynamic OG image** wired into SEOHead — Edge Function exists; SEOHead doesn't pass the URL yet. 1-line fix.
- **Browser push** with web-push + VAPID — phase 12.x.
- **Inspection Stripe Checkout** — currently captured-intent; admin manually fulfils first 10 to validate demand.
- **Auction Stripe escrow** — phase 14.x. Currently the platform acts as price-discovery; settlement is off-platform.
- **Auction admin approval gate** (BaT-style curation) — phase 15. Currently any seller can create a live auction.
- **`notify-auction-event` dedupe** — cron retry can re-fire emails. 14.2 fixes via notifications-row sentinel.
- **`notify-auction-event` participant rate-limit** — 14.2.
- **Bell flyout cases for `auction_outbid`/`auction_won`** — 14.2 (5-line fix).
- **Inspection report Storage upload** — currently URL-paste only. Add when first 10 inspections are real.
- **VIN report PDF generator** — `vin_reports` rows sit at `status='paid'`; admin manually fulfils until volume justifies a generator.
- **Slug-canonical search URLs** — phase 12.x.
- **City landing pages** — phase 12.x (`/grad/zagreb/automobili`).
- **Did-you-mean / typo-tolerant search** — phase 12.x.

None block launch. The platform's core revenue lines (Boost, Subs, VIN, leads) all work end-to-end as of phase 14.1.

---

## Appendix A — Useful one-liners

```bash
# Tail Edge Function logs in real time
supabase functions logs <function-name> --tail

# Send a synthetic Stripe event for testing
stripe trigger checkout.session.completed

# Check what's in the OG cache
psql $DB_URL -c "SELECT count(*), max(rendered_at) FROM og_image_cache;"

# Count active listings by category
psql $DB_URL -c "SELECT category_slug, count(*) FROM listings WHERE status='active' GROUP BY 1 ORDER BY 2 DESC;"

# Dump all audit log entries from today
psql $DB_URL -c "SELECT created_at, actor_role, action, entity_type, entity_id FROM audit_log WHERE created_at::date = CURRENT_DATE ORDER BY created_at DESC;"
```

## Appendix B — Smoke-test script

`scripts/smoke-test.mjs` walks 12 critical user paths via Playwright headless. Run before any production deploy:

```bash
node scripts/smoke-test.mjs https://testiranje.cloud
```

See `scripts/smoke-test.mjs` for details.
