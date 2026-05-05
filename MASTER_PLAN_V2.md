# Vozila.hr — Master Plan v2 (Production-Ready Build Plan)

**Updated:** 2026-05-05
**Author:** session continuity doc — any AI agent picking up this project should READ THIS FIRST.
**Live deploy:** main branch → testiranje.cloud (Hostinger FTP, `.github/workflows/deploy.yml`)
**Goal:** Ship a fully functional, feature-rich Croatian vehicle marketplace that beats njuškalo.hr and avto.net on craft, smart features, and trust.

---

## 0. How to use this plan

1. **Always read this file at the start of every session** — it's the source of truth.
2. Each phase is self-contained. Do them **in order**: 9 → 10 → 11 → 12 → 13 → 14.
3. Each phase ends with: build green ✅ + Playwright walk ✅ + screenshot ✅ + commit ✅ + push ✅ + checkpoint update at bottom of this file.
4. **Devil's-advocate** every phase before coding. Every phase ends with **PDCA notes** appended to this doc.
5. **Never bulldoze working code.** Read the file, edit minimally, verify the change, move on.
6. **Visual proof** — never claim "done" without showing it: build output + a screenshot of the actual feature in a browser.

---

## 1. What's already built (verified 2026-05-05)

Phases 0–8 shipped per `git log`. Build is green in 2.4s. Initial bundle 187 kB gzip. Routes split.

| Layer | What works | Notes |
|---|---|---|
| **App shell** | `App.tsx` with NuqsAdapter, HelmetProvider, lazy routes for 18 pages | Header / Footer / MobileBottomNav / ConsentBanner all live |
| **Listing feed** | 1197 LOC, JSONB filters, PostGIS RPC `search_listings_by_radius`, weighted sort, freshness pulse, saved searches bar, accordion sidebar | URL state synced via nuqs |
| **Listing detail** | 850 LOC, gallery + lightbox + spec sheet + KNN similar + history timeline + fuel cost + loan calc + share + price-watch + compare + photo-quality nag | |
| **Create listing** | 906 LOC wizard with VIN quick-fill (NHTSA vPIC, no key) | ⚠️ See bug #1 below |
| **Listing card** | premium hover-cycle, match-score, verified, views | |
| **Home** | Hero (theme-aware), CategoryGrid (10 distilled), NoviOglasiCarousel, RecentlyViewed, TrendingSearches, SuperSearch | |
| **Auth** | Supabase auth wired in Header + Wizard + Admin | |
| **Admin** | KPI cards, AdManager, listings/users tables (mostly placeholder rows) | Skeleton, needs real data |
| **Dealer pages** | `/saloni` index + `/saloni/:slug` profile | ⚠️ See bug #2 below |
| **Pricing/About/Compare/Kontakt/Privacy/Terms/404** | All present, code-split | |
| **Analytics** | GA4 + Meta Pixel + ConsentBanner | |
| **SEO** | SEOHead component, static `robots.txt`, slug-friendly URLs in feed | ⚠️ No dynamic sitemap, no per-listing OG image |
| **CI/CD** | GitHub → Hostinger FTP auto-deploy on push to main | |
| **Seed** | 50 realistic Croatian listings + photo correction scripts | |
| **Code-split** | Heavy routes lazy-loaded, ~40% initial JS reduction | |

### Stubs / fake (UI exists, no real backend)
- **Boost / Featured payments** — UI + 3 tiers, but `recordBoostIntent()` writes to **localStorage only**. No Stripe Checkout, no webhook, no DB write to `listings.is_featured`.
- **Saved-search emails** — diff logic + UI exist, no Resend dispatch, no cron.
- **Dealer subscriptions** — Pricing page lists tiers, **zero code wires Stripe Subscriptions** or `subscription_tier` updates.
- **Server-side image watermark** — `lib/watermark.ts` runs client-side only (Canvas), and only when user opts in.
- **AI copywriter** — `AiCopywriterButton.tsx` exists; needs verification it actually calls Claude Haiku.
- **PriceIntel histograms** — bar heights need verification (master plan flagged this).

### Real bugs found while reading code (will fix in Phase 9)

1. **`listings.user_id` is NOT NULL in schema (`server/db/migrations/001_core_schema.sql`) but the wizard insert omits it** (`CreateListingWizard.tsx`). Production will reject every new listing. The wizard inserts `category_slug` but the schema column is `category_id` (FK to `categories.id`). The schema and the live Supabase DB have drifted.
2. **`DealerProfile.tsx` queries `listings` without filtering by `user_id`** — every dealer profile shows ALL listings sitewide. Comment in code says "when listings.user_id is added, swap…" — schema already has it; the query just isn't using it.
3. **No `.env.example` updates** for the new Stripe/Resend/Mapbox/Sentry keys we'll add.
4. **`lib/supabase.ts` throws on missing env at import time** — kills the whole bundle if env is misconfigured. Should fail gracefully with a banner.

