# Vozila.hr — Devil's Advocate Audit (vs original master plan + avto.net)

**Date:** 2026-05-06
**Goal:** "avto.net just beautiful and way more functional and polished."
**Method:** I re-read `MASTER_PLAN.md` (the original idea), inventoried every shipped surface, and compared against avto.net's actual feature set as a Croatian buyer would experience it. I'm calling out **bugs, inconsistencies, and missing features** — not "future polish." If something is broken or visibly inferior to avto.net, it's in this doc.

This is the file you read before deciding what to fix next. I'm not patching anything until you pick.

---

## Section A — Real bugs (broken or wrong, not just "incomplete")

### A1. **Two different listing wizards live side-by-side**
- **Files:** `client/src/pages/ListingWizard.tsx` (legacy, 850 LOC) AND `client/src/components/listings/CreateListingWizard.tsx` (current, 1100 LOC).
- **Routes:** `/predaj-oglas` → `<ListingWizard>` (legacy), `/create-listing` → `<CreateListingWizard>` (current).
- **What's broken:** The legacy wizard at `/predaj-oglas` doesn't have phase 9.1's `user_id` fix, doesn't have phase 9.4's listing limits, no VIN quick-fill, no AI copywriter, no auction toggle, no `?edit=<id>` mode. **Sellers landing on `/predaj-oglas` (the link from Header + MobileBottomNav + everywhere) still hit the broken legacy code.**
- **Severity:** **Critical.** This is the seller flow. Half the platform's funnel runs through a wizard that's missing 8 phases of work.
- **Fix:** Point `/predaj-oglas` at `CreateListingWizard`, delete `ListingWizard.tsx`. ~5 lines + 1 file delete.

### A2. **Two different ListingCards live side-by-side**
- **Files:** `client/src/components/listing/ListingCard.tsx` (162 LOC, used by some grids) AND the inline `ListingCard` exported from `client/src/components/listings/ListingFeed.tsx` (used by feed + dealer profile + similar-vehicles).
- **Inconsistency:** The standalone `ListingCard` doesn't have phase 9.4's tier-coloured `VerifiedDealerBadge`, doesn't have the matchScore pill, and renders different aspect ratio (16:9 vs 5:4). Side-by-side they look like different products.
- **Severity:** **Visible inconsistency** — affects buyer perception of the site as polished.
- **Fix:** Delete the standalone, route everything through the feed export.

### A3. **`/dashboard` and `/admin` still render with hardcoded dark classes**
- The polish theme cleanup hit 28 user-facing files but **AdminDashboard, all 11 admin sections, and the dashboard table chrome still have `text-white`, `bg-card border-neutral-800`, `text-white/40`** etc.
- Users on light mode hitting `/admin` see white-on-white cells.
- **Severity:** **Light-mode broken** for admins + sellers using the dashboard.

### A4. **Dev fallback in InspectionBookingButton silently no-ops**
- Phase 17 added a "if `VITE_SUPABASE_FUNCTIONS_URL` missing, just close modal" fallback.
- **What's broken:** A misconfigured production deploy (env unset) silently swallows the booking. Modal closes, user thinks it worked, no row inserted, nothing emailed, no Stripe charge.
- **Fix:** In production, missing env should show an explicit error, not silently succeed.

### A5. **`stripe-webhook` `kind=inspection` uses booking_id from metadata, but `create-inspection-checkout` writes `stripe_session_id` AFTER session creation**
- Race window: webhook can fire before the `UPDATE inspection_bookings SET stripe_session_id = ...` lands.
- **Mitigation already in place:** webhook keys off `metadata.booking_id` not session_id, so the race is harmless. **Inconsistency:** the runbook says session_id is the join key. Doc-vs-code drift.

### A6. **VinReportButton calls `vin-report-checkout`, no longer `create-boost-checkout`**
- ✅ correct. False alarm — left in audit notes for completeness.

