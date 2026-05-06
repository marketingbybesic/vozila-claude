# Vozila.hr — Responsive UI Audit (2026-05-06)

**Method:** Static analysis of every component's breakpoint usage + comparing against modern (2024-2025) responsive patterns from shadcn/ui, Bring-a-Trailer, mobile.de, and web.dev's current guidance.

**Scoring system:**
- 🟢 Already correct
- 🟡 Functional but suboptimal
- 🔴 Visibly broken on mobile or below standard

---

## Findings

### R1. 🔴 Touch targets below 44×44px on `MobileBottomNav`
- `<button p-2>...<Icon h-5 w-5/></button>` = 8+8+20 = **36px**.
- Apple HIG and Google Material both require ≥44px (Apple) / 48dp (Google).
- Same problem in `NotificationsFlyout` chevrons (p-1 + 12px icon = 14px), `Header` mobile menu icons (p-1).
- **Fix:** Tailwind class addition `min-w-[44px] min-h-[44px]` on every interactive icon button. Five components total.

### R2. 🟡 Header mobile menu uses `fixed inset-0` overlay instead of bottom sheet
- Modern pattern (BaT, Airbnb, modern banking apps) is a **bottom sheet** (slides up from bottom, swipe down to dismiss). Vozila uses a full-screen overlay which feels older.
- **Fix:** Replace with Radix `<Drawer>` (vaul-style) for mobile menu — same component handles dismiss-by-swipe + handle UI.

### R3. 🔴 Filter sidebar on `ListingFeed` doesn't collapse on mobile
- `<aside className="w-80 bg-black border-r border-border h-screen overflow-y-auto">` in `DynamicSidebar`.
- On 360px-wide phones this takes 80% of width permanently. Feed content gets squashed.
- **Fix:** Collapse below `lg:` breakpoint, surface as a "Filters (12)" button → bottom-sheet drawer.

### R4. 🟡 No fluid typography
- All font sizes are static pixel-equivalent: `text-xs / text-sm / text-base / text-lg`.
- Modern responsive uses `clamp(1rem, 0.5rem + 1vw, 1.25rem)` for body, similar for headings — text scales smoothly between breakpoints, no jarring jumps.
- **Fix:** Add 4 CSS custom properties in `index.css` and refactor headings on Hero, Pricing, AuctionDetail.

### R5. 🟢 Viewport meta tag is correct
- `index.html`: `width=device-width, initial-scale=1.0, viewport-fit=cover` — modern, includes safe-area handling. ✅

### R6. 🔴 `safe-area-pb` class is used but never defined
- `ListingDetail.tsx:846` uses `className="... safe-area-pb"` for the mobile sticky contact bar.
- **No matching CSS rule** exists in `index.css` — the class does nothing. iPhone users see the bar overlapping the home indicator gesture area.
- **Fix:** Add the missing CSS:
  ```css
  .safe-area-pb { padding-bottom: env(safe-area-inset-bottom, 0); }
  .safe-area-pt { padding-top: env(safe-area-inset-top, 0); }
  ```

### R7. 🟡 Listing card aspect ratio differs across grids
- Feed exports `5:4` aspect, dealer profile uses same export ✅, Compare page has different fixed heights, similar-vehicles uses third pattern.
- **Fix:** Single source of truth — `aspect-[5/4]` everywhere.

### R8. 🟡 No `prefers-reduced-motion` opt-out
- Hero page has `framer-motion` animations, image hover scale (1.04→1.0), countdown pulses.
- WCAG 2.3.3 — users with vestibular disorders need motion off.
- **Fix:** Wrap all `framer-motion` instances in `<MotionConfig reducedMotion="user">` at App root.

### R9. 🔴 Form inputs cause iOS zoom on focus when font-size < 16px
- Many forms (`ContactActionHub`, `LeadCaptureModal`, wizard step 1+2+3, login form) use `text-sm` (= 14px) inputs.
- iOS Safari auto-zooms on focus to any input with computed font-size < 16px. Disorienting.
- **Fix:** All `<input>` / `<textarea>` get `text-base` (16px) minimum. ~15 line changes.