---

## 2. The full feature universe — what a "complete" Vozila looks like

Three audiences. Each one has its own surface:
- **Buyer** (private user shopping for a vehicle)
- **Seller / Dealer / Salon** (private + business listing)
- **Owner / Admin** (you, running the platform)

### 2.A — Buyer surface

| # | Feature | Status | Phase |
|---|---|---|---|
| B1 | Search with smart filters (already live) | ✅ | – |
| B2 | Saved searches with email alerts | ⚠️ local only | 10 |
| B3 | Browser push for new matches | ❌ | 12 |
| B4 | In-platform messaging with sellers | ❌ | 10 |
| B5 | Notifications bell (messages + matches) | ❌ | 10 |
| B6 | Phone obfuscation until first message | ❌ | 10 |
| B7 | Report-listing flow | ❌ | 10 |
| B8 | "This price seems too low" warning (anti-scam) | ❌ | 10 |
| B9 | Financing pre-approval lead capture | ❌ (calc only) | 11 |
| B10 | Insurance quote lead capture | ❌ | 11 |
| B11 | Transport quote lead capture (Croatia + EU) | ❌ | 11 |
| B12 | Vozila Inspection booking | ❌ | 11 |
| B13 | VIN history report (paid €9.99) | ❌ | 11 |
| B14 | Compare 2-4 vehicles side-by-side | ✅ | – |
| B15 | Map view of search results (Mapbox) | ❌ | 12 |
| B16 | Recently viewed (localStorage) | ✅ | – |
| B17 | Favorites with sync across devices | ⚠️ partial | 10 |
| B18 | Per-make / per-model / per-city landing pages (SEO) | ❌ | 12 |
| B19 | "Did you mean" / typo-tolerant search | ❌ | 12 |
| B20 | Public dealer reviews | ❌ | 11 |
| B21 | Mobile PWA (install prompt, offline shell) | ❌ | 12 |
| B22 | Share listing → branded OG card | ❌ | 12 |
| B23 | "Watch this make/model" alert (lighter than saved-search) | ❌ | 12 |
| B24 | Cookie consent + per-purpose GDPR toggle | ⚠️ basic | 12 |

### 2.B — Seller / Dealer / Salon surface