### A7. **DealerProfile RLS allows reading any dealer's email**
- `DealerProfile.tsx` queries `users` table directly with `email` — exposes the seller's email to anyone who knows the slug.
- Email is a primary spam target. avto.net hides the email behind a contact form.
- **Severity:** **Privacy concern** + spam vector.
- **Fix:** Stop querying `users` table; use `profiles.company_name` only. Email goes through messaging.

### A8. **Two notification bells in the Header**
- Phase 10.3 added `<NotificationsFlyout>`. Phase 10.1 already had `<NotificationsBell>`. Both are mounted side-by-side in Header.tsx. Two icons that do almost the same thing, with different unread counts (one counts conversations, one counts notifications).
- **Severity:** **Confusing UX** — buyers wonder why two bells.
- **Fix:** Drop `<NotificationsBell>`, keep `<NotificationsFlyout>` (which already includes the message-quick-link tile).

### A9. **`Hero.tsx` references `/img/placeholder-car.jpg`**
- Hardcoded fallback that may or may not exist in `public/img/`. If missing, hero shows a broken image icon on the most visible page.
- **Fix:** verify the file exists, or swap to an existing real image.

### A10. **No PWA build verification**
- Phase 12 shipped a service worker but never tested it. The `RUNTIME_VERSION = 'v1'` constant has not been bumped on any deploy since. Returning users may be running stale shells.
- **Fix:** Bump `RUNTIME_VERSION` on every meaningful release, OR replace with a Vite-injected build hash.

---

## Section B — Inconsistencies (technically working, but feel wrong)

### B1. **Saved search is half-localStorage, half-DB**
- localStorage path stays for anonymous users; DB path activates for signed-in users via `setEmailAlertDb`. But the SavedSearchesBar reads from localStorage only. Toggle email-alert on a search saved while signed-out → upsertion happens, but the row's `params` reflect the URL at toggle-time, not save-time.
- **Severity:** Edge-case correctness. Will produce surprising digest emails.
- **Fix:** When user signs in, migrate localStorage saved searches to DB once.

### B2. **`Pricing` page CTAs use `useSearchParams` for `?sub=cancel` but Settings uses `?sub=success`**
- Both work; just feel like two different conventions in the same codebase.
- **Fix:** consolidate URL convention into a `lib/checkoutReturnUrls.ts`.

### B3. **Croatian error messages mixed with English in admin code**
- Public-facing pages: Croatian. Admin sections: half Croatian (`Razlozi otkazivanja`, `Plaćanja`), half English (`status`, `expired`, error messages from Supabase).
- avto.net's admin (if you've ever seen it leaked) is fully Croatian.
- **Severity:** Polish.
- **Fix:** wrap Supabase error messages with a Croatian translator at lib boundary.

### B4. **Notifications type-strings live in 3 places**
- `notify-auction-event` writes `auction_outbid`. `lib/notifications.ts` cases on the literal string. `NotificationsFlyout` cases on the literal string. Drift risk.
- **Fix:** export a `NotificationType` union from one shared module.

### B5. **`vin_reports.status` values are inconsistent with `inspection_bookings.status`**
- VIN: `pending | paid | generating | delivered | failed`
- Inspection: `pending | paid | assigned | completed | canceled`
- Two parallel paid-product lifecycles, two different vocabularies. Admin reading both has to remember which is which.
- **Fix:** Document in `MASTER_PLAN_V2.md`. Not worth migrating data.

---

## Section C — Missing features that avto.net has (and we don't)

These are the gaps a Croatian buyer notices on day one. Sorted by what would make us look amateur next to avto.net.

### C1. **Saved searches with named filters in URL bar**
- avto.net: `https://www.avto.net/Ads/results.asp?znamka=BMW&model=320&...` — readable, shareable, indexable.
- Vozila: `/pretraga?make=BMW&model=320` — works, but the `MakeLanding` SEO page only kicks in for `/marka/<make>` not `/marka/<make>-<model>-<year>-<price>`.
- **Fix:** Slug-canonical search URLs (already on the deferred list since phase 12).

