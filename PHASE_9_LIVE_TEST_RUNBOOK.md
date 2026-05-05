# Phase 9 — Live Test Runbook (Boost + Subscriptions, end-to-end)

This runbook walks the full phase 9 surface end-to-end against **Stripe test mode** + the **live Supabase project**. Run each section in order. Every step has an explicit success criterion — if it fails, stop and fix, don't continue.

Rough time: 45–60 min the first time, 5 min on every re-test.

---

## 0. Prerequisites

- [ ] You have access to: Supabase project dashboard, Stripe dashboard, the GitHub repo, and `client/.env`.
- [ ] Supabase CLI installed: `brew install supabase/tap/supabase`. Verify: `supabase --version`.
- [ ] Stripe CLI installed (for local webhook forwarding while testing): `brew install stripe/stripe-cli/stripe`. Verify: `stripe --version`.
- [ ] You're logged into both: `supabase login`, `stripe login`.

---

## 1. Run the schema migration

Use the Supabase SQL editor — not raw psql — so RLS policies and trigger creation use the right role.

1. Open Supabase Dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of `server/db/migrations/002_fix_listings_drift.sql`.
3. Click **Run**.

**Success criteria:**
- [ ] Query reports "Success. No rows returned" or similar.
- [ ] Run `SELECT column_name FROM information_schema.columns WHERE table_name='listings' AND column_name IN ('user_id','is_featured','featured_tier','featured_until');` — should return 4 rows.
- [ ] Run `SELECT count(*) FROM profiles;` — should equal `(SELECT count(*) FROM auth.users);` (every existing user got a profile).
- [ ] Run `SELECT count(*) FROM stripe_events;` — returns 0 (table exists, empty).

**If existing seed listings have NULL `user_id`:** create a single demo dealer user in Supabase Auth, then `UPDATE listings SET user_id = '<demo-uuid>' WHERE user_id IS NULL;`.

---

## 2. Stripe Dashboard — create products + prices

In **Test mode** (toggle top-right):

### 2.1 Boost (one-time)
- Product **Vozila Boost — Top 48h** → price 4.99 EUR, **One time**. Copy Price ID → `STRIPE_PRICE_BOOST_TOP`.
- Product **Vozila Boost — Featured 7 dana** → price 14.99 EUR, **One time**. → `STRIPE_PRICE_BOOST_FEATURED`.
- Product **Vozila Boost — Premium 30 dana** → price 49.00 EUR, **One time**. → `STRIPE_PRICE_BOOST_PREMIUM`.

### 2.2 Subscriptions (recurring monthly)
- **Vozila Bronze** → 39 EUR / month → `STRIPE_PRICE_SUB_BRONZE`.
- **Vozila Silver** → 99 EUR / month → `STRIPE_PRICE_SUB_SILVER`.
- **Vozila Gold** → 299 EUR / month → `STRIPE_PRICE_SUB_GOLD`.

### 2.3 Customer Portal config
- Stripe → **Settings → Billing → Customer portal** → enable: cancel subscription, update payment method, view invoices, switch plan (link Bronze/Silver/Gold prices).

**Success criteria:**
- [ ] Six Price IDs saved into your local notes (or directly into the next step).

---

## 3. Set Edge Function secrets

Create a local file `supabase/.env.local` (NOT committed — `.gitignore` already excludes `.env*`):

```bash
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
SUPABASE_ANON_KEY=eyJhbGciOi...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # filled in step 5 below
STRIPE_PRICE_BOOST_TOP=price_...
STRIPE_PRICE_BOOST_FEATURED=price_...
STRIPE_PRICE_BOOST_PREMIUM=price_...
STRIPE_PRICE_SUB_BRONZE=price_...
STRIPE_PRICE_SUB_SILVER=price_...
STRIPE_PRICE_SUB_GOLD=price_...
```

Push to Supabase:
```bash
cd "/Users/zmaj/Documents/Vozila Claude"
supabase link --project-ref <your-ref>      # one-time
supabase secrets set --env-file ./supabase/.env.local
```

**Success criteria:**
- [ ] `supabase secrets list` shows all 11 keys present (values are masked).

---

## 4. Deploy the Edge Functions

```bash
cd "/Users/zmaj/Documents/Vozila Claude"
supabase functions deploy create-boost-checkout
supabase functions deploy create-subscription-checkout
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy expire-featured --no-verify-jwt
```

`--no-verify-jwt` on `stripe-webhook` and `expire-featured` because Stripe (and cron) don't send a Supabase JWT.

**Success criteria:**
- [ ] All five deploys exit 0.
- [ ] `curl https://<ref>.supabase.co/functions/v1/expire-featured` returns `{"expired":0}` (cron fn callable).

---

## 5. Wire the webhook in Stripe

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<your-ref>.supabase.co/functions/v1/stripe-webhook`.
3. Events to listen for (exactly these 5):
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Click **Add endpoint**, then click into it and copy the **Signing secret** (`whsec_...`).
5. Update `STRIPE_WEBHOOK_SECRET` in `supabase/.env.local` and re-run `supabase secrets set --env-file ./supabase/.env.local`.

**Success criteria:**
- [ ] Endpoint listed in Stripe Dashboard, status active.

---

## 6. Schedule the daily cron

Supabase Dashboard → **Database → Extensions** → enable `pg_cron` if not already.

Then run this SQL once:

```sql
select cron.schedule(
  'expire-featured-daily',
  '0 2 * * *',
  $$
  select net.http_get(
    url := 'https://<your-ref>.supabase.co/functions/v1/expire-featured',
    headers := '{"Authorization":"Bearer <SUPABASE_SERVICE_ROLE_KEY>"}'::jsonb
  );
  $$
);
```

(Or use Supabase Dashboard → Database → Cron, GUI form.)

**Success criteria:**
- [ ] `select * from cron.job;` shows the entry.

---

## 7. Set client env + redeploy

In `client/.env`:

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_FUNCTIONS_URL=https://<your-ref>.supabase.co/functions/v1
```

