# Supabase Edge Functions — Vozila

Phase 9.2 ships three functions for real Stripe Boost payments.

## Functions

| Function | Auth | Purpose |
|---|---|---|
| `create-boost-checkout` | User JWT | Validates ownership, creates Stripe Checkout (one-shot) |
| `stripe-webhook` | Stripe-Signature | Flips `listings.is_featured` on `checkout.session.completed` |
| `expire-featured` | None (cron) | Daily 02:00 Europe/Zagreb — clears expired feature flags |

## Required env (set via Supabase dashboard or `supabase secrets set`)

```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...      # use sk_live_... after verifying
STRIPE_WEBHOOK_SECRET=whsec_...    # generated when you create the webhook endpoint
STRIPE_PRICE_BOOST_TOP=price_...
STRIPE_PRICE_BOOST_FEATURED=price_...
STRIPE_PRICE_BOOST_PREMIUM=price_...
```

## One-time setup

1. Install Supabase CLI: `brew install supabase/tap/supabase`.
2. Link project: `supabase link --project-ref <ref>`.
3. Run migration:
   ```bash
   supabase db push
   # or, if running raw:
   psql $DATABASE_URL -f server/db/migrations/002_fix_listings_drift.sql
   ```
4. In Stripe Dashboard:
   - Products → create 3 boost products with prices 4.99 / 14.99 / 49.00 EUR (one-time).
   - Copy the 3 Price IDs into env above.
5. Set secrets:
   ```bash
   supabase secrets set --env-file ./supabase/.env.local
   ```
6. Deploy functions:
   ```bash
   supabase functions deploy create-boost-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy expire-featured --no-verify-jwt
   ```
7. In Stripe Dashboard → Webhooks → add endpoint `https://<ref>.supabase.co/functions/v1/stripe-webhook`, listen for `checkout.session.completed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
8. Schedule the cron in Supabase Dashboard → Database → Functions → Schedules:
   - Function: `expire-featured`
   - Cron: `0 2 * * *`
   - Timezone: `Europe/Zagreb`

## Test

```bash
# Forward webhooks locally:
stripe listen --forward-to https://<ref>.supabase.co/functions/v1/stripe-webhook

# Trigger a test payment:
stripe trigger checkout.session.completed
```

## Client env (Vite — exposed to browser)

Add to `client/.env` (do NOT commit):

```
VITE_SUPABASE_FUNCTIONS_URL=https://<ref>.supabase.co/functions/v1
```

The BoostModal will call `${VITE_SUPABASE_FUNCTIONS_URL}/create-boost-checkout`.