### C2. **Per-vehicle equipment list with checkboxes**
- avto.net every listing has 60+ equipment checkboxes (Climatronic, Tempomat, Bi-Xenon, ALU 18", parking sensors, lane assist…). Buyer filters on these: "show me only BMWs with adaptive cruise control."
- Vozila: `attributes.equipment` is a free-text JSONB array, no controlled vocabulary, no filter UI.
- **Severity:** **Major missing feature.** A buyer who wants "automatic + leather seats + sunroof" has to scroll every result.
- **Fix:** controlled equipment taxonomy (~60 standard items) + multi-select filter sidebar tile + render on listing detail as 3-column checked-grid.

### C3. **Recently-viewed across devices**
- avto.net: signed in, your "Last seen" persists across devices.
- Vozila: localStorage only. Sign in on phone, lose it on laptop.
- **Fix:** Mirror to `recently_viewed(user_id, listing_id, viewed_at)` table for signed-in users.

### C4. **Dealer-side bulk import via XML feed**
- avto.net: dealers upload CSV/XML once, daily sync from their DMS.
- Vozila: `CSVImportModal` exists but the XML-feed pull cron mentioned in phase 11 is NOT shipped. Dealers with 50+ cars have to manually upload one CSV each day.
- **Severity:** Without this, no real dealer will use Vozila — they have IkePlus, oloxx, AutoLine integrations elsewhere.

### C5. **"Find similar" by clicking attribute on a listing detail**
- avto.net: click "Diesel" on a listing → search of all Diesels, pre-filtered. Click "BMW" → all BMWs.
- Vozila: spec cells on detail page are static text.
- **Severity:** **Major UX gap.** Buyer's discovery loop is shorter on avto.net.

### C6. **Image gallery zoom + drag**
- avto.net: lightbox supports pinch-zoom + drag, mandatory for inspecting paint/dent close-ups.
- Vozila: `yet-another-react-lightbox` is in deps with `Zoom` plugin — verify it's actually wired on `ListingDetail`.

### C7. **Map view of search results (Mapbox)**
- avto.net has a "Show on map" toggle.
- Vozila: deferred since phase 12. Mapbox token slot exists but no map page.
- **Severity:** Major. Croatian buyers care about distance — "I'll only drive ≤100 km."

### C8. **Damage history visualisation**
- avto.net: little car-diagram with marked damage points + free-text history.
- Vozila: `damage_images: TEXT[]` column, rendered as a flat photo grid on `ListingDetail` (the "Damage gallery" mentioned in early phases). No visual diagram.

### C9. **Dealer comparison: side-by-side "BMW od Marka 1" vs "BMW od Marka 2"**
- avto.net: dealer-vs-dealer comparison (price, days-on-market, response time).
- Vozila: only listing-vs-listing compare. No dealer compare.

### C10. **Loyalty / featured "verified buyer" pin**
- avto.net: buyers who have bought before show a small badge to dealers — dealers prioritise responding.
- Vozila: no buyer-side reputation. Dealer can't tell a serious buyer from a tire-kicker.
- **Severity:** Hurts dealer-side retention.

### C11. **"Watch this make/model" alert** (lighter than a saved search)
- avto.net: 1-click watch on a make/model, no need to set price/year filters.
- Vozila: only saved-search digests. Higher friction.

### C12. **Mobile-app-quality offline mode**
- avto.net's app caches your favorites + recently viewed for offline browsing.
- Vozila: PWA shipped, but service worker only caches the shell. Listing data is always-network.

### C13. **Per-listing "I'm interested" view counter**
- avto.net: "23 ljudi gledaju ovo vozilo trenutno." (Real social proof, not made up.)
- Vozila: `views_count` exists in DB. Realtime "X people viewing now" counter (Supabase Presence) not wired.

### C14. **Seller-side notification before listing expires**
- avto.net: 7-day-pre-expiry email "your listing is about to expire — bump it for free."
- Vozila: no listing expiry mechanism at all. Listings stay active forever until seller marks sold/paused/deletes.
- **Severity:** Inventory clutter. Stale listings hurt search quality.
- **Fix:** Add `listings.expires_at` (default `created_at + 60 days`), pre-expiry email, expire cron. Mirrors what avto.net does.

### C15. **Vehicle history check from external sources**
- avto.net's premium VIN check pulls from German TÜV, Slovenian DARS, Croatian MUP databases (where APIs allow).
- Vozila: vPIC only (NHTSA, US-biased).
- **Severity:** Reduces VIN report value-prop. Worth documenting limitation.

---

## Section D — Things avto.net DOESN'T have (where Vozila already wins)

Reverse devil's advocate — confirm we're actually winning where the master plan said we would.

| Feature | avto.net | Vozila |
|---|---|---|
| In-platform messaging | ❌ (email only) | ✅ realtime |
| Saved-search email digest | ⚠️ basic | ✅ HMAC unsubscribe + per-user dedupe |
| Anti-scam phone obfuscation | ❌ | ✅ |
| Subscription tiers with verified badges | ❌ flat ad fees | ✅ Bronze/Silver/Gold |
| Auctions with anti-snipe | ❌ | ✅ BaT-style |
| AI listing copywriter | ❌ | ✅ Claude Haiku |
| Stripe-paid Boost + VIN + Inspection | ❌ | ✅ |
| Admin console with audit log + kill-switch | ❌ | ✅ |
| Dynamic OG image per listing | ❌ static | ✅ rendered |
| GDPR data export | ⚠️ unclear | ✅ one-click JSON |
| PDF VIN report | ❌ | ✅ cron-fulfilled |
| Lead-gen pipeline (financing/insurance/transport) | ❌ | ✅ in admin |

The plan's "where Vozila wins by being late" claim holds. We're not catching up — we're a generation ahead on trust + monetization. **The remaining gap to avto.net is feature parity in the buyer's basic search journey** (Section C), not in the trust layer.

---

## Section E — Recommended priority queue

If you want this to feel like avto.net+, fix in this order:

### Tier 0 — bugs, ship today
1. **A1** — Point `/predaj-oglas` to `CreateListingWizard`, delete legacy `ListingWizard.tsx`. (Critical bug.)
2. **A8** — Drop `NotificationsBell`, keep flyout. (Confusing UX.)
3. **A4** — Make `InspectionBookingButton` fail loudly when env missing in prod.
4. **A7** — Stop exposing dealer email on `DealerProfile`.
5. **A2** — Consolidate `ListingCard` to one implementation.

### Tier 1 — buyer parity with avto.net
6. **C2** — Equipment taxonomy + multi-select filter (~60 standard items). Biggest single buyer-side feature gap.
7. **C5** — Click-attribute-to-search on `ListingDetail`.
8. **C7** — Mapbox map view of search results.
9. **C13** — Realtime "X people viewing" via Supabase Presence.
10. **C14** — Listing expiry + pre-expiry bump email.

### Tier 2 — dealer parity
11. **C4** — XML feed pull cron (dealer DMS sync). Required to onboard dealers with >20 cars.
12. **C9** — Dealer comparison page.
13. **C3** — Cross-device recently-viewed.

### Tier 3 — polish
14. **B1** — Migrate localStorage saved searches on sign-in.
15. **B4** — Single source of truth for notification type strings.
16. **A3** — Admin section theme cleanup (light-mode legibility).
17. **C11** — Lightweight "watch make/model" alert.

### Tier 4 — defer
18. **C8** — Damage diagram visualisation.
19. **C10** — Buyer reputation pins.
20. **C12** — Offline-mode listing cache.
21. **C15** — TÜV / DARS / MUP integration (legal complexity).

---

## What I want from you

Pick a tier or specific items. I'll patch them with the same discipline as the phases:
- One focused turn per slice
- Build green before any "done" claim
- Real bundle numbers shown
- Devil's-advocate notes captured
- Manual deploy steps documented
- Migrations + Edge Functions where needed

Recommended first slice: **all of Tier 0 in one turn** (5 bugs, mostly small) → run live runbook → then Tier 1 starts with **C2 (equipment taxonomy)** which is the biggest single buyer-facing feature gap.