Then push to main — `.github/workflows/deploy.yml` auto-deploys to testiranje.cloud.

**Success criteria:**
- [ ] Visit `https://testiranje.cloud/za-partnere` — Pricing page loads.

---

## 8. End-to-end live test

Open Chrome with DevTools → Network tab visible.

### 8.1 Subscription flow

1. Sign in as a test user at `/profil`.
2. Visit `/za-partnere` → click **Pokreni Bronze**.
   - **Expect:** redirect to `checkout.stripe.com`. URL contains `cs_test_`.
3. Use card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any postcode.
4. After payment, Stripe redirects to `/postavke?sub=success`.
   - **Expect:** "Plaćanje je uspjelo" green banner.
5. Within ~5 seconds (page polls), the **Pretplata** card should show:
   - Tier: **Bronze**
   - Renewal date in 1 month
   - **Upravljaj pretplatom** button
6. Click **Upravljaj pretplatom**.
   - **Expect:** redirect to Stripe Billing Portal. Must show subscription with Cancel option.
7. Cancel the subscription in the portal → return to Vozila.
8. Wait ~10s, refresh `/postavke`.
   - **Expect:** card now shows "active" until period end (Stripe behavior — not immediate cancel).
9. In Stripe Dashboard → click the subscription → **Cancel subscription immediately** (test only).
   - **Expect:** webhook fires `customer.subscription.deleted`. Refresh `/postavke` — card now shows empty/upgrade state.

**Success criteria:**
- [ ] Each profile field updated correctly per step.
- [ ] Stripe Dashboard → Webhooks → endpoint shows 5 successful deliveries (200 status), zero 4xx/5xx.
- [ ] `select * from stripe_events order by processed_at desc limit 5;` in Supabase — 5 rows for the test session.

### 8.2 Boost flow (use a different listing you own)

1. As the same logged-in user, ensure you have at least one listing — if not, create one via `/predaj-oglas`.
2. Go to your listing detail (or wherever BoostModal is mounted) → click **Boost oglas**.
3. Pick **Featured 7 dana** → click → redirect to Stripe Checkout.
4. Use `4242 4242 4242 4242`. Submit.
5. After redirect to `/listing/<id>?boost=success`:
   - **Expect:** Listing now has `is_featured=true`. In feed, the listing shows **TOP / FEATURED** badge.
6. Run in SQL editor: `SELECT id, is_featured, featured_tier, featured_until FROM listings WHERE id='<your-listing-id>';`
   - **Expect:** is_featured=true, featured_tier='featured-7d', featured_until ~7 days from now.

### 8.3 Past-due path (optional)

Stripe Dashboard → simulate failed renewal:
- Test mode → find subscription → **More → Update subscription → Trial end immediately** then advance clock → Stripe will attempt to charge → if you pre-set the customer's payment method to `4000 0000 0000 0341` (always declines), `invoice.payment_failed` fires.
- **Expect:** `/postavke` shows orange "Ažuriraj plaćanje" CTA.

### 8.4 Cron expiry

Run manually instead of waiting overnight:
```bash
curl https://<ref>.supabase.co/functions/v1/expire-featured
```
With a listing whose `featured_until` is in the past:
- **Expect:** response `{"expired":1}`. Listing's `is_featured` flips to false.

### 8.5 Listing-limit guard

1. As a free user (no subscription), create 3 listings.
2. Try to create a 4th.
   - **Expect:** wizard shows the amber/red banner; submit alerts "Dosegli ste 3 aktivnih oglasa..." and refuses to insert.
3. Subscribe to Bronze (limit goes to 15) → wizard banner disappears, you can submit.

### 8.6 Verified-dealer badge in feed

1. With your subscribed user, visit the feed `/pretraga`.
2. Find your listings.
   - **Expect:** the tier-colored badge (Bronze=amber ShieldCheck) appears top-left of the card.
3. Visit ListingDetail of one of your listings.
   - **Expect:** seller block shows tier-colored badge next to "Privatni prodavač"/company name.
4. Visit `/saloni/<your-email-local-part>`.
   - **Expect:** profile header shows the badge.

---

## 9. Rollback plan if anything goes wrong

If the live test breaks production users:

```bash
# Revert client to last known good
cd "/Users/zmaj/Documents/Vozila Claude"
git revert <bad-commit-sha>
git push origin main           # auto-deploys

# Disable the webhook in Stripe Dashboard (don't delete — disable + re-enable later)
# Edge Functions: delete to neutralize:
supabase functions delete create-boost-checkout
supabase functions delete create-subscription-checkout
supabase functions delete customer-portal
supabase functions delete stripe-webhook
supabase functions delete expire-featured
```

The migration is forward-compatible (only adds columns) — no DB rollback needed.

---

## 10. Going to live mode

Once everything passes in test mode:

1. Stripe Dashboard → switch to **Live mode**.
2. Recreate all 6 prices in live mode (Stripe doesn't share prices between modes).
3. Re-run `supabase secrets set` with the live `STRIPE_SECRET_KEY` (`sk_live_`) and live Price IDs.
4. Add a new live webhook endpoint, copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
5. Re-deploy the 5 functions: `supabase functions deploy ...`.
6. Stripe Tax → enable for EU + Croatia VAT 25%.
7. Test once with a real card and a tiny refund.

**Done.** From here phase 10 (messaging, email, anti-scam) starts.
