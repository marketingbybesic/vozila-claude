# Vozila.hr — Security Audit (2026-05-06)

**Method:** Static analysis of the shipped codebase (18 phases + 3 polish rounds + Tier 0). External fetches were mostly blocked, so this is grounded in **what's actually in `main` branch** as of commit `b84b0ac`.

**Severity scale:**
- **CRITICAL** — exploitable with user/anonymous access, can compromise data or sessions
- **HIGH** — exploitable with elevated access (admin compromise), or systemic data exposure
- **MEDIUM** — privacy or correctness issue, no direct compromise path
- **LOW** — defense-in-depth, hardening, best-practice gaps

---

## CRITICAL

### S1. Stored XSS via `dangerouslySetInnerHTML` on admin-controlled HTML ads
**File:** `client/src/components/ads/NativeAdSlotEnhanced.tsx:138`
```tsx
<div dangerouslySetInnerHTML={{ __html: ad.html_content }} />
```
- `ads.html_content` is admin-editable, no sanitization, no CSP.
- Single admin compromise → stored XSS on every page that renders an ad slot. Sessions, auth tokens (in localStorage via Supabase client), and message content all reachable from injected JS.
- **Fix this turn:** Sanitize via DOMPurify before render OR drop `html` ad type entirely (the `image` and `video` types cover the real use case; html exists for affiliate iframes that almost never get used).

### S2. Tables with no RLS at all
**File:** `server/db/migrations/001_core_schema.sql`
The ORIGINAL schema migration creates these tables and **never enables RLS:**
- `users` (contains email, vat_id, business_phone, whatsapp_number, dealer_verified)
- `categories` (low risk but still anon-writable without policies)
- `listing_analytics` (whatsapp_clicks, phone_reveals — leaks dealer business intel)
- `listing_images` (writable by anon → photo defacement vector)
- `favorites` (anon can read who favorited what → buyer behavior leak)

Phase migrations 002+ enable RLS on **new** tables (`profiles`, `messages`, `auctions`, etc.) but **never retrofit RLS on these 5 legacy tables.**

- **Production impact:** With Supabase's anon key (which is in every browser), a hostile user can `SELECT * FROM users` and dump every dealer's email + phone + VAT ID. This is the worst single finding in the codebase.
- **Fix this turn:** Migration `011_legacy_rls.sql` enabling RLS on all 5 tables with sensible policies.

### S3. Admin-anyone insert on `ads` table
**File:** `client/src/components/admin/AdManager.tsx`
- The component is gated client-side ("only render for `role='admin'`") but Supabase queries `from('ads')` carry no server-side enforcement.
- Anon user with the public anon key can `INSERT INTO ads (html_content) VALUES ('<script>steal-tokens</script>')` because no RLS policy refuses them.
- Combined with **S1**, this is a one-shot anon-to-stored-XSS attack chain.
- **Fix this turn:** Migration `011` adds admin-only RLS policy on `ads`.

---

## HIGH

### S4. CORS wildcard on every Edge Function
**File:** `supabase/functions/_shared/cors.ts:5`
```ts
"Access-Control-Allow-Origin": "*"
```
- Any origin can hit any Edge Function with the user's JWT (assuming CSRF on the auth side fails). The CORS wildcard is convenient for dev but an unnecessary surface in production.
- **Mitigation:** Already in place — JWT auth + service-role checks gate the actual function bodies. CORS is the outer layer, not the only one.
- **Fix this turn:** Switch to an allowlist `[vozila.hr, testiranje.cloud, localhost:5174]`.

### S5. `category_slug` insert path bypasses category whitelist
- `CreateListingWizard` inserts `category_slug` as a plain string from form state. No DB check that the slug exists in `categories`.
- A crafted POST can plant arbitrary slugs that never resolve to category pages but still appear in search-log + admin queue.
- **Fix:** Either FK to `categories.slug` (requires unique constraint on slug — already there) or runtime check at insert.

### S6. `analytics.ts` writes user-supplied `metaPixelId` into a `<script>` template
**File:** `client/src/lib/analytics.ts:103-119`
```ts
script.innerHTML = `... ${this.config.metaPixelId} ...`;
```
- `metaPixelId` comes from `import.meta.env.VITE_META_PIXEL_ID`, which is build-time + repo-controlled — but the pattern is dangerous if the source ever becomes user-input.
- **Fix:** Use a regex whitelist (`/^\d{10,16}$/`) before interpolation. Cheap.

### S7. Public Supabase Storage bucket `vin-reports` is private (correct), but signed-URL refresh assumes user owns the row
**File:** `supabase/functions/vin-report-refresh-url/index.ts`
- The function correctly checks `report.user_id === user.id`. ✅
- But the URL itself, once handed to the buyer, can be shared with anyone for 30 days. By design, but worth documenting as "VIN reports are not confidential after delivery."
- **Action:** Document in `LIVE_RUNBOOK_V2.md` Section 14.