### R10. 🟡 No container queries
- 2024+ pattern: `@container` queries let a card adapt based on its container's width, not the viewport. Useful when the same card appears in a 4-col grid AND a 2-col grid AND a list.
- **Fix:** Add `@container/card` to `ListingCard`, then size internal pieces with `cqw` / `cqi`. Tailwind has the plugin baked into `tailwind-merge` already. Lower priority — current 5:4 ratio handles it OK.

### R11. 🟡 Sticky elements don't account for header
- `ListingDetail` right-column has `sticky top-24`. Hard-coded to a header height that's now 96px on lg + 64px on mobile + 40px nav bar.
- **Fix:** CSS variable `--header-height` set per breakpoint, sticky uses `top-[var(--header-height)]`.

### R12. 🟢 Image lazy loading
- All `<img>` tags in feed/cards have `loading="lazy"`. ✅
- Hero images correctly NOT lazy-loaded. ✅

### R13. 🟡 No image `srcset` for retina or breakpoint-specific sizing
- Listings always serve full-resolution image even on a 360px phone.
- Supabase Storage doesn't auto-transform; need an image CDN (Imgix, Cloudinary, Supabase Image Transform).
- **Fix:** Use Supabase Image Transform via `?width=400&resize=cover` query param on listing thumbs.

### R14. 🔴 Mobile bottom nav obscures content above
- `<nav className="fixed bottom-0 ...">` is 60-80px tall. The page below has no `pb-20` to compensate, so the last item in any feed/list is hidden under the nav on every page.
- **Fix:** Body-level `padding-bottom: 80px` on `lg:` and below, OR per-page `<main>` gets `pb-20 lg:pb-0`.

### R15. 🟡 No skip-to-content link
- Accessibility: keyboard users have to tab through every header item to reach content.
- **Fix:** Add visually-hidden skip link as first focusable element.

### R16. 🟡 Drawer/dialog focus traps may not return focus
- Radix dialogs handle this correctly out of the box.
- Custom user menu in Header doesn't — closes but never returns focus to the trigger.
- **Fix:** Use Radix `<Popover>` for the user menu instead of hand-rolled.

---

## Priority queue for this session

**SHIP THIS TURN (highest impact, low risk):**
1. **R6** — Add missing `safe-area-pb` / `safe-area-pt` CSS (5 lines, fixes iPhone home-indicator overlap)
2. **R9** — Bump form inputs to 16px minimum (kills iOS auto-zoom annoyance)
3. **R14** — Body bottom padding on mobile so content isn't hidden under nav
4. **R1** — Touch target min-size on `MobileBottomNav` + `NotificationsFlyout` chevrons
5. **R8** — `<MotionConfig reducedMotion="user">` wrap in App.tsx

**SHIP NEXT TURN:**
- R3 — Filter sidebar collapse on mobile (biggest UX win for feed)
- R4 — Fluid typography
- R2 — Bottom-sheet header menu
- R13 — Image srcset / Supabase Image Transform
- R11 — `--header-height` variable

**DEFER:**
- R7, R10, R15, R16 — polish / accessibility, no broken UX today

---

## What modern responsive patterns we should adopt

From research + my own knowledge of current best practice (BaT, mobile.de, AutoTrader UK, shadcn/ui):

1. **Mobile-first breakpoints:** Tailwind defaults already correct (`sm:` = 640px+, `md:` = 768px+, `lg:` = 1024px+).
2. **Touch targets ≥ 44×44px:** Apple HIG, Google Material. Vozila violates in 4 places (R1).
3. **Form inputs ≥ 16px font-size:** iOS auto-zoom prevention (R9).
4. **Safe-area-inset:** Required for any fixed bottom element on iPhone X+ (R6).
5. **Bottom-sheet over modal on mobile:** Modern apps (Airbnb, Uber, BaT) all use bottom-sheets (Radix has `<Drawer>`, Vaul library) for any mobile dialog (R2).
6. **Fluid typography via `clamp()`:** No discrete jumps between breakpoints (R4).
7. **Reduced motion respect:** WCAG 2.3.3 (R8).
8. **Sticky header offset via CSS var:** No hard-coded `top-24` (R11).
9. **Image `srcset` + Supabase Image Transform:** Don't ship 4MB hero photo to a 360px phone (R13).
10. **Skip-to-content link:** A11y baseline (R15).

The Vozila design language (sharp edges, font-light, uppercase tracking-wide, monochrome with single accent) is solid and consistent with the brand. The gaps are mostly mechanical, not aesthetic.
