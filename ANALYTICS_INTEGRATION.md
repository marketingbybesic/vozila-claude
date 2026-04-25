# Analytics Integration Guide

This document outlines the Google Analytics 4 and Meta Pixel integration for Vozila.hr with GDPR-compliant consent management.

## Overview

The analytics system tracks three key events:
- **view_listing**: Triggered when a listing detail page loads
- **whatsapp_click**: Triggered when the WhatsApp button is clicked
- **search_performed**: Triggered when the "PRETRAŽI" (search/filter) button is clicked

## Architecture

### Core Components

#### 1. **Analytics Manager** (`client/src/lib/analytics.ts`)
- Centralized analytics service managing GA4 and Meta Pixel
- Handles consent state and lazy-loading of Meta Pixel
- Provides tracking methods for all events

#### 2. **Consent Banner** (`client/src/components/analytics/ConsentBanner.tsx`)
- GDPR-compliant consent UI
- Stores consent preferences in localStorage
- Supports granular consent (Analytics vs Marketing)
- Respects user preferences before tracking

#### 3. **Event Tracking Integration**
- **ListingDetail.tsx**: Tracks `view_listing` and `whatsapp_click` events
- **ListingFeed.tsx**: Tracks `search_performed` event

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the `client` directory:

```env
VITE_GA4_MEASUREMENT_ID=G_XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXX
```

Replace the placeholder values with your actual IDs:
- **GA4 Measurement ID**: Found in Google Analytics 4 > Admin > Property > Data Streams
- **Meta Pixel ID**: Found in Meta Business Suite > Events Manager > Pixels

### 2. Installation

No additional npm packages are required. The integration uses:
- Native Google Analytics 4 script injection
- Native Meta Pixel script injection
- localStorage for consent management

### 3. Verification

#### Test GA4 Integration
1. Open your site in a browser
2. Accept analytics consent in the banner
3. Open DevTools > Network tab
4. Filter for "google-analytics" or "gtag"
5. Navigate to a listing detail page
6. Check Google Analytics real-time dashboard

#### Test Meta Pixel Integration
1. Accept marketing consent in the banner
2. Interact with the page (click, scroll, etc.) to trigger Meta Pixel loading
3. Open DevTools > Network tab
4. Filter for "facebook.com"
5. Verify pixel fires on page interactions

## Event Details

### view_listing
**Triggered**: When a listing detail page loads (after consent check)

**Data Sent**:
```javascript
{
  listing_id: string,
  title: string,
  price: number,
  category: string
}
```

**GA4**: Custom event `view_listing`
**Meta Pixel**: `ViewContent` standard event

### whatsapp_click
**Triggered**: When the WhatsApp button is clicked

**Data Sent**:
```javascript
{
  listing_id: string,
  title: string,
  price: number,
  category: string
}
```

**GA4**: Custom event `whatsapp_click`
**Meta Pixel**: `Contact` standard event

### search_performed
**Triggered**: When the "PRETRAŽI" button is clicked with active filters

**Data Sent**:
```javascript
{
  search_term: string, // Formatted as "key:value key:value"
  priceMin?: string,
  priceMax?: string,
  yearMin?: string,
  yearMax?: string,
  // ... all active filters
}
```

**GA4**: Custom event `search_performed`
**Meta Pixel**: `Search` standard event

## GDPR Compliance

### Consent Management
- **Default State**: All tracking is denied by default (GDPR-compliant)
- **User Consent**: Users must explicitly accept before any tracking occurs
- **Storage**: Consent preferences stored in localStorage as `analytics_consent`
- **Granular Control**: Users can choose Analytics and Marketing separately

### Privacy Features
- **IP Anonymization**: GA4 configured with `anonymize_ip: true`
- **No Google Signals**: GA4 configured with `allow_google_signals: false`
- **Lazy Loading**: Meta Pixel only loads after first user interaction to preserve LCP
- **Consent Updates**: Consent changes immediately update GA4 and Meta Pixel behavior

### Consent Structure
```javascript
{
  analytics: boolean,  // GA4 tracking
  marketing: boolean   // Meta Pixel tracking
}
```

## Performance Optimization

### LCP (Largest Contentful Paint)
- **GA4**: Loaded asynchronously in `<head>` with minimal impact
- **Meta Pixel**: Lazy-loaded on first user interaction (click, scroll, keydown, touch)
- **Consent Banner**: Rendered at bottom of page, doesn't block rendering

### Script Loading
- GA4 script: `async` attribute for non-blocking load
- Meta Pixel: Injected only after consent and first interaction
- No render-blocking resources added

## Debugging

### Check Consent State
```javascript
// In browser console
const consent = JSON.parse(localStorage.getItem('analytics_consent'));
console.log(consent);
```

### Check Analytics Instance
```javascript
// In browser console
import { getAnalytics } from './lib/analytics';
const analytics = getAnalytics();
console.log(analytics.getConsent());
```

### Monitor Events
**GA4**: 
- Go to Google Analytics > Realtime > Events
- Filter by event name (view_listing, whatsapp_click, search_performed)

**Meta Pixel**:
- Go to Meta Business Suite > Events Manager > Pixels
- Check "Test Events" tab
- Use Meta Pixel Helper browser extension for detailed debugging

## Customization

### Adding New Events
```typescript
// In your component
import { getAnalytics } from '../../lib/analytics';

const handleCustomEvent = () => {
  try {
    const analytics = getAnalytics();
    analytics.trackEvent('custom_event_name', {
      custom_param: 'value'
    });
  } catch {
    // Handle initialization error
  }
};
```

### Modifying Consent Banner
Edit `client/src/components/analytics/ConsentBanner.tsx` to:
- Change styling
- Add additional consent categories
- Modify banner position or behavior

### Updating Analytics Config
Edit the `initializeAnalytics` call in `App.tsx` to:
- Add new tracking IDs
- Modify GA4 configuration options
- Change Meta Pixel parameters

## Troubleshooting

### Events Not Appearing in GA4
1. Verify `VITE_GA4_MEASUREMENT_ID` is correct
2. Check that analytics consent is granted
3. Wait 24-48 hours for data to appear (GA4 has processing delay)
4. Check Google Analytics > Admin > Data Streams for configuration

### Meta Pixel Not Firing
1. Verify `VITE_META_PIXEL_ID` is correct
2. Ensure marketing consent is granted
3. Interact with page (click, scroll) to trigger lazy loading
4. Check Meta Pixel Helper extension for pixel firing

### Consent Banner Not Showing
1. Clear localStorage: `localStorage.removeItem('analytics_consent')`
2. Refresh page
3. Check browser console for errors

### High LCP Score
1. Verify Meta Pixel is lazy-loaded (check Network tab timing)
2. Ensure GA4 script has `async` attribute
3. Check for other render-blocking resources
4. Use Lighthouse to identify bottlenecks

## References

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Meta Pixel Documentation](https://developers.facebook.com/docs/facebook-pixel)
- [GDPR Compliance Guide](https://gdpr-info.eu/)
- [Web Vitals - LCP](https://web.dev/lcp/)