---

## MEDIUM

### S8. Phone number reveal flag stored client-side only
**File:** `ListingDetail.tsx`
- `phoneRevealed` state is `useState`, never persisted. Buyer reveals once, navigates away, comes back, has to reveal again → tracked as another `lead_tracking.phone` event.
- **Impact:** Inflated phone-reveal metrics; small spam-amplification window.
- **Fix:** Persist in `localStorage` keyed on listing_id, or honour `conversations.buyer_revealed_phone` when the buyer has already messaged.

### S9. Dealer email exposure (was Tier 0 A7) — verify the patch doesn't leak elsewhere
- ✅ `DealerProfile.tsx` is fixed (Tier 0 commit `cea679b`).
- ❌ `DealerIndex.tsx:69` still uses `d.email.split('@')[0]` for slug derivation.
- ❌ `Dashboard.tsx` queries `users` table for own-listing analytics — RLS allows self-select but if S2 is fixed with `SELECT WHERE auth.uid() = id`, dashboard still works.
- **Fix:** The DealerIndex uses email only for the slug (URL), never displayed. Currently OK but should not select email — derive slug server-side via a view.

### S10. No rate limit on lead capture
**File:** `client/src/lib/leads.ts`
- `submitLead` does anonymous-allowed insert with no throttle. Anyone can spam `leads` table with junk financing applications.
- RLS allows `INSERT` `WITH CHECK (true)`.
- **Fix:** Add a Postgres trigger `BEFORE INSERT ON leads` that rejects > 5 inserts per IP per hour (using `ip_hash` already in schema). Or a simpler `notifications` sentinel pattern from `ai-listing-copy`.

### S11. Service worker caches `https://images.unsplash.com`
**File:** `client/public/sw.js:53`
- Hard-coded third-party hostname in cache rules. Harmless but means if you switch image hosts, SW continues to cache the old one until version bump.
- **Fix:** parameterize via Vite-injected define.

### S12. No CSP (Content Security Policy) header
- The deployed static site sets no CSP. Combined with S1 + S6, a stored XSS gets full page+token access.
- **Fix:** Add CSP via meta tag or hosting headers. Strict version: `script-src 'self' https://www.googletagmanager.com https://connect.facebook.net 'sha256-<inline-bootstrap-hash>'`.

---

## LOW

### S13. `localStorage` is read without a try/catch in 14 files
- Private mode + Safari ITP sometimes throw on `localStorage.getItem`. Existing code has try/catch in `savedSearches.ts` and `boost.ts` but inconsistent elsewhere.
- **Fix:** wrap reads/writes in a small `safeLocalStorage` lib.

### S14. Sentry init fetches from `esm.sh` (third-party CDN)
**File:** `client/src/lib/sentry.ts`
- A compromise of esm.sh = arbitrary JS execution post-init.
- **Fix:** Bundle Sentry directly via `npm install @sentry/browser` if/when DSN is set. Trade-off: bundle size +90 kB.

### S15. PWA service worker `RUNTIME_VERSION` is hand-bumped
- Already noted in audit doc A10. If forgotten on a release, returning users see stale shells.
- **Fix:** Replace with `__VITE_BUILD_HASH__` injected at build time.

### S16. Stripe webhook idempotency keys live in `stripe_events.id` with no expiry
- Table grows unbounded. A multi-year-old replay still de-dupes correctly, but the table will eventually be huge.
- **Fix:** monthly partition + 1-year cold rollup.

### S17. `audit_log` writes don't capture client IP
- Already noted in phase 13 checkpoint. Service-role Edge Functions have access to `x-forwarded-for`; client-side audits don't.
- **Fix:** Move audit writes to a service-role Edge Function that hashes IP server-side.

---

## Priority queue for this session

**SHIP THIS TURN:**
1. **S2** — Migration `011_legacy_rls.sql` (CRITICAL data exposure)
2. **S1 + S3** — Drop `html` ad type + admin-only RLS on `ads` table (CRITICAL XSS + insert)
3. **S4** — CORS allowlist (HIGH, low effort)
4. **S5** — Category-slug FK validation (HIGH)

**DEFER (not exploitable today, plan for next turn):**
- S6, S8, S10, S12, S13, S14 — defense-in-depth, no concrete attack path against current threat model

**DOCUMENT:**
- S7, S9 (verified Tier 0 fix), S11, S15, S16, S17

---

## What's NOT covered

- Penetration testing (no sandbox to run scans against testiranje.cloud)
- Supabase Auth flow review (relies on Supabase's own SOC2)
- Stripe webhook signature verification — already correctly using `constructEventAsync` with HMAC
- DDOS protection — Supabase + Hostinger have their own rate limits
- Database backups — Supabase Pro tier handles this; doc in runbook
- Secrets in CI logs — `.github/workflows/deploy.yml` doesn't echo any secrets, verified clean
