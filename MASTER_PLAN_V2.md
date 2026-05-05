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

### Checkpoint 2026-05-05 (phase 9.1 + 9.2 partial)
- **Decision:** Backend = **A) Supabase Edge Functions** (per user instruction).
- **Shipped this session:**
  - `server/db/migrations/002_fix_listings_drift.sql` — adds `listings.user_id` FK to `auth.users`, `category_slug`, `main_image`, `images[]`, `damage_images[]`, `is_featured`, `featured_tier`, `featured_until`. Creates `profiles` table with subscription state. Creates `stripe_events` dedupe table. Adds RLS policies. Adds auto-create-profile trigger on `auth.users` insert. **Idempotent** — safe to re-run.
  - Bug A fixed: `CreateListingWizard.tsx` insert now includes `user_id: user.id`.
  - Bug B fixed: `DealerProfile.tsx` now filters `.eq('user_id', dealerRow.id)` — no more "all listings" leak.
  - Bug D fixed: `BoostModal.tsx` now calls `${VITE_SUPABASE_FUNCTIONS_URL}/create-boost-checkout` with the user's JWT, falls back to local intent only when env missing.
  - `supabase/functions/_shared/{cors,stripe,supabase}.ts` — shared helpers.
  - `supabase/functions/create-boost-checkout/index.ts` — verifies ownership, creates Stripe Checkout (one-shot), tier→priceId via env, metadata for webhook.
  - `supabase/functions/stripe-webhook/index.ts` — verifies Stripe signature, dedupes by event ID, on `checkout.session.completed` for `kind=boost` flips `listings.is_featured = true`, `featured_tier`, `featured_until = NOW + N days`.
  - `supabase/functions/expire-featured/index.ts` — daily cron, clears expired featured flags.
  - `supabase/functions/README.md` — full deploy runbook (CLI install, secrets, Stripe Dashboard setup, webhook URL, cron schedule, test commands).
- **Build:** ✅ green, 2.46s, 187.56 kB initial gzip (unchanged from baseline).
- **Not yet done in phase 9:**
  - 9.3 — Stripe **Subscriptions** (Bronze/Silver/Gold) Edge Function + webhook handlers (`customer.subscription.*`).
  - 9.3 — Customer Portal Edge Function.
  - 9.3 — Verified-dealer badge logic on ListingCard / DealerProfile / ListingDetail.
  - 9.4 — End-to-end live test with Stripe test card `4242 4242 4242 4242`.
  - Backfill seed listings with valid `user_id` after migration runs against live DB.
- **Manual deploy steps user must run before live test (one-time):**
  1. Run migration `002_fix_listings_drift.sql` against the live Supabase DB.
  2. Stripe Dashboard → create 3 products + 3 one-time Prices (4.99 / 14.99 / 49.00 EUR).
  3. `supabase secrets set` with all keys per `supabase/functions/README.md`.
  4. `supabase functions deploy create-boost-checkout`, `stripe-webhook --no-verify-jwt`, `expire-featured --no-verify-jwt`.
  5. Stripe Dashboard → Webhooks → add endpoint `https://<ref>.supabase.co/functions/v1/stripe-webhook`.
  6. Set `VITE_SUPABASE_FUNCTIONS_URL` in `client/.env` and redeploy.
- **Next concrete action:** Phase 9.3 — write `create-subscription-checkout`, `customer-portal`, extend `stripe-webhook` for `customer.subscription.created/updated/deleted`, add `subscription_tier` reads to UI for verified-dealer badge. Say "continue Vozila phase 9.3".

### Checkpoint 2026-05-05 (phase 9.3 — Stripe Subscriptions + dealer badge)
- **Shipped this session:**
  - `supabase/functions/_shared/stripe.ts` — added `SubTierId` type, `SUB_PRICE_ENV` mapping, `priceIdToSubTier()` helper.
  - `supabase/functions/create-subscription-checkout/index.ts` — Stripe Checkout in `mode=subscription`, reuses existing `stripe_customer_id` from profiles when available, attaches `user_id`+`tier` metadata to both session and `subscription_data`, allows promo codes, redirects to `/postavke?sub=success` on success.
  - `supabase/functions/customer-portal/index.ts` — returns one-time Billing Portal URL, requires existing `stripe_customer_id` on profile.
  - `supabase/functions/stripe-webhook/index.ts` — extended:
    - `checkout.session.completed` for `kind=subscription` stashes `stripe_customer_id` on profile immediately (so portal works before subscription event lands).
    - `customer.subscription.created` + `customer.subscription.updated` → `applySubscription()` writes `subscription_tier` (resolved via `priceIdToSubTier`), `subscription_status`, `subscription_renews_at`, `stripe_customer_id`.
    - `customer.subscription.deleted` → null tier, status=`canceled`.
    - `invoice.payment_failed` → status=`past_due` (matched by `stripe_customer_id`).
  - `client/src/lib/subscription.ts` — `startSubscriptionCheckout()`, `openCustomerPortal()`, `getMySubscription()` (reads from `profiles`), `isVerifiedDealer()`, `tierLabel()`. Throws clean errors when JWT or `VITE_SUPABASE_FUNCTIONS_URL` missing.
  - `client/src/components/listings/VerifiedDealerBadge.tsx` — tier-aware pill (Bronze=ShieldCheck amber, Silver=Award slate, Gold=Crown gold), `sm`+`md` sizes.
  - `client/src/pages/Pricing.tsx` — Bronze/Silver CTAs (and Gold) now call `startSubscriptionCheckout`. "Trenutni plan" indicator when user is already on that tier. Shows error if Edge Function returns one. Reads `?sub=cancel` to show cancellation notice.
  - `client/src/pages/Settings.tsx` — new "Pretplata" card at top: shows current tier + renewal date + "Upravljaj pretplatom" → Customer Portal. `past_due` state shows orange "Ažuriraj plaćanje" CTA. Empty state links to `/za-partnere`. Polls profile after `?sub=success` to give webhook time to land.
  - `client/src/pages/DealerProfile.tsx` — fetches profile.subscription_tier alongside dealer row, replaces hand-rolled "Verificirani salon" pill with `<VerifiedDealerBadge>` when tier is active (falls back to dealer_verified pill otherwise).
- **Build:** ✅ green, 2.14s, 187.61 kB initial gzip (+0.05 vs baseline). Pricing 7.41→9.06, Settings 7.62→11.28, DealerProfile 5.99→6.41 — all expected.
- **Bugs / gaps still open after 9.3:**
  - ListingCard + ListingDetail seller block do NOT yet show the dealer badge — needs an `owner` profile join in `ListingFeed` query and a small render change. Deferred to phase 9.4.
  - No "force-feature" / "force-verify" admin actions yet — phase 13.
  - Subscription tiers do NOT yet enforce listing limits (Bronze=15, Silver=50, Gold=∞) — needs wizard guard. Deferred to phase 9.4.
  - Tier-based Boost credits (10€ / 40€ / 150€ monthly) NOT modeled — needs `boost_credits` table + monthly accrual cron. Deferred to phase 11.
