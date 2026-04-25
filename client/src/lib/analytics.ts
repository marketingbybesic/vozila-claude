// Google Analytics 4 and Meta Pixel Integration with GDPR Compliance

interface AnalyticsConfig {
  ga4MeasurementId: string;
  metaPixelId: string;
}

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

class AnalyticsManager {
  private config: AnalyticsConfig;
  private consent: ConsentState = {
    analytics: false,
    marketing: false,
  };
  private metaPixelLoaded = false;
  private userInteracted = false;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.loadConsent();
    this.initGA4();
    this.setupUserInteractionListener();
  }

  // Load consent from localStorage
  private loadConsent(): void {
    const stored = localStorage.getItem('analytics_consent');
    if (stored) {
      try {
        this.consent = JSON.parse(stored);
      } catch {
        this.consent = { analytics: false, marketing: false };
      }
    }
  }

  // Save consent to localStorage
  public setConsent(consent: ConsentState): void {
    this.consent = consent;
    localStorage.setItem('analytics_consent', JSON.stringify(consent));
    
    // Update GA4 consent
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': consent.analytics ? 'granted' : 'denied',
        'ad_storage': consent.marketing ? 'granted' : 'denied',
      });
    }

    // Load Meta Pixel if marketing consent granted
    if (consent.marketing && !this.metaPixelLoaded) {
      this.initMetaPixel();
    }
  }

  public getConsent(): ConsentState {
    return this.consent;
  }

  // Initialize Google Analytics 4
  private initGA4(): void {
    if (!this.config.ga4MeasurementId) return;

    // Set default consent state (deny by default for GDPR)
    if (window.gtag) {
      window.gtag('consent', 'default', {
        'analytics_storage': this.consent.analytics ? 'granted' : 'denied',
        'ad_storage': this.consent.marketing ? 'granted' : 'denied',
      });
    }

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.ga4MeasurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(..._args: any[]) {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', this.config.ga4MeasurementId, {
      'allow_google_signals': false,
      'anonymize_ip': true,
    });
  }

  // Initialize Meta Pixel (lazy load on first user interaction)
  private initMetaPixel(): void {
    if (this.metaPixelLoaded || !this.config.metaPixelId) return;
    if (!this.consent.marketing) return;

    this.metaPixelLoaded = true;

    // Load Meta Pixel script
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${this.config.metaPixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Add noscript fallback
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${this.config.metaPixelId}&ev=PageView&noscript=1" />`;
    document.head.appendChild(noscript);
  }

  // Setup listener for first user interaction to load Meta Pixel
  private setupUserInteractionListener(): void {
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    
    const handleInteraction = () => {
      if (!this.userInteracted) {
        this.userInteracted = true;
        if (this.consent.marketing && !this.metaPixelLoaded) {
          this.initMetaPixel();
        }
        events.forEach(event => {
          document.removeEventListener(event, handleInteraction);
        });
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });
  }

  // Track view_listing event
  public trackViewListing(listingId: string, listingData?: Record<string, any>): void {
    if (!this.consent.analytics) return;

    const eventData = {
      listing_id: listingId,
      ...listingData,
    };

    // GA4
    if (window.gtag) {
      window.gtag('event', 'view_listing', eventData);
    }

    // Meta Pixel
    if (window.fbq && this.metaPixelLoaded) {
      window.fbq('track', 'ViewContent', {
        content_id: listingId,
        content_type: 'product',
        ...listingData,
      });
    }
  }

  // Track whatsapp_click event
  public trackWhatsAppClick(listingId: string, listingData?: Record<string, any>): void {
    if (!this.consent.marketing) return;

    const eventData = {
      listing_id: listingId,
      ...listingData,
    };

    // GA4
    if (window.gtag) {
      window.gtag('event', 'whatsapp_click', eventData);
    }

    // Meta Pixel
    if (window.fbq && this.metaPixelLoaded) {
      window.fbq('track', 'Contact', {
        content_id: listingId,
        content_type: 'product',
        ...listingData,
      });
    }
  }

  // Track search_performed event
  public trackSearchPerformed(searchTerms: string, filters?: Record<string, any>): void {
    if (!this.consent.analytics) return;

    const eventData = {
      search_term: searchTerms,
      ...filters,
    };

    // GA4
    if (window.gtag) {
      window.gtag('event', 'search_performed', eventData);
    }

    // Meta Pixel
    if (window.fbq && this.metaPixelLoaded) {
      window.fbq('track', 'Search', {
        search_string: searchTerms,
        ...filters,
      });
    }
  }

  // Track custom event
  public trackEvent(eventName: string, eventData?: Record<string, any>): void {
    if (!this.consent.analytics) return;

    // GA4
    if (window.gtag) {
      window.gtag('event', eventName, eventData);
    }

    // Meta Pixel
    if (window.fbq && this.metaPixelLoaded) {
      window.fbq('track', eventName, eventData);
    }
  }
}

// Global instance
let analyticsInstance: AnalyticsManager | null = null;

export const initializeAnalytics = (config: AnalyticsConfig): AnalyticsManager => {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsManager(config);
  }
  return analyticsInstance;
};

export const getAnalytics = (): AnalyticsManager => {
  if (!analyticsInstance) {
    throw new Error('Analytics not initialized. Call initializeAnalytics first.');
  }
  return analyticsInstance;
};

// Type declarations for global objects
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    fbq: (...args: any[]) => void;
  }
}
