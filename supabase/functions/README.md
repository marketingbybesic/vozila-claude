# Supabase Edge Functions — Vozila

Phase 9.2 ships three functions for real Stripe Boost payments.

## Functions

### Phase 9 — payments
| Function | Auth | Purpose |
|---|---|---|
| `create-boost-checkout` | User JWT | Validates ownership, creates Stripe Checkout (one-shot) |
| `create-subscription-checkout` | User JWT | Stripe Checkout in subscription mode (Bronze/Silver/Gold) |
| `customer-portal` | User JWT | Returns one-time Stripe Billing Portal URL |
| `stripe-webhook` | Stripe-Signature | Boost flag + subscription tier writes + dunning |
| `expire-featured` | None (cron) | Daily 02:00 Europe/Zagreb — clears expired feature flags |

### Phase 10 — messaging + email
| Function | Auth | Purpose |
|---|---|---|
| `send-email` | Service-role | Generic Resend wrapper (called by other Edge Functions) |
| `notify-new-message` | User JWT or service-role | Insert notifications row + email recipient on new message |
| `saved-searches-digest` | None (cron) | Daily 08:00 Europe/Zagreb — replays each saved search, emails fresh matches |
| `unsubscribe` | None (HMAC token) | One-click unsubscribe for List-Unsubscribe + footer link |

## Required env (set via Supabase dashboard or `supabase secrets set`)

```bash
# Supabase
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# Stripe (phase 9)
STRIPE_SECRET_KEY=sk_test_...      # use sk_live_... after verifying
STRIPE_WEBHOOK_SECRET=whsec_...    # generated when you create the webhook endpoint
STRIPE_PRICE_BOOST_TOP=price_...
STRIPE_PRICE_BOOST_FEATURED=price_...
STRIPE_PRICE_BOOST_PREMIUM=price_...
STRIPE_PRICE_SUB_BRONZE=price_...
STRIPE_PRICE_SUB_SILVER=price_...
STRIPE_PRICE_SUB_GOLD=price_...

# Email — Resend (phase 10)
RESEND_API_KEY=re_...
RESEND_FROM='Vozila <noreply@vozila.hr>'   # SPF/DKIM/DMARC must be set on the domain
PUBLIC_SITE_URL=https://testiranje.cloud   # used in email links + unsubscribe URL
EMAIL_HMAC_SECRET=<openssl rand -hex 32>   # signs unsubscribe tokens — keep stable
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
   # Phase 9 (Stripe)
   supabase functions deploy create-boost-checkout
   supabase functions deploy create-subscription-checkout
   supabase functions deploy customer-portal
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy expire-featured --no-verify-jwt

   # Phase 10 (email + messaging)
   supabase functions deploy send-email --no-verify-jwt          # service-role gated
   supabase functions deploy notify-new-message                  # user JWT or service
   supabase functions deploy saved-searches-digest --no-verify-jwt   # cron
   supabase functions deploy unsubscribe --no-verify-jwt          # public, HMAC verified
   ```

   Schedule the digest cron in Supabase Dashboard → Database → Cron:
   - Function: `saved-searches-digest`
   - Cron: `0 8 * * *`
   - Timezone: `Europe/Zagreb`
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