| # | Feature | Status | Phase |
|---|---|---|---|
| S1 | Create listing wizard | ✅ | – (fix bug #1) |
| S2 | VIN quick-fill | ✅ | – |
| S3 | Photo upload with watermark | ⚠️ client-side, optional | 11 |
| S4 | Photo grader nag | ✅ | – |
| S5 | AI copywriter button | ⚠️ verify | 11 |
| S6 | Listing dashboard with per-listing analytics chart | ⚠️ skeleton | 10 |
| S7 | Edit / pause / mark-sold / delete listing | ❌ | 10 |
| S8 | Auto-republish reminder (after 30 days) | ❌ | 11 |
| S9 | Boost / Featured payment (real Stripe) | ❌ stub | **9** |
| S10 | Receive in-platform messages | ❌ | 10 |
| S11 | Lead routing (financing/insurance/transport partners pay for leads) | ❌ | 11 |
| S12 | **Dealer subscription tiers (Bronze/Silver/Gold) — real Stripe Subs** | ❌ | **9** |
| S13 | Verified-dealer badge based on subscription + KYC | ❌ | 9 |
| S14 | Dealer profile page with logo, bio, hours, stats | ⚠️ basic | 10 |
| S15 | CSV bulk import for dealer inventory | ⚠️ component exists | 11 |
| S16 | Inventory sync from external XML/JSON feed (e.g. dealer DMS) | ⚠️ service stub | 11 |
| S17 | Streak / performance gamification | ❌ | 11 |
| S18 | Auto-feature next listing as streak reward | ❌ | 11 |
| S19 | QR code for mobile photo upload from desktop | ✅ | – |
| S20 | Customer Portal (manage subscription / cancel / invoices) | ❌ | 9 |
| S21 | Receipts / invoices via Resend after every payment | ❌ | 9 |
| S22 | Dealer review responses | ❌ | 11 |
| S23 | Promote listing to multiple categories | ❌ | 11 |

### 2.C — Owner / Admin surface (this is the biggest gap right now)

The current admin dashboard is mostly placeholder tables. To run the platform, you need an actual ops console.

| # | Feature | Status | Phase |
|---|---|---|---|
| O1 | KPI dashboard: DAU/MAU, listings live, GMV, MRR | ⚠️ placeholder | 13 |
| O2 | Listings table: filter, search, force-feature, force-unfeature, soft-delete, mark-sold | ⚠️ placeholder | 13 |
| O3 | Users table: roles, suspend, verify-dealer, impersonate-as-dealer (debug) | ⚠️ placeholder | 13 |
| O4 | Moderation queue: reported listings, suspicious patterns, auto-flagged price outliers | ❌ | 13 |
| O5 | Payments dashboard: Stripe events, refunds, MRR by tier, churn | ❌ | 13 |
| O6 | Saved-searches admin (top queries, search→0 results report → category gaps) | ❌ | 13 |
| O7 | Lead-gen dashboard: financing/insurance/transport leads, partner CRMs, payouts | ❌ | 13 |
| O8 | Native ads CMS (already partially built — `AdManager.tsx`) | ⚠️ partial | 13 |
| O9 | SEO console: missing meta titles, broken slugs, sitemap status, top organic queries | ❌ | 13 |
| O10 | Email console: campaign sends, deliverability, unsubscribe rate, top-clicked digests | ❌ | 13 |
| O11 | Audit log: every admin action logged | ❌ | 13 |
| O12 | Inspection bookings queue + assign-to-inspector workflow | ❌ | 14 |
| O13 | Auction module backoffice (Phase 4) | ❌ | 14+ |
| O14 | Cron worker UI: status of saved-search digests, listing expiries, scrapers | ❌ | 13 |
| O15 | Database health: Supabase quota, image storage usage, slow queries | ❌ | 13 |
| O16 | Kill-switch: pause new listings, pause payments, maintenance banner | ❌ | 13 |
| O17 | Global search box across listings/users/payments/messages | ❌ | 13 |
| O18 | RBAC: admin / moderator / support / read-only roles | ❌ | 13 |

---

## 3. Build plan — phases 9 through 14

Each phase has: **goal → tasks → DB changes → APIs → UI → devil's advocate → PDCA debrief**.

### Phase 9 — REAL MONEY FLOWING (week 1)

**Why first:** every other revenue line stacks on top of working Stripe. Without it, the platform earns €0.

**Backend choice (DECISION REQUIRED before phase 9 starts):**
- **A. Supabase Edge Functions** (Deno, deployed via `supabase functions deploy`). Recommended.
- **B. Express in `server/`** deployed to Hermes VPS at `api.vozila.hr`.

**Default if user doesn't choose:** Option A (Supabase Edge Functions). All endpoints listed below assume Option A.

#### 9.1 Schema fixes (BLOCKING)
- Add migration `002_fix_listings_drift.sql`:
  - Confirm `listings.user_id` is NOT NULL + has FK to `auth.users(id)` (not the legacy `users` table).
  - Add `listings.category_slug` column OR migrate wizard to use `category_id` lookup. **Pick one and document.**
  - Add `listings.is_featured` BOOLEAN, `listings.featured_until` TIMESTAMP, `listings.featured_tier` VARCHAR(32).
  - Add `profiles` table mirroring needed columns (Supabase pattern: `auth.users` + `public.profiles` 1:1):
    - `id` UUID FK auth.users.id, `subscription_tier` ENUM(`bronze`,`silver`,`gold`,NULL), `subscription_status` ENUM(`active`,`canceled`,`past_due`,`trial`,NULL), `subscription_renews_at`, `stripe_customer_id`, `is_verified`, `company_name`, `vat_id`, `phone`, `whatsapp_number`, `office_address`, `bio`, `logo_url`, `created_at`, `updated_at`.
  - RLS policies: profiles readable by all, writable by self + admin.
- Fix `CreateListingWizard.tsx` insert to include `user_id: session.user.id` and resolve `category_id` from slug.
- Fix `DealerProfile.tsx` to filter `listings.user_id = dealer.id`.
- Backfill seed data so existing 50 listings have a valid `user_id` (assign to a fake "demo dealer" user).

#### 9.2 Stripe — Boost (one-shot Checkout)
- Edge Function `POST /functions/v1/create-boost-checkout`:
  - Body: `{ listingId, tier }`. Validates seller owns listing.
  - Creates Stripe Checkout Session in mode=`payment`, line item per tier price ID.
  - `metadata: { listing_id, tier, user_id }`. Returns `{ url }`.
- Edge Function `POST /functions/v1/stripe-webhook`:
  - Handles `checkout.session.completed`. Reads metadata. Sets `listings.is_featured = true`, `featured_tier`, `featured_until = NOW() + interval (2|7|30 days)`.
  - Sends Resend receipt email.
- Update `lib/boost.ts`: replace `recordBoostIntent` with real Checkout call. Keep localStorage fallback only when env missing (dev mode).
- Add `client/.env.example` with `VITE_STRIPE_BOOST_TOP`, `VITE_STRIPE_BOOST_FEATURED`, `VITE_STRIPE_BOOST_PREMIUM`.
- ListingCard + ListingDetail: read `is_featured` + `featured_until` from DB and show "TOP" / "FEATURED" / "PREMIUM" badges accordingly.
- Cron Edge Function (daily): unset `is_featured` where `featured_until < NOW()`.

#### 9.3 Stripe — Dealer Subscriptions (Bronze/Silver/Gold)
- Stripe Product + Price IDs for 3 monthly tiers (39 / 99 / 299 EUR).
- Edge Function `POST /functions/v1/create-subscription-checkout`: creates `mode=subscription` Checkout. Metadata: `user_id`, `tier`.
- Webhook handlers:
  - `checkout.session.completed` → upsert `profiles.stripe_customer_id`, `subscription_tier`, `subscription_status='active'`, `subscription_renews_at`.
  - `customer.subscription.updated` → update tier + renews_at.
  - `customer.subscription.deleted` → set status=`canceled`.
  - `invoice.payment_failed` → status=`past_due`, send Resend dunning email.
- Edge Function `POST /functions/v1/customer-portal` → returns Billing Portal URL.
- Settings page → "Manage subscription" button → portal.
- Pricing page → "Upgrade to X" buttons → real Checkout.
- Verified-dealer badge: derived from `profiles.is_verified AND subscription_tier IS NOT NULL`. Show on ListingCard + DealerProfile + ListingDetail seller block.

#### 9.4 Visual proof checklist (phase 9 done = all of these)
- [ ] `npm run build` exits 0
- [ ] Test card `4242 4242 4242 4242` → Boost Checkout → webhook fires → listing shows TOP badge in feed
- [ ] Same for subscription Checkout → user gets Verified Dealer badge
- [ ] Customer Portal opens, cancel flow works, badge disappears after `subscription.deleted` webhook
- [ ] Cron unsets expired feature flag (test by setting featured_until to 1min ago)
- [ ] Resend email arrives for: boost purchased, subscription started, subscription canceled
- [ ] Screenshot of: featured listing in feed, dealer badge on listing card, Customer Portal page
- [ ] Push to main, testiranje.cloud auto-deploy succeeds, smoke-test the live URL

#### 9.5 Devil's advocate — phase 9
- *"What if Stripe webhook arrives before the Checkout session metadata is set?"* — Stripe guarantees metadata on `checkout.session.completed`. Verify by replaying webhook in Stripe CLI.
- *"What if a user buys a boost on a listing they don't own?"* — Edge Function must validate ownership before creating Checkout. Reject otherwise.
- *"What if webhook is replayed?"* — store `stripe_event_id` in a dedupe table; ignore duplicates.
- *"What if subscription downgrades?"* — `customer.subscription.updated` handler must compare old vs new tier and recompute badge.
- *"What if user is on past_due?"* — keep badge visible for 7-day grace period, then revoke.
- *"VAT?"* — enable Stripe Tax for EU customers, default Croatian VAT 25%, but invoice via Stripe Tax not custom logic.

---

### Phase 10 — Communication, retention, anti-scam (week 2)

**Why second:** marketplace without messaging = sellers and buyers move off-platform = zero retention loop, zero anti-scam protection, zero data on conversion funnel.

#### 10.1 In-platform messaging
- Migration `003_messaging.sql`:
  - `conversations(id, listing_id, buyer_id, seller_id, last_message_at, buyer_unread, seller_unread, status, created_at)`
  - `messages(id, conversation_id, sender_id, body TEXT, read_at, created_at)`
  - RLS: only participants can read/write.
- Realtime channel via Supabase Realtime on `messages` insert.
- New page `/poruke` — split-pane inbox.
- ListingDetail "Pošalji poruku" button → opens thread modal or navigates to `/poruke/<conversation_id>`.
- Header: bell icon with unread count (subscribes to realtime).

#### 10.2 Email pipeline (Resend)
- Edge Function `send-email` wrapper with template registry.
- Templates: `boost-receipt`, `subscription-receipt`, `subscription-renewed`, `subscription-past-due`, `subscription-canceled`, `new-message`, `saved-search-digest`, `listing-published`, `listing-expiring`, `report-acknowledged`.
- All templates have HMAC-signed unsubscribe link.
- Unsubscribe Edge Function `GET /functions/v1/unsubscribe?t=<token>` → flips `profiles.email_marketing_opt_in = false`.

#### 10.3 Saved-search digest (cron)
- Edge Function (Supabase scheduled, daily 8am Europe/Zagreb): for each `saved_search` with `email_alert=true`, run the search server-side, diff against `last_seen_ids`, if new → send digest, update snapshot.
- Migrate saved-searches from localStorage → DB table `saved_searches(id, user_id, label, params JSONB, last_seen_ids UUID[], email_alert, created_at, updated_at)`. Keep localStorage as anonymous fallback.

#### 10.4 Notifications bell
- `notifications(id, user_id, type, payload JSONB, read_at, created_at)`.
- Bell in Header subscribes via Realtime. Click opens panel grouped by type.

#### 10.5 Anti-scam
- Phone obfuscation on ListingDetail (`+385 9X XXX XXXX` until user sends ≥1 message OR clicks Reveal — logged for analytics).
- Report-listing button on ListingDetail: opens modal with reasons (scam / wrong category / duplicate / NSFW / other) → inserts into `reports` table → admin moderation queue.
- Price-outlier hint: if listing price < 50% of category-make-model-year median, show subtle "ova cijena znatno odstupa od tržišta — provjerite VIN" inline tooltip.

#### 10.6 Listing lifecycle (seller)
- Dashboard: list of own listings with "Edit / Pause / Mark Sold / Delete / Boost" actions.
- "Mark Sold" sets `status='sold'`, hides from feed but keeps URL alive for SEO with "PRODANO" overlay.
- "Pause" sets `status='paused'` (need to add enum value).

#### 10.7 Visual proof — phase 10
- [ ] Send a message between two test users → realtime arrival in inbox + bell badge
- [ ] Saved search digest fires → email arrives via Resend
- [ ] Unsubscribe link works
- [ ] Report a listing → appears in admin moderation queue
- [ ] Phone obfuscation hides number, message-then-reveal works
- [ ] Mark sold + pause flows work, screenshots of each state
- [ ] Build green, push, deploy, live smoke test

#### 10.8 Devil's advocate — phase 10
- *"Realtime cost?"* — Supabase free tier 500 concurrent, fine for launch. Switch to Pro at 1k DAU.
- *"Email deliverability?"* — Resend gives free 3000/mo. SPF/DKIM/DMARC must be set on `vozila.hr`. Verify before go-live.
- *"Phone obfuscation hurts conversion?"* — A/B test: original vs obfuscated. Hypothesis: trust gain > friction cost. Measure contact_action_rate.
- *"Spam in messages?"* — rate-limit to 5 messages/hour for unverified users; hard limit 50/day.

---

### Phase 11 — Lead-gen + trust depth (week 3)

This is where the **margin** lives. Boost is impulse-spend; lead-gen is recurring partner revenue.

#### 11.1 Lead-gen hub
- Migration `004_leads.sql`: `leads(id, listing_id, user_id, partner_type ENUM, payload JSONB, status ENUM, partner_id, payout_eur, created_at, contacted_at, won_at)`.
- ListingDetail integrations:
  - **Financing**: LoanCalculator → "Get pre-approved" → modal collects name+phone+income, inserts `leads` with `partner_type='financing'`. Admin routes to PBZ/Erste/Zaba.
  - **Insurance**: "Quick quote" → name+phone+postcode → `partner_type='insurance'`. Croatia-specific.
  - **Transport**: "How much to deliver to my city?" → city-from + city-to + size auto-from-listing → `partner_type='transport'`.
- Admin lead-gen dashboard: tabs per partner_type, status pipeline (new / contacted / won / lost), payout tracker.

#### 11.2 VIN history report (paid product)
- Edge Function `POST /functions/v1/vin-report-checkout`: Stripe one-shot 9.99 EUR.
- On webhook success, generate report PDF server-side via `pdfkit` Edge Function:
  - vPIC decode + cross-reference with `listings` table (any prior listings with same VIN = mileage timeline + photo gallery)
  - Damage-photo flags from listings DB
  - Croatian registration year (VIN-WMI heuristic)
  - "Prema našim podacima ovo vozilo ima X prethodnih oglasa" + chart
- Store report in Supabase Storage, email link via Resend.

#### 11.3 Vozila Inspection booking
- `inspection_bookings(id, user_id, listing_id, address, preferred_date, status, inspector_id, report_url, paid_eur, created_at)`.
- Booking form on ListingDetail: address + preferred date + notes → 100 EUR Checkout → admin queue.
- Inspector role in users (new enum value `inspector`).

#### 11.4 AI copywriter (Claude Haiku)
- Edge Function `POST /functions/v1/ai-listing-copy`:
  - Input: photos[] + specs JSON.
  - Calls Anthropic API with Haiku model, max 400 tokens, cached prompt prefix.
  - Returns Croatian description in Dino-style direct-response voice (use prompt template).
- Wire `AiCopywriterButton.tsx` to call the function. Show diff vs. user's current text.

#### 11.5 CSV / XML inventory sync
- Existing `CSVImportModal.tsx`: validate against schema, dry-run preview, then bulk insert with batched chunks of 100.
- New: XML feed pull via cron — admin enters dealer feed URL + mapping JSON, daily sync upserts.

#### 11.6 Reviews (post-sale)
- `reviews(id, dealer_id, buyer_id, listing_id, rating 1-5, body, verified_purchase BOOL, created_at, dealer_response, response_at)`.
- Eligibility: only buyers who had a message thread > 7 days old can review.
- Display on DealerProfile with average + distribution + responses.

#### 11.7 Visual proof — phase 11
- [ ] Submit financing lead → appears in admin queue
- [ ] Buy VIN report with test card → PDF arrives by email
- [ ] AI copywriter generates real Croatian text from photos+specs
- [ ] CSV import 5 listings → all visible in feed
- [ ] Dealer review submission + dealer response flow

#### 11.8 Devil's advocate — phase 11
- *"AI copywriter cost?"* — Haiku at $0.0002/1k tokens. 400-token output ≈ $0.0001/listing. Even 10k listings/month = $1.
- *"VIN report can't deliver value if vPIC doesn't decode EU VIN?"* — Fallback: Croatian registration year + WMI manufacturer + listing cross-reference. Make the value prop "what we know about this VIN from our database" not "complete history" so we don't overpromise.
- *"Lead-gen partners might not pay?"* — Start with self-serve: capture lead, email it free to user with note "this lead came from Vozila.hr — €15/lead going forward." Validates demand before contracts.
- *"Inspector network at zero"* — Stub the booking, manually fulfil first 10 with a single contractor. Don't build inspector marketplace until 50 bookings/month.

---

### Phase 12 — Discovery, SEO, mobile, polish (week 4)

#### 12.1 Dynamic sitemap + OG images
- Edge Function `GET /functions/v1/sitemap.xml`: streams paginated sitemap (categories + active listings + dealer profiles + city pages).
- Edge Function `GET /functions/v1/og-image?listing=<id>`: SVG-rendered PNG via `@vercel/og` style or `satori` — title + price + main photo + Vozila logo. Inject into SEOHead `og:image` per listing.

#### 12.2 SEO landing pages (huge organic upside)
- `/marka/<make>` — all listings of one make + intro text + popular models.
- `/marka/<make>/<model>` — model-specific page.
- `/grad/<city>/<category>` — e.g. `/grad/zagreb/automobili`.
- All hand-templated; AI-generated intro paragraphs (Haiku, 200 words each).

#### 12.3 Slug-canonical search URLs
- `/pretraga/bmw-320d-2018-do-20000` ↔ `?make=BMW&model=320d&yearMin=2018&priceMax=20000`.
- 301 from query-only to slug-canonical.

#### 12.4 Map view
- Mapbox tile + clustered listing markers. Sidebar listing list synced with viewport bounds. Integrate with existing radius RPC.

#### 12.5 Mobile PWA
- `manifest.webmanifest` with icons.
- Service worker: cache shell + last 20 listing detail pages + recently-viewed images.
- Install prompt after 2 sessions.

#### 12.6 "Did you mean"
- pg_trgm extension on `listings.title` + `listings.make` + `listings.model`. Suggest if 0 results.

#### 12.7 Browser push (web-push API)
- VAPID key generation, opt-in flow on first saved search creation.
- Edge Function pushes on new saved-search match.

#### 12.8 GDPR data export + delete
- Settings → "Download my data" → ZIP of all listings/messages/leads/reviews.
- Settings → "Delete my account" → soft-delete all PII, anonymize messages, hard-delete after 30 days.

#### 12.9 Performance + monitoring
- Sentry SDK (free tier) for client + Edge Functions.
- CI: fail build if `index-*.js` gzip > 220 kB (currently 187, 33 kB headroom).
- Lighthouse CI as PR check (LCP < 2.5s, CLS < 0.1).

#### 12.10 Cookie consent (per-purpose)
- 3 toggles: necessary (always on) / analytics / marketing. ConsentBanner v2.

#### 12.11 Visual proof — phase 12
- [ ] Sitemap.xml renders with thousands of URLs
- [ ] OG image renders for a real listing
- [ ] `/marka/bmw` page works with AI-written intro
- [ ] Map view shows pins clustered by Croatian region
- [ ] PWA installs on iOS Safari and Android Chrome
- [ ] "Did you mean" suggests on typo
- [ ] Browser push lands on Mac Chrome

---

### Phase 13 — Owner / Admin Console (week 5)

This phase makes the platform **operable**. Without it, you can't run the business once it has volume.

Refactor `AdminDashboard.tsx` into a sidebar-tabs structure:

#### 13.1 Sections
1. **Overview** — KPI cards (DAU/MAU, listings live, GMV last 30d, MRR, churn, search→0 rate).
2. **Listings** — table with filters, bulk actions (force-feature, force-unfeature, delete, mark-sold), CSV export.
3. **Users** — search, role change, suspend, dealer-verify, impersonate (read-only token).
4. **Payments** — Stripe events feed, refund button, MRR chart, churn chart, top tiers.
5. **Moderation** — queue of reported listings + auto-flagged + AI-suspicious. Approve / reject / shadow-ban.
6. **Leads** — tabbed by partner type, status pipeline, payout tracking.
7. **Search insights** — top queries, top filters, 0-result queries (= category/feature gaps).
8. **Email** — Resend sends per template, deliverability, unsubscribe rate, top-clicked CTAs.
9. **SEO** — missing meta titles, broken slugs, sitemap status, top organic queries (GSC API later).
10. **Native ads** — already partially built (`AdManager.tsx`), polish + reporting.
11. **Cron status** — last run, success/failure, lag for: digest, expiry, sitemap rebuild, scrapers.
12. **DB health** — Supabase quota, image storage usage, slow queries.
13. **Audit log** — every admin action, immutable.
14. **Kill switch** — pause new listings, pause payments, maintenance banner toggle.
15. **Global search** — across listings/users/payments/messages.

#### 13.2 RBAC
- Roles: `owner`, `admin`, `moderator`, `support`, `read-only`. Gate sections per role.
- Edge Function middleware checks role from `profiles.role`.

#### 13.3 Visual proof — phase 13
- [ ] Each section loads real data from DB
- [ ] Force-feature a listing from admin → it appears featured in feed within 5s
- [ ] Suspend a user → they can't log in
- [ ] Role gating: support user can't see Payments
- [ ] Audit log entries land on every action

---

### Phase 14 — Inspections fulfilment + Auctions stub (week 6)

#### 14.1 Inspections
- Inspector role + workspace: queue of bookings, claim, upload report, photos, badge.
- Branded inspection report PDF, attached to listing as "Vozila Inspected" badge with click-through to full report.

#### 14.2 Auctions (Bring-a-Trailer-style stub)
- New table `auctions(id, listing_id, start_at, end_at, reserve_eur, current_bid_eur, current_bidder, bid_count, status)`.
- Anti-snipe: bid in last 60s extends end by 60s.
- Buyer premium 5% on settle.
- Subdomain `aukcija.vozila.hr` reuses same React app with auction route.

---

## 4. APIs we'll integrate (free + low-cost)

| API | Use | Tier | Notes |
|---|---|---|---|
| Supabase | DB + Auth + Storage + Edge Functions + Realtime | Free 500MB / 2GB egress | Pro at scale |
| Stripe | Boost + Subs + VIN + Inspection + Auctions | Standard fees | Stripe Tax for EU VAT |
| Resend | All transactional + digest emails | Free 3000/mo | Pro at scale |
| Anthropic Claude (Haiku) | AI copywriter, AI moderation, AI intro pages | $0.0002/1k tok | Cap usage in admin |
| NHTSA vPIC | VIN decode | Free | EU VIN ~80% |
| Mapbox | Map view + geocoding | Free 50k loads/mo | |
| OpenStreetMap Nominatim | HR geocoding fallback | Free | rate-limit to 1/s |
| Sharp (npm) | Server-side image manip + watermark + thumbs | Free | Edge runtime via WASM build |
| Sentry | Error monitoring | Free 5k events/mo | |
| @vercel/og or satori | OG image rendering | Free | |
| pg_trgm | Typo-tolerant search | Free (Postgres ext) | |
| pdfkit | VIN reports, inspection reports | Free | |
| web-push | Browser push | Free | needs VAPID keys |

---

## 5. Database migrations roadmap

```
001_core_schema.sql               ← exists
002_fix_listings_drift.sql        ← phase 9 (FK + featured + profiles)
003_messaging.sql                  ← phase 10 (conversations + messages + notifications + saved_searches DB + reports)
004_leads.sql                      ← phase 11 (leads + reviews + inspection_bookings)
005_seo.sql                        ← phase 12 (search_log + city pages cache)
006_admin.sql                      ← phase 13 (audit_log + kill_switches + roles + impersonation_tokens)
007_auctions.sql                   ← phase 14
```

Every migration has a paired `down.sql` and a `seed.sql` for test data.

---

## 6. Environment variables (full list)

Create `client/.env.example` and `supabase/functions/.env.example`:

```bash
# Client (Vite — VITE_ prefix exposes to browser)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GA4_MEASUREMENT_ID=
VITE_META_PIXEL_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_BOOST_TOP=price_xxx
VITE_STRIPE_BOOST_FEATURED=price_xxx
VITE_STRIPE_BOOST_PREMIUM=price_xxx
VITE_STRIPE_SUB_BRONZE=price_xxx
VITE_STRIPE_SUB_SILVER=price_xxx
VITE_STRIPE_SUB_GOLD=price_xxx
VITE_STRIPE_VIN_REPORT=price_xxx
VITE_STRIPE_INSPECTION=price_xxx
VITE_MAPBOX_TOKEN=
VITE_SENTRY_DSN=
VITE_VAPID_PUBLIC_KEY=

# Edge Functions (server-only — never VITE_)
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
VAPID_PRIVATE_KEY=
SENTRY_DSN_SERVER=
```

All real values stored in macOS keychain (use `secure-env` skill) and Supabase Vault.

---

## 7. KPIs to track from day 1

(unchanged from MASTER_PLAN.md, restated for completeness)

- Time to first listing post (target: <90s with VIN auto-fill)
- Listings with Match Score ≥ 80 (target: 40%)
- Saved-search → email-click conversion (target: 8%)
- VDP → contact-action conversion (target: 6%)
- Repeat visit rate within 14 days (target: 35%)
- Dealer subscription conversion (target: 2%)
- Boost purchase rate within 24h of listing creation (target: 12%)
- VIN report attach rate (target: 4% of buyer sessions)

---

## 8. Risk register (updated)

| Risk | Mitigation |
|---|---|
| Schema drift between SQL migration + live Supabase + client code | Phase 9.1 introduces a verification step + re-syncs |
| Stripe webhook missed | Dedupe + Stripe retries + admin alert if event >30min unprocessed |
| Resend deliverability into HR/EU mailboxes | SPF/DKIM/DMARC on `vozila.hr` + warm-up sequence |
| Mapbox token leaked | URL referrer restriction + 50k/mo soft cap monitoring |
| Anthropic API cost spike | Hard cap per user/day + admin global toggle |
| Hostinger Hostinger FTP deploy is brittle | Mirror to Vercel as backup, one-click DNS swap |
| Croatian regulatory (cookies, GDPR, AZOP) | Per-purpose cookie consent + DPA template |
| Supabase free-tier outgrow | Pro plan at 1k DAU, ready trigger |

---

## 9. Definition of Done — full platform

The platform is "ready to launch" when:

1. ✅ Buyer can: search, filter, save search with email alerts, message seller, get financing/insurance/transport quotes, buy VIN report, book inspection, leave review.
2. ✅ Seller can: post in 90s with VIN, upload watermarked photos, get AI description, see analytics, edit/pause/sold/delete, buy boost, subscribe to dealer tier, manage subscription, respond to reviews.
3. ✅ Owner can: see KPIs, moderate, refund, route leads, audit, kill-switch, all from one console with RBAC.
4. ✅ Stripe live (not test), Resend deliverable, Sentry capturing, Sitemap indexed by Google.
5. ✅ Performance: Lighthouse mobile ≥ 90 perf / 95 access / 100 SEO. Initial JS gzip ≤ 220 kB.
6. ✅ Croatian translation complete on every user-facing string. English version optional later.
7. ✅ GDPR data export + delete works.
8. ✅ Backup: nightly `pg_dump` + image storage to private R2.
9. ✅ All migrations idempotent + documented.
10. ✅ Smoke test script in `scripts/smoke-test.mjs` walks 12 critical paths.

---

## 10. Session continuity — checkpoints

Append after each session. Format: date, what shipped, build status, next concrete action.

### Checkpoint 2026-05-05 (this session)
- **Shipped:** Master Plan v2 written + committed. State of all 8 prior phases verified. Real bugs in schema-vs-code drift identified (#1, #2, #3, #4 above).
- **Build:** ✅ green, 2.4s, 187 kB initial gzip.
- **Decision needed before phase 9 starts:**
  - Backend: A) Supabase Edge Functions (recommended) or B) Express on Hermes VPS.
  - Stripe live keys vs test mode for first build (recommend test until phase 9 fully verified).
- **Next concrete action:** Start phase 9.1 (schema fix migration `002_fix_listings_drift.sql`). User says "continue Vozila phase 9" or "start phase 9.1".

### Checkpoint <next>
*(append next session)*