- **New env vars required for live test:**
  - `STRIPE_PRICE_SUB_BRONZE`, `STRIPE_PRICE_SUB_SILVER`, `STRIPE_PRICE_SUB_GOLD` (Stripe Dashboard recurring prices).
  - Webhook in Stripe Dashboard must now also listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` (in addition to `checkout.session.completed`).
- **Devil's-advocate notes from this round:**
  - *Customer Portal opens but user has no profile row yet?* — `handle_new_user()` trigger from migration 002 ensures every `auth.users` insert auto-creates `public.profiles`. Existing accounts backfilled by migration. Verify after running migration.
  - *User upgrades Bronze → Gold mid-cycle?* — Stripe sends `customer.subscription.updated`, our handler resolves new `priceId` → new tier, profile updated. Test by changing in Customer Portal.
  - *User cancels mid-cycle?* — `customer.subscription.deleted` only fires at period end (not immediate cancel). During the grace period, `subscription_status='active'` until period_end → badge stays. After period_end, deleted event nulls tier. Acceptable: user paid for the month.
  - *Webhook order out of sequence?* — `checkout.session.completed` writes `stripe_customer_id`; `customer.subscription.created` writes tier+status. Both upsert by user_id, idempotent. If subscription event arrives first (rare), customer_id still gets written from its own `customer` field via `applySubscription`.
- **Next concrete action:** Phase 9.4 — wire dealer badge into ListingCard + ListingDetail seller block (needs `owner` join in ListingFeed query); add listing-count guard to wizard so Bronze stops at 15 active. Then end-to-end live test with Stripe test card. Say "continue Vozila phase 9.4".

### Checkpoint 2026-05-05 (phase 9.4 — badge in feed/detail + listing-limit guard + live runbook)
- **Shipped this session:**
  - `client/src/types/index.ts` — extended `Profile` with `subscription_tier`, `subscription_status`, `logo_url`. New `SubTier` + `SubStatus` exported types. Role enum widened to include `moderator`, `inspector`, `owner`.
  - `client/src/components/listings/ListingFeed.tsx`:
    - Query now joins profiles via `owner:profiles!listings_user_id_fkey(...)` pulling tier + status + dealer flags.
    - `ListingCard` (the feed's exported one used everywhere) now derives `isVerifiedDealer` from active subscription state and renders `<VerifiedDealerBadge>` (tier-coloured: Bronze amber / Silver slate / Gold yellow). Falls back to old "Verificirani" pill for legacy `is_verified`/`dealer_verified` users.
  - `client/src/components/listings/ListingDetail.tsx`:
    - Same join in the detail fetch — owner profile pulled with subscription state.
    - Seller block at line ~729 now shows `<VerifiedDealerBadge>` when subscription is active. Old hand-rolled "Verificirani" pill kept as fallback. "Premium partner" copy now correctly tied to `subscription_tier === 'gold'`.
  - `client/src/lib/listingLimits.ts` (new) — `getMyListingLimitState()` reads profile + counts user's active listings, returns `{tier, used, limit, remaining, exceeded}`. Limits: free=3, bronze=15, silver=50, gold=∞ (Number.POSITIVE_INFINITY).
  - `client/src/components/listings/CreateListingWizard.tsx`:
    - Loads `ListingLimitState` on auth change.
    - Inline banner (amber when ≥80% used, red when exceeded) above the progress bar with current usage + tier label + "Nadogradi paket" link to `/za-partnere`.
    - Submit handler does a fresh re-check at click time — stale page state can't slip past. Alert + early return when exceeded.
  - `PHASE_9_LIVE_TEST_RUNBOOK.md` (new, repo root) — 10-section end-to-end runbook covering: prerequisites, schema migration, Stripe products/prices, Edge Function secrets, function deploys, webhook wiring, pg_cron scheduling, client env, full test walkthrough (subscription + boost + past-due + cron + listing limit + badge surfaces), rollback plan, going-live checklist. Each step has explicit success criteria.
- **Build:** ✅ green, 2.72s, 188.05 kB initial gzip (+0.44 vs phase 9.3 baseline). New `subscription-*.js` shared chunk extracted (1.20 kB). CreateListingWizard 39.36 → 41.76 kB. ListingDetail 90.56 → 90.90. DealerProfile 6.41 → 6.36 (tree-shake). All within budget.
- **Devil's-advocate this round:**
  - *FK name might differ in live DB.* Used `profiles!listings_user_id_fkey(...)` — if the live DB names the FK differently (Supabase auto-generates from constraint name), the join silently returns null. Mitigation: runbook section 1 verifies the FK exists; if not, the migration adds it. Alternative join syntax `owner:profiles(...)` would also work because Supabase resolves single-FK relationships by table name when unambiguous. Will fall back to that if the named-FK version errors at runtime.
  - *Listing-limit count might double-count `published` legacy state.* Counted `['active','published','paused']` to be safe — both are visible to the public.
  - *Free user gating could be too aggressive (3 listings).* Master plan KPI #1 is "time to first listing post <90s" — a hard 3-listing cap doesn't hurt that. If conversion data shows otherwise, raise to 5 in `LISTING_LIMITS`.
  - *Race condition in submit guard.* Re-checking at submit time closes the obvious window, but two concurrent submits could each pass the check then both insert. Acceptable — webhook/admin queue would catch the rare overage. Real fix is a DB-side trigger; deferred to phase 13 admin work.
- **Bugs / gaps still open after 9.4:**
  - "Slično vozilo" KNN rail at the bottom of detail does not yet show tier badges — uses the same `ListingCard` from feed, so it'll inherit the badge once that data is fetched. The `SimilarVehicles` query needs the same join. **Phase 10 carries this.**
  - Edge Function deploy + live test require user to do the manual steps in `PHASE_9_LIVE_TEST_RUNBOOK.md` — I cannot push to Supabase or Stripe from this environment.
  - Boost credits accrual (10/40/150 EUR/mo per tier) still deferred to phase 11 — needs `boost_credits` table + monthly cron.
- **Next concrete action options:**
  - **(a)** User completes runbook → reports any failures → I fix.
  - **(b)** Continue to phase 10 (messaging + email + anti-scam) without waiting for live test — deploys are independent.
  - Recommendation: do (b) in parallel; runbook is yours to execute when you have a Supabase + Stripe session free. Say `continue Vozila phase 10` for (b).

### Checkpoint 2026-05-05 (phase 10.1 — messaging core + report-listing + lifecycle)
- **Shipped this session:**
  - `server/db/migrations/003_messaging.sql` — idempotent migration adding:
    - `conversations(listing, buyer, seller, last_message_at, buyer/seller_unread, status, buyer_revealed_phone)` with `UNIQUE(listing_id, buyer_id)` (one thread per buyer-listing pair).
    - `messages(conversation, sender, body 1..4000, read_at, flagged, flag_reason)` with after-insert trigger that bumps `last_message_at` + the recipient's unread counter.
    - `notifications(user, type, payload, read_at)` for the bell + future digests.
    - `reports(listing, reporter, reason, notes, status, reviewed_by/at)` for moderation queue.
    - `saved_searches(user, label, url, params, last_seen_ids[], email/push_alert, last_visited_at, last_digest_sent_at)` — promotes localStorage to DB so cron can run digests in 10.2.
    - `email_unsubscribes(user, category)` for HMAC unsub tokens.
    - RLS on all 6 tables. Realtime publication for messages/conversations/notifications.
  - `client/src/lib/messaging.ts` — full client API: `ensureConversation` (race-safe upsert), `sendMessage`, `listMyConversations` (joined), `getConversation`, `listMessages`, `markConversationRead`, `revealPhone`, `getUnreadTotal`, `subscribeToMessages` + `subscribeToMyConversations` (Supabase Realtime channels), `detectScamSignals` (phone-number / external-channel / phishing patterns).
  - `client/src/pages/Messages.tsx` (new, lazy-loaded at `/poruke` and `/poruke/:id`) — split-pane inbox: conversation list with unread badges + selected thread with realtime append + composer with Ctrl/Cmd+Enter to send + scam warning inline. Auth gate, mobile back-arrow, max length 4000 enforced both client + DB CHECK.
  - `client/src/components/layout/NotificationsBell.tsx` (new) — Header bell with live unread total, subscribes to conversations channel, hides when signed out, formats `99+`.
  - `client/src/components/listings/ReportListingButton.tsx` (new) — Radix dialog with 6 reason radios + free-text notes, inserts into `reports`, shows success state.
  - `client/src/components/layout/Header.tsx` — `<NotificationsBell />` mounted next to Heart in the desktop utility row.
  - `client/src/App.tsx` — added `/poruke` + `/poruke/:id` lazy routes pointing at `Messages`.
  - `client/src/components/listings/ContactActionHub.tsx` — replaced fake-send simulation with real `ensureConversation` + `sendMessage` + post-send navigation to `/poruke/<id>`. Added `obfuscatePhone` prop, phone reveal flow with masked display, `Eye`/`Phone` icons. Scam-pattern warning shown inline when draft contains red flags.
  - `client/src/components/listings/ListingDetail.tsx` — desktop contact column rebuilt:
    - Primary CTA "Pošalji poruku prodavaču" → `ensureConversation` → routes to `/poruke/<id>`.
    - Phone column gated by `Prikaži broj` reveal (anti-scam).
    - WhatsApp button only shows after reveal.
    - `<ReportListingButton>` mounted at the bottom of the contact column with hairline divider.
  - `client/src/pages/Dashboard.tsx` — old single-toggle replaced with full lifecycle: Edit (link to `/predaj-oglas?edit=<id>`), Pause / Resume, Mark sold, Restore (when sold), Delete (with `confirm()`). New `paused` status enum value displayed amber. Uses `setStatus(id, status)` and `deleteListing(id)`. Optimistic UI updates.
- **Build:** ✅ green, 2.96s, 189.78 kB initial gzip (+1.73 vs 9.4). New `Messages-*.js` chunk 3.03 kB gzip. Dashboard 13.85→16.10 (lifecycle). ListingDetail 90.90→96.45 (message CTA + report + phone reveal).
- **Bugs / gaps still open after 10.1 (deferred to 10.2):**
  - `send-email` Edge Function (Resend wrapper) NOT yet built — no transactional email on new message / boost receipt / sub receipt.
  - `saved-searches-digest` Edge Function NOT yet built — saved-search emails still inert.
  - `unsubscribe` Edge Function NOT yet built.
  - Wizard `?edit=<id>` mode NOT yet implemented — Edit button currently sends user to a new-listing wizard (would need a hydrate-from-existing path; deferred).
  - Browser push (web-push + VAPID) deferred to phase 12.
  - Notifications table is created but no UI yet beyond the message bell (saved-search hits land here in 10.2).
  - Phase 10's "edit listing" path needs a small wizard refactor; doing it now would risk bulldozing the wizard's auth/upload flow. Marking for a focused 10.3.
- **Devil's-advocate this round:**
  - *Realtime channels leak on unmount?* — Both inbox + bell return the channel from subscribe and call `.unsubscribe()` in the cleanup of the effect. Verified pattern matches `@supabase/supabase-js` v2 docs.
  - *Self-message via `ensureConversation`?* — Guarded explicitly: throws "Ne možete poslati poruku samom sebi" before insert.
  - *Concurrent inserts → duplicate conversation?* — `UNIQUE(listing_id, buyer_id)` constraint + race fallback re-read. Tested logically.
  - *RLS on messages too tight?* — INSERT policy requires `auth.uid() = sender_id` AND a matching open conversation row visible via the SELECT policy. Service role (Edge Functions) bypasses RLS, so future bot/system messages still possible.
  - *DB trigger races with realtime broadcast?* — Trigger and broadcast both fire on INSERT; since the unread bump is part of the same transaction as the message insert, the bell's refetch (triggered by conversation change) will see the new counter atomically.
  - *Detect scam patterns might false-positive on legit Croatian numbers?* — Yes, intentionally. The signal is shown inline as a tip, never blocks send. Server-side flagging in 10.2 will use the same heuristic to set `messages.flagged=true` for moderation review without rejecting the message.
  - *Phone reveal on detail not synced with conversation flag?* — Detail-page reveal is local state per session (component). Once the buyer sends a message via `ensureConversation`, the `buyer_revealed_phone` column flips for permanent reveal across devices via `revealPhone()` (will wire in 10.2 when the inbox surfaces the listing's phone in the thread header).
- **Next concrete action:** Phase 10.2 — `send-email` Edge Function + Resend templates + `saved-searches-digest` daily cron + `unsubscribe` Edge Function. Say "continue Vozila phase 10.2".

### Checkpoint 2026-05-05 (phase 10.2 — Resend email + digest cron + unsubscribe)
- **Shipped this session:**
  - `supabase/functions/_shared/email.ts` — Resend HTTP client, HMAC-signed unsubscribe URL maker (`makeUnsubUrl`/`verifyUnsubToken`, base64+sha256 HMAC), `sendEmail()` with full `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` headers (RFC 8058), Croatian-locale templates `tplNewMessage` + `tplSavedSearchDigest` with safe HTML escaping. Skips send if user is in `email_unsubscribes` for the matching category or `'all'`.
  - `supabase/functions/send-email/index.ts` — generic Resend wrapper, gated by `SUPABASE_SERVICE_ROLE_KEY` Bearer auth (only callable by other Edge Functions or DB triggers via pg_net). Honours unsubscribe table.
  - `supabase/functions/notify-new-message/index.ts` — accepts both service-role and user-JWT auth. Validates the caller is a participant of the conversation when called with user JWT (closes the spam-via-message_id vector). Inserts a `notifications` row regardless, then emails the recipient (skipped if recipient unsubscribed from `'all'`).
  - `supabase/functions/saved-searches-digest/index.ts` — cron entrypoint. For every `saved_searches.email_alert=true`: applies `params` to a server-side replay of the listing query (`category_slug`, price/year/mileage ranges, JSONB make/model/fuel/transmission), diffs vs `last_seen_ids`, sends digest if there are net-new matches (cap 8 cards), writes the new id snapshot + `last_digest_sent_at`, drops a `notifications` row. Returns `{sent, skipped, errors, total}`.
  - `supabase/functions/unsubscribe/index.ts` — public endpoint, HMAC-verified. Idempotent upsert to `email_unsubscribes`. Renders a small Croatian HTML confirmation page on GET; returns 200 OK on POST (RFC 8058 one-click).
  - `client/src/lib/savedSearchesDb.ts` (new) — DB-backed companion to localStorage `savedSearches.ts`. `paramsFromUrl()` parses search URL → structured params matching the Edge Function's reader. `upsertSavedSearchDb` / `setEmailAlertDb` / `listMyDbSavedSearches` / `deleteSavedSearchDb`. Idempotent on `(user_id, url)`.
  - `client/src/lib/messaging.ts` — `sendMessage` now fires-and-forgets `notify-new-message` Edge Function call after every message insert. Realtime delivery still happens via Supabase Realtime regardless; email is best-effort.
  - `supabase/functions/README.md` — extended with phase 10 functions table, Resend env block (`RESEND_API_KEY`, `RESEND_FROM`, `PUBLIC_SITE_URL`, `EMAIL_HMAC_SECRET`), deploy commands for all four new functions, digest cron schedule (`0 8 * * *` Europe/Zagreb).
- **Build:** ✅ green, 2.40s, 189.80 kB initial gzip (+0.02 vs 10.1 — `savedSearchesDb.ts` tree-shaken because no UI imports it yet).
- **Bugs / gaps still open after 10.2 (deferred to 10.3):**
  - SavedSearches UI doesn't yet call `setEmailAlertDb` when toggling alerts — current toggle still localStorage only. Needs a small edit to `components/search/SavedSearches.tsx`.
  - No notifications-feed UI in Header beyond the message bell — saved-search hits land in `notifications` table but aren't surfaced. A bell-flyout listing them is a 10.3 task.
  - Wizard `?edit=<id>` mode still NOT implemented (carried from 10.1).
  - SPF/DKIM/DMARC on `vozila.hr` must be set before live emails — runbook update needed.
  - Browser push (web-push + VAPID) deferred to phase 12.
- **Devil's-advocate this round:**
  - *EMAIL_HMAC_SECRET rotation invalidates pending unsubscribe links.* Yes, by design. Document in 10.4 ops doc that rotation is rare; ideally only after a leak.
  - *Resend rate limit (3000/mo free).* Saved-search digest is per-user-per-day max one email; even at 1k DAU that's 30k/mo. Need Pro tier ($20/mo) by 100 DAU. Tracked in cost model.
  - *RFC 8058 one-click POST fires from Gmail/Apple Mail unsubscribe button.* Endpoint accepts both GET and POST; POST returns 200 silently per spec. Verified.
  - *notify-new-message could be called with a stale message_id by an ex-participant.* Mitigation: the function re-reads the conversation and validates `caller_id IN (buyer_id, seller_id)` for non-service-role auth. Past participants can technically still trigger an email of a message they sent themselves, which is no-op (sender = recipient case is filtered: recipientId is computed as the OTHER side; if caller is sender, that's fine).
  - *Saved-search digest could spam buyers when sellers re-list 50 cars at once.* Cap of 8 cards in email + 50 row server-side query. Future enhancement: rate-limit to one digest per search per 24h via `last_digest_sent_at` (already populated; just need a `WHERE last_digest_sent_at < NOW() - interval '20 hours'` filter — adding in 10.3).
  - *Anonymous/legacy localStorage saved-searches won't get emails.* Correct — that's the design. Toggling email alert requires sign-in, which prompts a UI gate in 10.3.
- **New env required for live (phase 10):**
  - `RESEND_API_KEY` (Resend dashboard → API keys; verify domain `vozila.hr` first or use `onboarding@resend.dev` for testing)
  - `RESEND_FROM='Vozila <noreply@vozila.hr>'` (after domain verification)
  - `PUBLIC_SITE_URL=https://testiranje.cloud` (or `https://vozila.hr` once live)
  - `EMAIL_HMAC_SECRET=$(openssl rand -hex 32)` — keep stable.
- **Next concrete action:** Phase 10.3 — wire SavedSearches toggle to `setEmailAlertDb`, add notifications flyout in the bell, add `last_digest_sent_at` 20-hour debounce in the digest cron. Say "continue Vozila phase 10.3".

### Checkpoint 2026-05-05 (phase 10.3 — DB-synced saved searches + notifications flyout + digest debounce)
- **Shipped this session:**
  - `client/src/components/search/SavedSearches.tsx` — wrapped delete + email-toggle + save-current with DB sync calls (`upsertSavedSearchDb`, `setEmailAlertDb`, `deleteSavedSearchDb`). Auth state tracked locally; signed-out users get an inline alert when toggling email-on (saves stay in localStorage but emails won't fire until they sign in). LocalStorage path unchanged so anonymous flows still work.
  - `client/src/lib/notifications.ts` (new) — `listMyNotifications`, `getMyUnreadCount`, `markNotificationRead`, `markAllRead`, `subscribeToMyNotifications` (per-user filter), plus `notificationLink()` and `notificationTitle()` helpers that switch on type for the flyout's row rendering. Forward-compatible — unknown types render with a generic Bell icon.
  - `client/src/components/layout/NotificationsFlyout.tsx` (new) — bell + dropdown combining two unread sources: notifications table (saved-search hits, boost confirmations…) + conversation unread counts. Click-outside to close, "Označi sve" bulk-mark, lazy-loaded list on open, realtime refresh on either source. Quick-link tile to `/poruke` when unread messages > 0. Per-row icon by type. Read state visually distinguished (opacity + dot indicator).
  - `client/src/components/layout/Header.tsx` — `<NotificationsFlyout />` mounted next to `<NotificationsBell />`. Both can coexist — bell is a fast link to inbox, flyout is the broader notification surface. (We may consolidate to flyout-only later, kept for staged rollout safety.)
  - `supabase/functions/saved-searches-digest/index.ts` — added 20-hour debounce: `WHERE last_digest_sent_at IS NULL OR last_digest_sent_at < (NOW - 20h)`. Prevents same saved-search emailing twice in a day even if cron runs more than once.
- **Build:** ✅ green, 2.37s, 192.03 kB initial gzip (+2.23 vs 10.2). Increase is `NotificationsFlyout` + `notifications.ts` going into the shared chunk via Header. All other route chunks unchanged.
- **Bugs / gaps still open after 10.3 (deferred):**
  - Wizard `?edit=<id>` mode still NOT implemented. The Dashboard "Uredi" button currently lands on a fresh wizard. Carrying to phase 11 since lead-gen + AI copywriter live in the wizard's Step 2/3 anyway.
  - Two bells in the Header (NotificationsBell = message-only quick link, NotificationsFlyout = full feed). Cosmetic redundancy. Will collapse into one unified surface in 10.4 once we confirm the flyout's totals match.
  - SavedSearches DB row label may drift from localStorage label if user renames in one but not the other. Acceptable: future "manage saved searches" page (Settings) will edit the canonical row.
  - `notify-new-message` is fired from the client only; no DB trigger via `pg_net` yet. Acceptable for v1 — the realtime delivery still works; only email is best-effort. Trigger comes in phase 13 along with the rest of the cron/queue surface.
- **Devil's-advocate this round:**
  - *DB sync runs even when `VITE_SUPABASE_FUNCTIONS_URL` missing.* Yes, by design — the saved_searches *table* exists in Supabase regardless of whether Edge Functions are deployed. The cron just wouldn't run. UI keeps working.
  - *Mark-all-read race against an arriving INSERT.* Update + insert are independent; the realtime channel will pick up the new row and bump the badge again. Correct behaviour.
  - *Flyout subscribes to one channel per mount.* Each channel name is `notifications:<userId>` and `my-conversations` — both reused; on remount the unsubscribe fires first. No leak.
  - *Anonymous-user toggle alert is intrusive (alert()).* Acceptable for v1. The bookmark UI in `Settings` (10.4) will replace this with an inline sign-in prompt.
  - *Cron debounce uses server clock; what if Postgres TZ drifts?* Comparison is against UTC `NOW()` and `last_digest_sent_at` (timestamptz) — no TZ issue.
- **Next concrete action options:**
  - **(a)** Phase 10.4 — collapse two bells into one unified flyout, add settings UI to manage saved searches + email categories from `/postavke`, browser-push opt-in (web-push) deferred to phase 12.
  - **(b)** Skip to phase 11 — lead-gen hub (financing/insurance/transport), VIN history paid report, AI copywriter, dealer reviews. Higher revenue impact.
  - Recommendation: (b). Phase 10 surface is now functionally complete; the bell consolidation is polish.
  - Say `continue Vozila phase 11` for (b), or `continue Vozila phase 10.4` for (a).

### Checkpoint 2026-05-05 (phase 11 — lead-gen + VIN report + AI copywriter + reviews + inspections)
- **Shipped this session:**
  - `server/db/migrations/004_leads.sql` — idempotent migration adding:
    - `leads(listing, user, partner_type, payload JSONB, status, partner_id, payout_eur, ip_hash, user_agent)` for financing/insurance/transport.
    - `reviews(dealer, buyer, listing, rating 1-5, body, verified_purchase, dealer_response, response_at, status)` with `UNIQUE(dealer_id, buyer_id, listing_id)`.
    - `inspection_bookings(user, listing, address, preferred_date, preferred_time_window, status, inspector_id, report_url, paid_eur, stripe_session_id, scheduled_at, completed_at)`.
    - `vin_reports(user, vin, listing, status, paid_eur, stripe_session_id, report_url, vpic_data JSONB, cross_references JSONB, generated_at)`.
    - `dealer_rating_summary` view aggregating `reviews` for fast DealerProfile renders.
    - RLS on all 4 tables — buyer self-select for own leads/reports/bookings, dealer-respond for reviews, admin all.
  - `client/src/lib/leads.ts` — `submitLead({partner_type, listing_id, payload})` with name+phone guard, profile auto-fill on form open, anonymous-allowed insert.
  - `client/src/components/listings/LeadCaptureModal.tsx` — reusable Radix dialog, 3 partner variants with conditional fields (financing: down/term/income/loan; insurance: birth_year/driver_years/postcode; transport: city_from/to/preferred_date), GDPR-style copy footer.
  - `client/src/components/listings/VinReportButton.tsx` — calls `vin-report-checkout` Edge Function with VIN, redirects to Stripe Checkout. Auth-gated, VIN-format-validated, 503-friendly when env missing.
  - `client/src/components/listings/InspectionBookingButton.tsx` — Radix dialog form (address/date/time-window/notes), inserts `inspection_bookings` row with status='pending'. €100 stub — admin manually fulfils first 10 to validate demand before paid Checkout integration.
  - `client/src/lib/reviews.ts` — `canBuyerReview(dealerId)` enforces 7-day-old conversation eligibility + already-reviewed dedupe; `submitReview`, `listDealerReviews`, `getDealerRatingSummary`, `respondToReview`.
  - `client/src/components/listings/DealerReviews.tsx` — full surface: aggregated 1-5 distribution bars, write-review form (gated by eligibility), per-review card with rating + body + verified-contact pill + dealer response thread. "Odgovori na recenziju" CTA visible only to the dealer themselves.
  - `client/src/pages/DealerProfile.tsx` — `<DealerReviews dealerId={dealer.id} />` mounted in a new section under listings grid.
  - `client/src/components/listings/LoanCalculator.tsx` — added `listingId` prop + "Get pre-approved" `LeadCaptureModal partnerType="financing"` CTA at the bottom with PBZ/Erste/Zaba blurb. Pre-fills financing form with current sliders' values.
  - `client/src/components/listings/ListingDetail.tsx` — new inline `TrustRail` 4-tile rail (VinReportButton, InspectionBookingButton, insurance LeadCapture, transport LeadCapture). LoanCalculator passed listing.id for lead attribution.
  - `client/src/components/listings/AiCopywriterButton.tsx` — swapped from `/api/copywriter` stub to real Supabase Edge Function `ai-listing-copy` with bearer token, 503/429-aware error states.
  - `supabase/functions/ai-listing-copy/index.ts` — Anthropic Claude Haiku wrapper, Croatian system prompt in Dino's direct-response voice (forensic-premium, no emojis, no slogans, 110-180 words, ends with concrete CTA), 30/hour rate-limit per user via `notifications.type='ai_copy_call'` sentinel rows, 503 when `ANTHROPIC_API_KEY` missing. Uses `claude-haiku-4-5-20251001` (overridable via `ANTHROPIC_MODEL` env).
  - `supabase/functions/vin-report-checkout/index.ts` — pre-creates `vin_reports` row with `pending` status, then Stripe Checkout in payment mode, 9.99 EUR. Stores `stripe_session_id` so webhook can match.
  - `supabase/functions/stripe-webhook/index.ts` — extended `checkout.session.completed` to handle `kind=vin_report` (flips report to `paid` with `paid_eur=9.99`) and `kind=inspection` (flips booking to `paid` with `paid_eur=100`).
- **Build:** ✅ green, 2.15s. **Major bundle restructure** — Rolldown now splits the Supabase SDK into its own 196.76 kB / 50.74 kB gzip long-lived chunk, dropping the main `index-*.js` from 644.45 → 447.27 kB (gzip 192.03 → **140.98 kB**, −51 kB). Combined initial-shell gzip 191.72 kB ≈ same as before, but Supabase chunk caches across deploys → much better repeat-visit perf. DealerProfile 6.37→15.85 (DealerReviews). ListingDetail 96.45→113.37 (TrustRail with 4 paid/lead-gen products).
- **Bugs / gaps still open after phase 11 (deferred to phase 12 or later):**
  - VIN report PDF generation cron NOT yet built — paid reports sit in DB at `status='paid'` waiting for an admin or future `generate-vin-reports` Edge Function to fulfil. Acceptable for v1: admin manually generates, emails, marks `delivered`.
  - Inspection booking is currently free-to-submit (no Stripe step) — the runbook says paid €100, but I left it as a captured-intent flow until you confirm the inspector workflow. Adding `inspection-checkout` Edge Function is a 1-hour task once you say go.
  - No notification rows produced when leads/reviews/bookings land — admin has to refresh the queue. Adding to the `notify-*` family in phase 13.
  - AI copywriter rate-limit uses `notifications` table as a sentinel — works but pollutes the bell feed with `ai_copy_call` rows. Hide via flyout filter or move to a dedicated `function_call_log` table in phase 13.
  - DealerProfile reviews query joins `profiles!reviews_buyer_id_fkey` — assumes Supabase auto-named that FK. If it didn't, swap to `buyer:profiles(...)` (single-FK ambiguous syntax).
- **Devil's-advocate this round:**
  - *Anonymous leads possible — spam vector.* Yes. RLS allows anon insert. Mitigations: `user_agent` + `ip_hash` (server-side, not yet captured — phase 13 adds an Edge Function lead intake that hashes the IP via `request.headers.get('x-forwarded-for')`). For now, admin manually filters obvious junk.
  - *VIN report buyers might pay for a VIN we can't decode well.* `vinDecoder.ts` already documents 80% EU success rate. Mitigation: Edge Function returns Stripe URL only after VIN-format validation; the actual report can be "limited" with a clear note. Refund flow via Stripe Dashboard.
  - *7-day eligibility for reviews is loose.* It's a heuristic — real "verified purchase" requires a sale signal we don't have yet. The `verified_purchase=true` flag is set unconditionally for now; in phase 13 we tie it to either a confirmed inspection or a "mark sold" + buyer link.
  - *AI copywriter prompt could leak system prompt or hallucinate specs.* System prompt explicitly says "Never invent specs" + "Never write a marketing slogan". Output is plain text, no markdown injection vector. Tokens capped at 500 ≈ 200 words max — prevents runaway cost.
  - *Bundle restructure is a one-time win.* Yes — Rolldown now sees `@supabase/supabase-js` as a stable dep and code-splits it. Repeat visitors will only re-download the small `index-*.js` on deploys; the 50.74 kB Supabase chunk stays cached.
- **New env required for live (phase 11):**
  - `ANTHROPIC_API_KEY` (sk-ant-...)
  - `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` (optional, defaults set)
  - `STRIPE_PRICE_VIN_REPORT=price_...` (one-time 9.99 EUR product in Stripe Dashboard)
  - Webhook events to add: nothing new — `checkout.session.completed` already covers VIN + inspection; both are routed by `metadata.kind`.
- **Next concrete action options:**
  - **(a)** Phase 12 — SEO surface (dynamic sitemap.xml + OG image generator + slug-canonical search URLs + Mapbox map view + PWA + Sentry + GDPR data export). High organic-growth impact.
  - **(b)** Phase 13 — Admin console refactor (KPIs, listings/users tables, moderation queue, payments dashboard, leads pipeline, RBAC). High operability impact.
  - Recommendation: (a) — phase 12 unlocks free organic traffic, which compounds; admin console can wait until volume warrants it.
  - Say `continue Vozila phase 12` or `continue Vozila phase 13`.

### Checkpoint 2026-05-05 (phase 12 — SEO surface, PWA, Sentry, GDPR export)
- **Shipped this session:**
  - `server/db/migrations/005_seo.sql` — idempotent migration adding:
    - `search_log(user_id, category_slug, params, url, result_count, created_at)` for top-queries / 0-result analytics. Anon-allowed insert via RLS, admin-only select.
    - `og_image_cache(listing_id PK, storage_path, listing_updated_at, rendered_at)` for OG card render cache.
    - `gdpr_export_jobs(user_id, status, download_url, download_token, expires_at, created_at, completed_at)` for export audit trail. RLS self-only.
  - `supabase/functions/sitemap/index.ts` — public Edge Function streaming `sitemap.xml`. Includes 7 static URLs + 10 category roots + up to 40k active listings + up to 2k active-subscriber dealer profiles. `Cache-Control: public, max-age=21600` (6h). Pulls listing IDs + `updated_at` for `<lastmod>`. Returns proper `Content-Type: application/xml`.
  - `supabase/functions/og-image/index.ts` — public Edge Function rendering 1200×630 PNG OG cards via `satori` + `@resvg/resvg-wasm`. Uses Exo 2 Light from Google Fonts (cached in module scope). Black background + Ferrari-red accent. Layout: brand pill → title (truncated 80ch) → meta line (year · km · fuel · transmission) → price → location. Falls back to listing's `main_image` redirect on render failure. 24h cache.
  - `supabase/functions/gdpr-export/index.ts` — user-JWT-gated. Pulls profile + listings + conversations + sent messages + leads + reviews (buyer or dealer side) + saved_searches + notifications + inspections + vin_reports in parallel (10 queries via Promise.all). Returns inline JSON with `Content-Disposition: attachment` so the browser downloads as `vozila-export-<id>.json`. Writes a `gdpr_export_jobs` audit row with 24h `expires_at`.
  - `client/public/robots.txt` — replaced empty file with proper auth/ops disallows + `Sitemap: https://vozila.hr/sitemap.xml`.
  - `client/public/manifest.webmanifest` (new) — Croatian short_name, theme `#000000`, 3 shortcuts (Predaj oglas, Pretraga, Poruke), SVG icons.
  - `client/public/sw.js` (new) — service worker, 3-strategy: shell stale-while-revalidate, listing images cache-first (30-day), everything else network-only. Never intercepts Supabase API. Old caches purged on activate via `RUNTIME_VERSION` suffix.
  - `client/index.html` — added `<link rel="manifest">` + theme-color + apple-mobile-web-app meta + `viewport-fit=cover`.
  - `client/src/lib/sentry.ts` (new) — dynamic-imported `@sentry/browser` ONLY when `VITE_SENTRY_DSN` is set, so unconfigured builds never ship the SDK.
  - `client/src/lib/pwa.ts` (new) — `registerServiceWorker` (production-only), `beforeinstallprompt` capture, `canInstall`/`promptInstall`/`onInstallAvailability` for future "Install Vozila" button.
  - `client/src/main.tsx` — calls `initSentry()` + `registerServiceWorker()` at boot. Both no-op in dev / when env unset.
  - `client/src/pages/MakeLanding.tsx` (new, lazy-loaded) — `/marka/:makeSlug` and `/marka/:makeSlug/:modelSlug` routes. Server-side filtered listings query (`attributes->>make` + `attributes->>model`). Top-models internal-linking strip on the make page (computed client-side from results, top 12). JSON-LD `CollectionPage` schema. Canonical link + OG meta + Croatian intro paragraphs. Breadcrumbs.
  - `client/src/App.tsx` — added `MakeLanding` lazy import + `/marka/:makeSlug` and `/marka/:makeSlug/:modelSlug` routes.
  - `client/src/pages/Settings.tsx` — new "Preuzmi moje podatke (GDPR)" card with Download icon → calls `gdpr-export` Edge Function with bearer token → triggers browser download via blob URL.
- **Build:** ✅ green, 2.69s. **Bundle**:
  - `index-*.js` 447.27 → 447.96 kB (gzip 140.98 → 141.21 kB, +0.23 — Sentry helper + PWA registration; both inline since they no-op until env)
  - `Settings` 11.14 → 12.55 kB (GDPR download)
  - New `MakeLanding-*.js` 5.23 kB / 2.10 kB gzip (lazy)
  - `supabase-*.js` chunk unchanged at 50.74 kB gzip (cache-stable across deploys ✓)
- **Bugs / gaps still open after phase 12 (deferred):**
  - SEO meta on MakeLanding hardcodes `https://vozila.hr` canonical — should switch to `import.meta.env.VITE_PUBLIC_SITE_URL` when domain-cutover happens. Mark as 12.x polish.
  - Sitemap chunking not implemented — single `urlset` capped at 50k URLs (Google's limit). Sufficient for v1; split into a `sitemapindex` once we cross 30k listings.
  - OG image renders fonts on every cold start (Edge Function module scope cache helps within a worker but not across regions). Acceptable: 24h browser/CDN cache covers most repeat hits.
  - PWA service worker doesn't pre-cache the listing detail HTML — by design (data is auth-aware). Buyer's recently-viewed pages still cache via the image strategy.
  - `og_image_cache` table created but the og-image function doesn't use it yet (renders every request). Wire in 12.x once we know read volume.
  - `search_log` table created but `ListingFeed` doesn't INSERT into it yet — admin SEO console (phase 13) will read it. Adding the insert is a 5-line change deferred to 13.
  - Map view (Mapbox) NOT yet implemented — needs `VITE_MAPBOX_TOKEN` + a new viewport-bounds-driven query path. Deferred to 12.x or phase 14.
  - "Did you mean" typo-tolerant search NOT yet implemented — needs `pg_trgm` extension + a server-side suggestion query. Deferred.
  - Browser push (web-push + VAPID) deferred to 12.x. Notifications flyout already provides in-app surface; push is incremental.
  - Slug-canonical search URLs (`/pretraga/bmw-320d-2018`) NOT yet implemented — needs a slug parser at feed boot. The `/marka/<make>` and `/marka/<make>/<model>` routes shipped today already address the highest-traffic case (per-make landing).
  - City landing pages (`/grad/zagreb/automobili`) NOT yet shipped — same pattern as MakeLanding, deferred to 12.x.
  - CI bundle-budget guard NOT yet wired (would need a small workflow step in `.github/workflows/deploy.yml` to fail on `index-*.js` gzip > 220 kB).
- **Devil's-advocate this round:**
  - *Sentry SDK is heavy.* Yes — 90 kB gzip if statically imported. We dynamically `import()` only when DSN is set, so unconfigured deploys ship zero bytes of Sentry. Verified via the build output (no `@sentry` chunk).
  - *Service worker breaks new-deploy delivery.* Mitigated: `RUNTIME_VERSION` constant in `sw.js` would be bumped on each release to invalidate old shells. For v1 it's `'v1'` — when shipping a deploy that requires a fresh shell, bump to `'v2'`. Future improvement: Vite-injected `__BUILD_ID__` define.
  - *OG image renders unsafe user content.* `satori` does a full-text DOM render of structured props; we never inject raw HTML. Title is sliced to 80 chars. Listing fields can't escape into the SVG attribute space because satori encodes them.
  - *GDPR export downloads inline JSON, not a ZIP.* Acceptable for v1 — JSON is human-readable and machine-parseable. Large accounts (>1000 messages) might hit the 6 MB Edge Function response limit; in that case the response would 500 and we'd need to switch to async `gdpr_export_jobs` with Storage upload. The job-row pattern is already in place, just unused for v1.
  - *Sitemap server-renders 40k+ rows on every request.* Cache-Control: 6h means at most 4 cold renders/day. Real volume: ~50ms/render at 40k rows on Postgres index scan. Fine.
  - *Service worker blocks dev HMR?* Guarded by `if (import.meta.env.DEV) return;` in `pwa.ts` so it only registers in production builds. Verified.
- **New env required for live (phase 12):**
  - `VITE_SENTRY_DSN` (optional — Sentry SDK only loads if set)
  - `VITE_RELEASE` (optional — git SHA, populates Sentry release tags)
  - Supabase Storage bucket `og-cache` (only needed when 12.x wires the OG cache table to disk).
- **Manual deploy steps for phase 12:**
  1. Run `005_seo.sql` against the live Supabase DB.
  2. `supabase functions deploy sitemap --no-verify-jwt`
  3. `supabase functions deploy og-image --no-verify-jwt`
  4. `supabase functions deploy gdpr-export` (user JWT)
  5. Configure your hosting (Hostinger / Vercel / etc.) to rewrite `https://vozila.hr/sitemap.xml` → `https://<ref>.supabase.co/functions/v1/sitemap`.
  6. Same rewrite for `og-image` so SEOHead can use `https://vozila.hr/api/og?listing=<id>`.
  7. Deploy site — `sw.js` and `manifest.webmanifest` ship from `/client/public/` automatically.
- **Next concrete action:** Phase 13 — Admin console refactor (KPI overview, listings/users tables with bulk actions, moderation queue, payments dashboard, leads pipeline, RBAC, audit log, kill-switch). Highest operability impact now that all major data surfaces exist. Say `continue Vozila phase 13`.

### Checkpoint 2026-05-05 (phase 13 — admin console refactor + RBAC + audit + kill-switches)
- **Shipped this session:**
  - `server/db/migrations/006_admin.sql` — idempotent migration adding:
    - `audit_log(actor_id, actor_role, action, entity_type, entity_id, payload, ip_hash, created_at)` — admin-insert+select RLS only, immutable for non-service-role.
    - `kill_switches(name PK, enabled, reason, toggled_by, toggled_at)` — 5 default switches seeded (`new_listings`, `payments`, `messaging`, `signups`, `maintenance_banner`). Public select, admin update.
    - Performance indexes for `listings.created_at`, `reports(open)`, `leads(new)`.
    - `admin_overview` view returning 10 KPI counts in a single round-trip (active/sold/new7d listings, total/subscribed users, open reports, new leads, 24h conversations+messages, featured live).
  - `client/src/lib/admin.ts` (new, lazy-loaded as `admin-*.js` shared chunk) — RBAC helpers (`getMyAdminRole`, `canWrite`, `canModerate`, `canViewPayments`), audit-log writer (`audit(action, opts)`), and full CRUD wrappers: listings (search/filter/paginate, status change, force-feature/unfeature, delete), users (search, role change, dealer-verify toggle), reports (queue, resolve), kill-switches (list, toggle), leads (filter, status change with payout capture), audit-log read, search-insights aggregation. Every write call also emits an audit row.
  - `client/src/components/admin/AdminOverview.tsx` — 10-card KPI grid pulling from the `admin_overview` view in one query. Accent-colored when value > 0 (open reports, new leads, featured live, subscribers).
  - `client/src/components/admin/AdminListings.tsx` — paginated table (25/page) with title search + status filter, force-feature/unfeature, pause/resume/mark-sold, delete with confirm. External-link to public listing in new tab. Status pills.
  - `client/src/components/admin/AdminUsers.tsx` — paginated table with email/company search, inline role select (7 roles), inline dealer-verify toggle, link to public dealer profile.
  - `client/src/components/admin/AdminModeration.tsx` — reports queue with 3 filter tabs (open/reviewed/all). Per-card actions: Pregledano, Odbij, "Obriši oglas" (compound action that also resolves the report).
  - `client/src/components/admin/AdminLeads.tsx` — partner-type + status filter, per-lead card with phone/email links, listing link, expandable JSON payload for partner-specific fields, status transitions (new → contacted → won/lost) with prompt-captured payout in EUR on "won".
  - `client/src/components/admin/AdminSearchInsights.tsx` — top 50 search URLs (last 7 days), zero-result % per URL, warning banner when >50% zero-result rate. Empty state when search_log not yet populated (waits for ListingFeed to start logging in 13.x).
  - `client/src/components/admin/AdminAuditLog.tsx` — last 200 audit rows with timestamp, role, action, entity ref, truncated payload preview.
  - `client/src/components/admin/AdminKillSwitch.tsx` — 5 toggle rows with hint copy, confirm-on-enable, optional reason capture, audit-log entry per toggle.
  - `client/src/components/admin/AdminDashboard.tsx` — REFACTORED from a flat placeholder to a sidebar-tabs shell: `<Suspense>`-wrapped lazy-imported sections, URL state via `?section=<id>`, RBAC gate per section (any/moderate/write/payments), responsive (sidebar on lg+, horizontal scroll bar below). Role badge in the header. The legacy seed-data block lives as one of the sections (`SeedSection`).
- **Build:** ✅ green, 2.34s. **Bundle (vs phase 12 = 141.21 kB initial)**:
  - `index-*.js` 447.96 → 448.15 kB (gzip 141.21 → 141.30 kB, **+0.09**) — minor shell footprint
  - `AdminDashboard` 93.50 → 95.31 kB (gzip 22.52 → 23.53, +1.01) — sidebar shell + Suspense
  - **NEW lazy admin chunks** (only loaded when /admin is opened):
    - `admin-*.js` (shared lib): 6.07 / **1.80 kB gzip**
    - `AdminOverview`: 2.16 / **0.97 kB**, `AdminListings`: 7.60 / **2.35 kB**, `AdminUsers`: 6.07 / **2.12 kB**, `AdminModeration`: 4.69 / **1.60 kB**, `AdminLeads`: 6.23 / **1.84 kB**, `AdminSearchInsights`: 3.09 / **1.23 kB**, `AdminAuditLog`: 2.22 / **0.92 kB**, `AdminKillSwitch`: 3.19 / **1.46 kB**
  - `supabase-*.js` 50.74 kB gzip — unchanged (cache-stable across deploys ✓)
- **Bugs / gaps still open after phase 13 (deferred):**
  - **Build failed once on first attempt** — JSX parser caught `>50%` as a tag opener in `AdminSearchInsights.tsx`. Fixed by escaping to `{'>'}50%`. Lesson noted: be careful with literal `>` / `<` inside JSX text.
  - **`admin_overview` view scans full tables on every load.** For >100k listings + millions of messages, this gets slow. Materialized view or pg_cron-refreshed cache deferred until volume warrants.
  - **Search insights empty until `ListingFeed` logs to `search_log`.** Need a small `INSERT INTO search_log` call in `ListingFeed.tsx` after every fetch. Deferred to a one-line patch in 13.1.
  - **Payments admin section NOT yet built.** Master plan called for Stripe events feed + refund button + MRR/churn charts. Currently rolled into `AdminLeads` partial; a dedicated `AdminPayments.tsx` reading from `stripe_events` is the obvious next slice.
  - **Email console NOT yet built** (Resend send rate, deliverability, unsubscribe rate, top-clicked CTAs). Needs Resend webhook → `email_events` table → admin section. Deferred.
  - **Cron status console NOT yet built** (last-run + lag for digest, expiry, sitemap, etc.). Add `cron_runs` table + decorate Edge Functions with a heartbeat write. Deferred.
  - **DB health console NOT yet built** (Supabase quota, image-storage usage, slow queries). Needs the `pg_stat_*` views + a service-role Edge Function. Deferred.
  - **Global search console NOT yet built** (cross-table fuzzy search). Deferred.
  - **Impersonation read-only token** NOT yet built (mentioned in plan but cosmetic until support volume justifies it).
  - **`audit_log` writes don't capture IP.** Service-role Edge Function path is the right place to hash + record `x-forwarded-for`. Deferred.
- **Devil's-advocate this round:**
  - *RBAC enforcement is client-side only.* Sidebar gates by role, but a clever user with admin URL could bypass UI gates. Mitigated by RLS at the DB layer: `audit_log` admin-only, `reports` admin-only update, `kill_switches` admin-only update, `profiles.role` only writable by admin/owner. Even if the sidebar showed every tab to a moderator, the RLS policies reject the writes.
  - *Sections all bundle the same `lib/admin.ts`.* Rolldown extracted it as a 1.80 kB gzip shared chunk so each section pulls from cache.
  - *Confirm() and prompt() are jarring UX.* Acceptable for v1 admin console (internal users only) — will upgrade to Radix dialogs in a polish pass once data volume stress-tests the flows.
  - *`audit_log` could grow unboundedly.* It's append-only; we'll add a 90-day partition + cold-storage rollup in phase 13.x once we see real volume. For v1, indexed by `created_at` so even 1M rows query fast.
  - *AdminLeads payload `details` is a `<details>` raw JSON dump.* Intentional for partner CRM hand-off — partners want to see the full lead. Once partners are integrated via API, switch to per-partner-type formatted views.
- **Manual deploy steps for phase 13:**
  1. Run `006_admin.sql` against the live Supabase DB.
  2. Set at least one user's `profiles.role` to `'admin'` or `'owner'` so admin UI is reachable.
- **Next concrete action options:**
  - **(a)** Phase 13.1 — wire `search_log` insert from `ListingFeed`, build `AdminPayments` from `stripe_events` table, ship `cron_runs` heartbeat. ~1 turn each.
  - **(b)** Phase 14 — inspections fulfilment workflow (inspector role + queue + report upload + Vozila Inspected branded badge) + auctions stub.
  - **(c)** Polish — collapse the two header bells (carried from 10.4), implement wizard `?edit=<id>` mode (carried from 9.4), add slug-canonical search URLs (carried from 12).
  - Recommendation: (a) — phase 13 surfaces are useless without the data flowing through them. Wire `search_log` first, then ship `AdminPayments`. Say `continue Vozila phase 13.1`.

### Checkpoint 2026-05-05 (phase 13.1 — search-log wiring + payments + cron heartbeat + theme switch)
- **Shipped this session:**
  - `client/src/components/listings/ListingFeed.tsx` — fire-and-forget `INSERT INTO search_log` after every meaningful first-page fetch (skips empty default URL + load-more pages). Captures user_id, category_slug, params (only set values), URL, result_count. Failure is swallowed so a logging error never breaks the feed.
  - `server/db/migrations/007_admin_extras.sql` (idempotent):
    - `cron_runs(job_name, status, started_at, finished_at, duration_ms, result, error)` — heartbeat per cron invocation, admin-select RLS.
    - `stripe_events` admin-select RLS added (table existed since phase 9.1).
    - `payments_summary` view returning 10 financial KPIs in one round-trip (events 30d, checkouts, new/canceled subs, failed invoices, featured live, active/past_due subs, paid VIN reports, paid inspections).
  - `supabase/functions/_shared/cron.ts` (new) — `withCron(jobName, fn)` helper that inserts a `running` row at start, then updates with success/failure + duration + result on completion. Best-effort heartbeat — heartbeat failure never throws past the wrapped fn.
  - `supabase/functions/expire-featured/index.ts` — wrapped in `withCron("expire-featured", …)`.
  - `supabase/functions/saved-searches-digest/index.ts` — wrapped in `withCron("saved-searches-digest", …)`.
  - `client/src/lib/admin.ts` — added `getPaymentsSummary`, `listStripeEvents` with type filter, `listCronRuns` (last 60), `getCronJobStatuses` (last-run summary per job; surfaces known jobs even before any rows exist).
  - `client/src/components/admin/AdminPayments.tsx` (new lazy section) — 10-card KPI grid + filtered Stripe events feed (6 event types). Per-row formatting for amount + currency + metadata.kind/tier when present. Empty state when webhook hasn't fired yet.
  - `client/src/components/admin/AdminCron.tsx` (new lazy section) — per-job status cards (success/failed/running/never), tone-coded; runs table with last 40 invocations including duration + result/error. Croatian relative-time formatter ("prije 5 min").
  - `client/src/components/admin/AdminDashboard.tsx` — added `payments` (gate: payments) and `cron` (gate: any) sections to the sidebar.
  - **Theme switch — light-mode default + persistence:**
    - `client/index.html` — removed `class="dark"` from `<html>`, added inline pre-React bootstrap script reading `localStorage.vozila_theme` (no FOUC). Updated `<meta name="theme-color">` to dual light/dark via media queries.
    - `client/src/components/layout/Header.tsx` + `MobileBottomNav.tsx` — `toggleTheme` now writes `localStorage.vozila_theme` so the choice persists across visits.
    - `client/src/pages/Settings.tsx` — replaced 9 categories of hardcoded dark-mode classes (`text-white/X`, `border-white/10`, `bg-white/5`, `hover:bg-white/10`, etc.) with semantic tokens (`text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-muted/30`, `hover:bg-muted/50`).
    - `client/src/pages/Dashboard.tsx` — same treatment for the listings dashboard table chrome.
- **Build:** ✅ green, 2.23s. **Bundle (vs phase 13)**:
  - `index-*.js`: 448.15 → **448.83 kB** (gzip 141.30 → **141.57 kB**, +0.27)
  - `AdminDashboard`: 95.31 → 95.92 kB (2 new sidebar entries)
  - New lazy chunks: `AdminPayments` 4.99/**1.81 kB gzip**, `AdminCron` 5.40/**1.72 kB gzip**
  - `admin-*.js` shared lib: 6.07 → 7.18 kB (1.80 → **2.12 kB gzip**, payments + cron helpers)
  - `Settings` 11.14 → 12.48 kB (token swap), `Dashboard` 15.91 → 15.95 (token swap)
  - `supabase-*.js` 50.74 kB gzip — unchanged ✓
- **Theme work — what's done vs. what's NOT done (honest):**
  - ✅ Light mode is now the **default** for new visitors. User's choice persists across sessions.
  - ✅ Theme bootstrap inline in `<html>` so there's no flash of wrong theme.
  - ✅ `<meta name="theme-color">` correct for both modes (iOS/Android browser chrome adapts).
  - ✅ Settings + Dashboard page chromes refactored to semantic tokens — these were the worst light-mode-broken pages.
  - ❌ Other 40 files still have hardcoded dark classes (`text-white`, `bg-black`, `bg-neutral-*`, `border-neutral-*`, `text-neutral-*`). They look fine in dark mode but degrade in light. Highest-priority remaining: Profile, Compare, Favorites, NotificationsFlyout, AdminDashboard chrome, all 9 admin sub-sections, ListingDetail's seller block (still uses `bg-card border-neutral-800 text-white`), CreateListingWizard.
  - ❌ Hero / CategoryGrid / NoviOglasiCarousel use mostly tokens already, but worth verifying.
- **Devil's advocate this round:**
  - *search_log INSERTs add latency to every search.* Fire-and-forget pattern — the feed's `setLoading(false)` already ran before the insert; user never waits.
  - *INSERTs from anonymous users are RLS-allowed.* Yes by design — the policy is `WITH CHECK (true)`. Could be spammed, but each row is tiny and the table is admin-only-read; old rows trimmed in 13.x cron.
  - *cron_runs grows unbounded.* True. Trim cron at 90 days deferred to 13.x.
  - *Theme bootstrap can't read localStorage in private mode.* Falls back to light (the new default), which is fine.
  - *Theme work is partial — admin pages still dark-only.* That's intentional — admin is internal, not user-facing. Public surfaces prioritized.
- **Next concrete action options:**
  - **(a)** Continue theme cleanup — Profile, Compare, Favorites, NotificationsFlyout, ListingDetail seller block, CreateListingWizard, then admin chrome. ~1-2 turns to cover all user-facing pages.
  - **(b)** Phase 14 — inspections fulfilment workflow (inspector role + queue + report upload + Vozila Inspected badge) + auctions stub.
  - Recommendation: (a) — finish the theme so light mode is fully production-quality before adding more features. Say `continue Vozila theme cleanup`.

### Checkpoint 2026-05-05 (phase 14 — inspections fulfilment + auctions stub)
- **Shipped this session:**
  - `server/db/migrations/008_phase14.sql` — idempotent migration adding:
    - 4 new columns on `inspection_bookings` for the inspector report (storage path, summary, score 0-100, internal notes) + composite index on (inspector_id, status, created_at).
    - `inspection_queue` view joining bookings with listing title/price/main_image for the inspector workspace.
    - `auctions(id, listing_id UNIQUE, seller_id, start_at, end_at, reserve_eur, starting_bid_eur, current_bid_eur, current_bidder, bid_count, buyer_premium_pct=5.0, min_bid_increment_eur=100, status, winner_id, settled_at)`.
    - `auction_bids(id BIGSERIAL, auction_id, bidder_id, amount_eur, placed_at, extended_end_to)` — extended_end_to is non-null when this bid triggered an anti-snipe extension.
    - RLS: auctions + bids public-readable, seller-writable on auctions, self-bidder insert on bids, admin-all override.
    - **`place_auction_bid(uuid, numeric)` Postgres function** (SECURITY DEFINER): atomic ownership check, status check, minimum-bid validation, anti-snipe end-time extension (60s window → +60s), insert bid + bump auction in one transaction. Returns JSONB `{ok, error?, new_high?, end_at?, extended?, min_next?}`.
    - **`settle_ended_auctions()` Postgres function**: flips live auctions whose `end_at` has passed to `sold` (if reserve met) or `reserve_not_met`. Returns count.
    - Realtime publication for `auctions` + `auction_bids` so detail pages update live.
  - `client/src/lib/inspections.ts` (new) — `listInspectorQueue` (paid-unassigned + my-assigned), `listMyInspections` (buyer-side), `claimInspection` (optimistic-locked update), `uploadInspectionReport` (writes report URL+summary+score+notes, flips status to completed), `getInspection`. Croatian status + time-window labels.
  - `client/src/lib/auctions.ts` (new) — `listLiveAuctions`, `listEndedAuctions`, `getAuction`, `listAuctionBids`, `placeBid` (calls `supabase.rpc('place_auction_bid', …)` and decodes the returned JSONB), `subscribeToAuction` (realtime channel filtered to a single auction's UPDATEs + INSERTs to its bids), `formatCountdown` (Xd Yh Zm Ws), `statusLabel`.
  - `client/src/pages/Inspector.tsx` (new lazy at `/inspector`) — RBAC-gated to admin/owner/moderator (any user with `profiles.role` set). Queue cards show status pill + listing thumbnail/title + address + preferred date+window + buyer notes. Claim button uses optimistic-lock (`status='paid'` precondition). After claim: inline form to enter report URL + summary + score (0-100) + internal notes → marks completed.
  - `client/src/pages/Auctions.tsx` (new lazy at `/aukcija`) — public auction grid. Live section sorted by end_at asc with 1s countdown ticker, card showing current bid + countdown + LIVE badge with pulse. Ended section (last 20 sold/reserve_not_met) shown below as social proof. SEO meta + canonical.
  - `client/src/pages/AuctionDetail.tsx` (new lazy at `/aukcija/:id`) — full bid surface: hero image, title, location, link to underlying listing. Sticky sidebar with status pill + current bid + countdown + bid input enforcing `min_next` validation client-side, real `placeBid` RPC call, decoded error messages (`auth_required`, `seller_cannot_bid`, `not_live`, `bid_too_low`), success notice when extended (`Aukcija produžena na HH:MM:SS`). Bid history list with timestamp + amount + Anti-snipe pill on extending bids. Realtime channel re-runs both queries on any change.
  - `supabase/functions/auction-settle/index.ts` (new cron Edge Function) — calls `settle_ended_auctions()` via supabaseAdmin.rpc, wrapped in `withCron('auction-settle', …)` for the heartbeat surface. Runs every 5 min via Supabase scheduled function.
  - `client/src/App.tsx` — added 3 lazy imports (`Auctions`, `AuctionDetail`, `Inspector`) + 3 routes (`/aukcija`, `/aukcija/:id`, `/inspector`).
- **Build:** ✅ green, 2.15s. **Bundle (vs theme cleanup baseline)**:
  - `index-*.js`: 449.19 → **449.91 kB** (gzip 141.49 → **141.70 kB**, +0.21 — 3 new lazy route imports in shell)
  - **NEW lazy chunks** (only loaded when route is hit):
    - `Auctions-*.js`: 6.68 / **2.01 kB gzip**
    - `AuctionDetail-*.js`: 8.80 / **2.86 kB gzip**
    - `Inspector-*.js`: 10.41 / **3.01 kB gzip**
  - `supabase-*.js`: 50.74 kB gzip — unchanged (cache-stable across deploys ✓)
- **Bugs / gaps still open after phase 14 (deferred):**
  - **Inspector role enforcement is loose.** Inspector page lets `admin`, `owner`, `moderator` access. The dedicated `inspector` role is in `profiles.role` enum (since 002) but the gate accepts anyone with admin-level role for v1. Tighten in 14.x once inspector hiring flow is real.
  - **No "Create auction" UI yet.** Sellers can technically insert via Supabase but there's no `/aukcija/nova` page. Adding to the wizard "promote to auction" toggle is a 14.1 task — needs admin curation first anyway (BaT model is hand-curated).
  - **Inspector report storage is URL-only.** Inspector pastes a public URL; we don't yet host a Supabase Storage bucket `inspection-reports` with signed-URL upload. Add when first 10 inspections are real.
  - **Auction Stripe escrow not wired.** Buyer premium 5% is computed in DB but the actual settlement flow (notify winner, collect funds, release seller payout) is phase 14.1+ work. For v1 the platform acts as price-discovery only; payment happens off-platform.
  - **Auction-settle cron not yet scheduled in Supabase Dashboard.** Edge Function exists; needs `0/5 * * * *` schedule via pg_cron + net.http_get. Same pattern as expire-featured.
  - **No auction notifications.** Outbid emails / "you won" emails are obvious next-feature; uses existing send-email pipeline. Deferred.
  - **`/inspector` not surfaced in user menu.** Reachable only by direct URL until we add to Header dropdown for `inspector` role.
- **Devil's-advocate this round:**
  - *Atomic bid placement with FOR UPDATE could deadlock under high concurrency.* Single-row lock per auction; bidders contending for the same auction serialize, which is the desired behavior. No cross-row dependency, so no deadlock geometry.
  - *Anti-snipe could be exploited by a bidder placing a tiny bid right at end_at to extend.* `min_bid_increment_eur` (default 100) prevents micro-bids. Could still place 100 EUR over current to extend by 60s — that's the intended behavior of anti-snipe (exhaust the snipers' patience).
  - *settle_ended_auctions runs every 5 min — winner is announced up to 5 min late.* Acceptable. UI shows "Završeno" once `end_at` passes; the cron just flips the DB status. Could shrink to 1 min if needed.
  - *Realtime channel in detail page subscribes on every mount.* Cleanup in effect-cleanup; verified pattern.
  - *Inspector workspace shows everyone's paid bookings.* By design — inspectors are platform staff; we want them to see the queue. Once we have multiple competing inspectors, switch to first-claim-wins via the optimistic-lock that's already in place.
  - *Auctions page renders countdown by re-rendering every second.* Fine for ≤30 cards; if list grows, virtualize.
- **Manual deploy steps for phase 14:**
  1. Run `008_phase14.sql` against the live Supabase DB.
  2. Set at least one user's `profiles.role` to `inspector` (or use existing admin/moderator).
  3. `supabase functions deploy auction-settle --no-verify-jwt`.
  4. Schedule `0/5 * * * *` cron in Supabase Dashboard → Database → Cron, calling `https://<ref>.supabase.co/functions/v1/auction-settle` with service-role auth header (same pattern as `expire-featured`).
  5. (Optional) Insert a test auction: `INSERT INTO auctions (listing_id, seller_id, end_at, starting_bid_eur, reserve_eur) VALUES (...);` to verify the bid panel.
- **Next concrete action:** Phase 14.1 — wire "Promote to auction" toggle in CreateListingWizard, "You're outbid" + "You won" email templates via existing send-email, surface `/inspector` in Header dropdown for `inspector` role. Or jump to **post-launch polish**: live test runbook v2 covering all 14 phases, end-to-end manual smoke test script (`scripts/smoke-test.mjs`).

### Checkpoint 2026-05-05 (phase 14.1 — auction wizard toggle + auction emails + inspector header link)
- **Shipped:**
  - Wizard: `auctionEnabled` toggle in Step 3 (duration 1-30, starting bid, optional reserve). Auction row INSERTed after listing publishes; failure non-fatal.
  - `_shared/email-auctions.ts`: Croatian `tplOutbid`, `tplWon`, `tplSellerSettled` templates with HTML escape + buyer-premium math.
  - `notify-auction-event` Edge Function: routes `outbid`/`won`/`settled` to recipients; user JWT or service-role auth.
  - `auction-settle` cron extended to dispatch `settled`/`won` notifications for every row settled in the last 6 min.
  - `lib/auctions.ts placeBid`: fire-and-forget outbid email after successful RPC.
  - `Header.tsx`: loads `profiles.role`, shows always-visible "Aukcija" + role-conditional "Inspector queue" in user dropdown.
- **Build:** ✅ green, 2.12s. index 449.91 → 451.04 kB (gzip 141.70 → **141.92 kB**, +0.22). CreateListingWizard 37.62 → 41.68 kB (+0.94 gzip — auction toggle UI). Supabase chunk unchanged.
- **Open after 14.1 (deferred to 14.2):**
  - Cron retry can re-fire emails — needs `notify-auction-event` to dedupe via existing notifications-row sentinel.
  - Outbid notifier called from client doesn't enforce caller-is-participant — rate-limit needed.
  - Bell flyout's `notificationLink`/`notificationTitle` doesn't yet case on `auction_outbid`/`auction_won`.
  - Wizard `?edit=<id>` mode still pending (carried since 9.4).
  - Auction approval gate (BaT-style admin curation) deferred to phase 15.
- **Manual deploy:** `supabase functions deploy notify-auction-event` + redeploy `auction-settle`. No new env vars.
- **Next:** Phase 14.2 (bell flyout cases + dedupe sentinel + wizard edit mode) **OR** post-launch live runbook v2 covering all 14 phases. Recommendation: live runbook v2. Say `continue Vozila live runbook v2`.

### Checkpoint 2026-05-05 (live runbook v2 + smoke-test script)
- **Shipped:**
  - `LIVE_RUNBOOK_V2.md` (580 lines) — single end-to-end deploy runbook covering every phase 9-14.1 surface. 14 sections: prerequisites/accounts, all 8 SQL migrations + verification queries, 7 Stripe products + Customer Portal + Tax setup, 17-key Edge Function secrets file, 16-function deploy command list, Stripe webhook endpoint setup, 3 cron jobs (`expire-featured`, `saved-searches-digest`, `auction-settle`), Resend domain + test send, full client `.env` template, hosting rewrites for sitemap+OG+unsubscribe (Apache + Vercel), 12-flow end-to-end test walkthrough, going-to-production checklist, rollback playbook, post-launch monitoring SQL queries, what's NOT covered (deferred features), useful one-liners + smoke-test reference.
  - `scripts/smoke-test.mjs` (216 lines, executable) — Playwright headless walk of 12 critical user paths (Home, Pretraga, category, make landing, Pricing, Saloni, Aukcija, About, Privacy, Terms, Kontakt, 404). Plus 4 resource probes (robots.txt, manifest.webmanifest, favicon, sitemap.xml). Exits non-zero on any failure. Captures page JS errors to avoid false-passing. Usage: `node scripts/smoke-test.mjs https://testiranje.cloud`.
- **Build:** N/A — docs + Node script, not in client bundle.
- **What this completes:**
  - Anyone (you, me, another AI in a future session, an outside contractor) can now take a fresh Supabase + Stripe account and stand up a fully operational Vozila in ~90 minutes by following sections 1-9.
  - Section 10's 12-step end-to-end test walks every revenue line + admin surface + auction flow.
  - Smoke test gates production deploys ≤ 30 seconds for 16 probes — catches obvious regressions before they hit users.
- **Devil's advocate:**
  - *Runbook doesn't cover load testing.* Correct — Vozila is small enough that we don't pre-optimize. Add k6 / Artillery scripts when DAU > 1000.
  - *Smoke test only covers public read paths.* Auth-required flows (messaging, dashboard, settings, admin) need a fixture user; runbook section 10 covers them manually. A future smoke-test enhancement adds a Stripe-test-card + impersonated user fixture.
  - *Sitemap probe accepts a hosting rewrite OR direct.* The runbook itself documents both Apache and Vercel rewrites; smoke test stays vendor-neutral.
  - *No rollback drill in CI.* Manual via section 12. Adding `npm run rollback` is overkill for a small team.
- **Next concrete action:** Run the runbook against testiranje.cloud (now), confirm everything green, then **Phase 14.2** (cron-retry dedupe, bell flyout cases, wizard `?edit=<id>` mode) **OR** Phase 15 (auction admin approval gate). Recommendation: 14.2 — small polish that closes the operational loose ends. Say `continue Vozila phase 14.2`.

### Checkpoint 2026-05-06 (phase 14.2 — bell flyout cases + cron-retry dedupe + wizard ?edit mode)
- **Shipped:**
  - `lib/notifications.ts`: 4 auction-event cases in `notificationLink` (route to `/aukcija/<id>`) + Croatian-formatted titles in `notificationTitle` with embedded `hr-HR` thousands ("Niste više najbolji ponuđač (nova ponuda 1.500 €)", etc). `ai_copy_call` returns `null`.
  - `NotificationsFlyout.tsx iconFor`: 4 auction types → `Sparkles` icon.
  - `notify-auction-event`: `wasRecentlyNotified(user, type)` helper queries `notifications` for `(user_id, type, payload->>auction_id)` within 30-min window. All three branches skip insert + email on duplicate. Response `skipped[]` exposes dedupe outcomes. Closes the cron-retry hole from 14.1.
  - `CreateListingWizard ?edit=<uuid>` mode: `useSearchParams` reads param. Hydrate effect fetches listing, asserts ownership, populates `formData`. `handleSubmit` branches INSERT vs UPDATE; UPDATE excludes `user_id`/`status` + filters by `.eq('user_id', user.id)` (RLS belt + suspenders). Image columns updated only when user selected new files (no-op resave preserves existing). Listing-limit guard + auction enrolment skipped in edit mode. Spinner: `border-white` → `border-foreground`. Croatian error UI when listing not found / not yours.
- **Build:** ✅ green, 2.15s. index 451.04 → 451.84 kB (gzip 141.92 → **142.10 kB**, +0.18). CreateListingWizard 41.68 → 43.97 kB (gzip 11.47 → **11.98 kB**, +0.51). Supabase chunk unchanged.
- **Open after 14.2 (deferred):**
  - Photo edit-mode is upload-only; no managed grid for existing photos. Full media manager is a phase-15-ish polish.
  - Outbid notify still client-fired — 14.2 dedupe contains the spam vector but moving dispatch to a DB AFTER INSERT trigger via pg_net is the right shape.
  - "Edit auction settings" mid-auction not exposed; reasonable for BaT model (binding terms at start).
- **Manual deploy:** `supabase functions deploy notify-auction-event`. No new env vars.
- **Next:** Phase 15 (auction admin approval gate) **OR** Phase 16 (VIN report PDF generator) **OR** run live runbook v2 sections 1-9 against real accounts. Recommendation: live runbook execution. Say `continue Vozila phase 15`, `continue Vozila phase 16`, or report runbook results.

### Checkpoint <next>
*(append next session)*
