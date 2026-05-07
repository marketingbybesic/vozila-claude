import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getAnalytics } from '../../lib/analytics';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Calendar, Gauge, Zap, MapPin, Phone, Mail, User,
  TrendingDown, TrendingUp, Minus,
  MessageCircle, ArrowLeft, AlertCircle, ShieldCheck,
  Fuel, Sparkles
} from 'lucide-react';
import { Listing } from '../../types';
import { Helmet } from 'react-helmet-async';
import { ListingCard } from './ListingFeed';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import { onImgError, PLACEHOLDER_CAR } from '../../lib/imageFallback';
import { pushRecent } from '../../lib/recentlyViewed';
import { VerifiedDealerBadge } from './VerifiedDealerBadge';
import { ReportListingButton } from './ReportListingButton';
import { ensureConversation, NotAuthedError } from '../../lib/messaging';
import { useNavigate } from 'react-router-dom';
import { LeadCaptureModal } from './LeadCaptureModal';
import { VinReportButton } from './VinReportButton';
import { InspectionBookingButton } from './InspectionBookingButton';

// --- MILESTONE 4: HISTORY TIMELINE ---

interface HistoryEvent {
  year: number;
  event: string;
  owner: string;
}

const VehicleHistoryTimeline = ({ attributes }: { attributes: Record<string, any> }) => {
  const history: HistoryEvent[] = attributes.history || (() => {
    const baseYear = attributes.year || attributes.godiste || 2018;
    return [
      { year: baseYear, event: 'Prvo vlaštvo', owner: '1. Vlasnik' },
      { year: baseYear + 2, event: 'Redovni servis', owner: 'Servisna knjiga' },
      { year: baseYear + 4, event: 'Redovni servis', owner: 'Servisna knjiga' },
      { year: baseYear + 5, event: 'Promjena vlasnika', owner: '2. Vlasnik' },
    ].filter(e => e.year <= new Date().getFullYear());
  })();

  const getEventColor = (event: string, idx: number) => {
    if (idx === 0) return 'bg-primary border-primary';
    if (event.toLowerCase().includes('servis')) return 'bg-green-500 border-green-500';
    if (event.toLowerCase().includes('vlasnik') || event.toLowerCase().includes('promjena')) return 'bg-amber-500 border-amber-500';
    return 'bg-slate-500 border-slate-500';
  };

  const getLineColor = (event: string, idx: number) => {
    if (idx === 0) return 'text-primary';
    if (event.toLowerCase().includes('servis')) return 'text-green-400';
    if (event.toLowerCase().includes('vlasnik') || event.toLowerCase().includes('promjena')) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-card border border-border rounded-none p-8">
      <h2 className="text-xs font-light uppercase tracking-widest text-muted-foreground mb-8">Povijest vozila</h2>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-muted/50" />
        <div className="space-y-6">
          {history.map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 relative">
              {/* Dot */}
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 z-10 ${getEventColor(item.event, idx)}`} />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-light uppercase tracking-widest mb-1 ${getLineColor(item.event, idx)}`}>
                  {item.year}
                </p>
                <p className="text-sm font-light text-foreground/80 uppercase tracking-widest">
                  {item.event}
                </p>
                <p className="text-[10px] font-light text-muted-foreground uppercase tracking-widest mt-0.5">
                  {item.owner}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MILESTONE 5: COST PER 100KM ---

const FUEL_COSTS: Record<string, { litres: number; pricePerUnit: number; unit: string }> = {
  benzin:     { litres: 7.5,  pricePerUnit: 1.55, unit: 'L' },
  diesel:     { litres: 6.0,  pricePerUnit: 1.42, unit: 'L' },
  dizel:      { litres: 6.0,  pricePerUnit: 1.42, unit: 'L' },
  hibrid:     { litres: 4.5,  pricePerUnit: 1.55, unit: 'L' },
  hybrid:     { litres: 4.5,  pricePerUnit: 1.55, unit: 'L' },
  električni: { litres: 18.0, pricePerUnit: 0.22, unit: 'kWh' },
  electric:   { litres: 18.0, pricePerUnit: 0.22, unit: 'kWh' },
  struja:     { litres: 18.0, pricePerUnit: 0.22, unit: 'kWh' },
  lpg:        { litres: 9.0,  pricePerUnit: 0.72, unit: 'L' },
  plin:       { litres: 9.0,  pricePerUnit: 0.72, unit: 'L' },
};

// CostPer100km — superseded by ./FuelCostCard, kept as an alias for backward compat.
import { FuelCostCard as FuelCostCardImpl } from './FuelCostCard';
import { MatchScoreCard } from './MatchScoreCard';
import { PriceIntel } from './PriceIntel';
import { LoanCalculator } from './LoanCalculator';
import { ShareButtons } from './ShareButtons';
import { PriceWatchButton } from './PriceWatchButton';
import { CompareButton } from './CompareButton';
const CostPer100km = ({ attributes }: { attributes: Record<string, any> }) => (
  <FuelCostCardImpl attributes={attributes} />
);

// --- KNN SIMILAR VEHICLES — multi-attribute scoring ---
//
// Scores candidates against this listing's attributes and returns top 4.
// Score weights (tunable):
//   same category:        100  (HARD filter — only same category considered)
//   same make:            +60
//   same model:           +40
//   year proximity:       up to +40 (full credit at exact year, 0 at ±5y)
//   fuel match:           +25
//   transmission match:   +15
//   price proximity:      up to +50 (full credit at exact price, 0 at ±50%)
//   body_type match:      +15
//   drivetrain match:     +10

const SimilarVehicles = ({ listing }: { listing: Listing }) => {
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const attributes = listing.attributes || {};
  const categoryId = (listing as any).category_id;

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        // Pull candidates from the same category (HARD filter)
        let q = supabase
          .from('listings')
          .select('*, categories(slug, name), listing_images(id, url, is_primary, sort_order)')
          .eq('status', 'active')
          .neq('id', listing.id)
          .limit(40); // overshoot so the JS scorer has room

        if (categoryId) q = q.eq('category_id', categoryId);

        const { data, error } = await q;
        if (error) throw error;
        const candidates = (data || []) as Listing[];

        const A = attributes;
        const scored = candidates.map((c) => {
          const ca = (c.attributes || {}) as Record<string, any>;
          let score = 100;
          if (A.make && ca.make && String(A.make).toLowerCase() === String(ca.make).toLowerCase()) score += 60;
          if (A.model && ca.model && String(A.model).toLowerCase() === String(ca.model).toLowerCase()) score += 40;
          if (A.year && ca.year) {
            const dy = Math.abs(Number(A.year) - Number(ca.year));
            if (dy <= 5) score += Math.round(40 * (1 - dy / 5));
          }
          if (A.fuel && ca.fuel && A.fuel === ca.fuel) score += 25;
          if (A.transmission && ca.transmission && A.transmission === ca.transmission) score += 15;
          if (listing.price > 0 && c.price > 0) {
            const dp = Math.abs(c.price - listing.price) / listing.price;
            if (dp <= 0.5) score += Math.round(50 * (1 - dp / 0.5));
          }
          if (A.body_type && ca.body_type && A.body_type === ca.body_type) score += 15;
          if (A.drivetrain && ca.drivetrain && A.drivetrain === ca.drivetrain) score += 10;
          return { c, score };
        });
        scored.sort((a, b) => b.score - a.score);
        setSimilar(scored.slice(0, 4).map((s) => s.c));
      } catch {
        setSimilar([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [listing.id, categoryId]);

  if (loading || similar.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 sm:px-8 pb-16 lg:pb-20">
      <div className="flex items-end justify-between mb-8 lg:mb-10">
        <div>
          <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-2 inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Preporučeno
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-light uppercase tracking-tight text-foreground">
            Slična vozila
          </h2>
        </div>
        <span className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground tabular-nums hidden sm:block">
          {String(similar.length).padStart(2, '0')} izbora
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {similar.map((car) => (
          <Link key={car.id} to={`/listing/${car.id}`} className="block">
            <ListingCard car={car} />
          </Link>
        ))}
      </div>
    </section>
  );
};

// Trust rail — paid + lead-gen products in one strip on the VDP.
// VIN report (paid 9.99€), Inspection (paid 100€ — stub), insurance + transport
// lead capture (free for buyer; paid by partner per qualified lead).
const TrustRail = ({ listingId, vin, location }: { listingId: string; vin?: string | null; location?: string }) => (
  <div className="border border-border bg-muted/20 p-5 lg:p-6">
    <p className="text-[10px] font-light uppercase tracking-[0.3em] text-foreground mb-1">Trust & sigurnost</p>
    <p className="text-xs font-light text-muted-foreground leading-relaxed mb-5">
      Provjerite vozilo prije kupnje — neutralan izvještaj, terenska inspekcija ili usluge naših partnera.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <VinReportButton listingId={listingId} vin={vin} />
      <InspectionBookingButton listingId={listingId} defaultAddress={location} />
      <LeadCaptureModal partnerType="insurance" listingId={listingId} />
      <LeadCaptureModal partnerType="transport" listingId={listingId} />
    </div>
  </div>
);

export const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [messagingError, setMessagingError] = useState<string | null>(null);

  const startMessage = async () => {
    if (!id) return;
    setMessagingError(null);
    try {
      const conv = await ensureConversation(id);
      navigate(`/poruke/${conv.id}`);
    } catch (e) {
      if (e instanceof NotAuthedError) {
        setMessagingError('Prijavite se za slanje poruke prodavaču.');
      } else {
        setMessagingError(e instanceof Error ? e.message : 'Greška pri slanju poruke.');
      }
    }
  };

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      
      try {
        let { data, error } = await supabase
          .from('listings')
          .select('*, categories(name, slug), listing_images(id, url, is_primary, sort_order), owner:profiles!listings_user_id_fkey(id, company_name, logo_url, subscription_tier, subscription_status, is_verified, dealer_verified)')
          .eq('id', id)
          .single();

        // PGRST200: live DB missing listings_user_id_fkey on profiles.
        // Migration 012 declares it; until run, fall back to no-owner query.
        if (error && (error as any).code === 'PGRST200') {
          const fallback = await supabase
            .from('listings')
            .select('*, categories(name, slug), listing_images(id, url, is_primary, sort_order)')
            .eq('id', id)
            .single();
          data = fallback.data as any;
          error = fallback.error;
        }

        if (error) throw error;
        const normalized = {
          ...data,
          owner: (data as any).owner,
        };
        setListing(normalized as Listing);

        // Record in recently-viewed (endowment hook on home + VDP)
        try {
          const imgs = (data as Listing).listing_images || [];
          const primary = imgs.find((i: any) => i.is_primary)?.url || imgs[0]?.url;
          pushRecent({ id, title: (data as Listing).title, price: (data as Listing).price ?? 0, imageUrl: primary });
        } catch {}

        // Track view_listing event
        try {
          const analytics = getAnalytics();
          analytics.trackViewListing(id, {
            title: (data as Listing).title,
            price: (data as Listing).price,
            category: (data as Listing).categories?.slug,
          });
        } catch {
          // Analytics not initialized yet, silently fail
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Image Gallery Skeleton */}
            <div className="lg:col-span-2 space-y-8">
              <div className="relative aspect-video bg-card rounded-none overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video" />
                ))}
              </div>
              <div className="bg-card border border-border rounded-none p-8">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            {/* Info Panel Skeleton */}
            <div className="lg:col-span-1">
              <div className="sticky sticky-below-header space-y-8">
                <div className="bg-card border border-border rounded-none p-8">
                  <Skeleton className="h-8 w-full mb-8" />
                  <Skeleton className="h-10 w-32 mb-8" />
                  <Skeleton className="h-8 w-40 mb-8" />
                  <Skeleton className="h-6 w-24 mb-8" />
                  <Skeleton className="h-12 w-full mb-4" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-widest text-foreground mb-4">Oglas nije pronađen</h1>
          <Link to="/" className="text-primary font-light tracking-widest uppercase text-xs hover:underline">← Natrag na početnu</Link>
        </div>
      </div>
    );
  }

  const images = listing.listing_images || [];
  const sortedImages = [...images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Price analysis (dummy median for demo)
  const dummyMedian = 25000;
  const priceStatus = listing.price === 0 
    ? 'inquiry' 
    : listing.price < dummyMedian * 0.9 
    ? 'great' 
    : listing.price > dummyMedian * 1.1 
    ? 'high' 
    : 'market';

  const priceRibbon = {
    inquiry: { icon: Minus, text: 'Cijena na upit', color: 'bg-slate-500' },
    great: { icon: TrendingDown, text: 'Odlična cijena', color: 'bg-green-500' },
    market: { icon: Minus, text: 'Tržišna cijena', color: 'bg-yellow-500' },
    high: { icon: TrendingUp, text: 'Iznad prosjeka', color: 'bg-orange-500' },
  }[priceStatus];

  const RibbonIcon = priceRibbon.icon;

  // Dynamic attributes
  const attributes = listing.attributes || {};
  const specs = [
    { icon: Calendar, label: 'Godište', value: attributes.year },
    { icon: Gauge, label: 'Kilometraža', value: attributes.mileage ? `${attributes.mileage.toLocaleString()} km` : null },
    { icon: Zap, label: 'Gorivo', value: attributes.fuelType || attributes.fuel },
    { icon: Gauge, label: 'Snaga', value: attributes.power ? `${attributes.power} KS` : null },
  ].filter(spec => spec.value);

  // WhatsApp message generator
  const listingUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappMessage = `Pozdrav, zanima me oglas: ${listing.title}${listing.price ? ` (${listing.price.toLocaleString('hr-HR')} €)` : ''}\n${listingUrl}`;
  const whatsappLink = listing.contact_phone
    ? `https://wa.me/${listing.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
    : null;
  const emailSubject = `Vozila.hr — upit za ${listing.title}`;
  const emailBody = `Pozdrav,\n\nZanima me sljedeći oglas:\n${listing.title}${listing.price ? ` — ${listing.price.toLocaleString('hr-HR')} €` : ''}\n${listingUrl}\n\nMolim Vas dodatne informacije.\n\nHvala.`;
  const emailLink = listing.contact_email
    ? `mailto:${listing.contact_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : null;

  // SEO title for this listing
  const seoTitle = `${listing.title} — ${listing.price > 0 ? `${listing.price.toLocaleString()}€` : 'Cijena na upit'} | Vozila.hr`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={listing.description?.substring(0, 160) || `${listing.title} — ${listing.location || 'Hrvatska'}. Pronađite ovo vozilo na Vozila.hr.`} />
        <link rel="canonical" href={listingUrl} />
        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={listing.description?.substring(0, 200) || listing.title} />
        <meta property="og:url" content={listingUrl} />
        {sortedImages[0]?.url && <meta property="og:image" content={sortedImages[0].url} />}
        <meta property="og:locale" content="hr_HR" />
        <meta property="og:site_name" content="Vozila.hr" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={listing.description?.substring(0, 200) || listing.title} />
        {sortedImages[0]?.url && <meta name="twitter:image" content={sortedImages[0].url} />}
        {/* Vehicle JSON-LD (schema.org) */}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: listing.title,
          description: listing.description || `${listing.title} na Vozila.hr`,
          image: sortedImages.map((i) => i.url).slice(0, 8),
          brand: attributes.make ? { '@type': 'Brand', name: attributes.make } : undefined,
          model: attributes.model || undefined,
          vehicleModelDate: attributes.year || undefined,
          fuelType: attributes.fuel || undefined,
          mileageFromOdometer: attributes.mileage ? { '@type': 'QuantitativeValue', value: attributes.mileage, unitCode: 'KMT' } : undefined,
          offers: listing.price > 0 ? {
            '@type': 'Offer',
            priceCurrency: listing.currency || 'EUR',
            price: listing.price,
            availability: listing.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            url: listingUrl,
          } : undefined,
        })}</script>
      </Helmet>

      {/* Status Badge for Inactive Listings */}
      {listing.status === 'sold' && (
        <div className="bg-red-500/90 text-white py-3 px-4 text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
            <span className="font-light uppercase tracking-widest text-sm">PRODANO / ARHIVIRANO</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Editorial breadcrumb — Početna › Kategorija › Title */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 flex-wrap text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Početna</Link>
          {(listing.categories?.slug || (listing as any).category?.slug) && (
            <>
              <span aria-hidden="true">›</span>
              <Link
                to={`/${listing.categories?.slug || (listing as any).category?.slug}`}
                className="hover:text-primary transition-colors"
              >
                {listing.categories?.name || listing.categories?.slug || 'Kategorija'}
              </Link>
            </>
          )}
          <span aria-hidden="true">›</span>
          <span className="text-foreground/80 truncate max-w-[60vw]">
            {listing.title}
          </span>
        </nav>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-2 space-y-8">
            {/* Premium Gallery Layout */}
            {sortedImages.length === 0 ? (
              <div className="relative aspect-video bg-card rounded-none overflow-hidden">
                <img
                  src={PLACEHOLDER_CAR}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  onError={onImgError}
                />
              </div>
            ) : sortedImages.length === 1 ? (
              <div className="relative aspect-video bg-card rounded-none overflow-hidden cursor-pointer"
                onClick={() => {
                  setLightboxSlides(sortedImages.map((img) => ({ src: img.url })));
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }}
              >
                <img
                  src={sortedImages[0].url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  onError={onImgError}
                />
                {listing.status === 'sold' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-8xl font-light text-muted-foreground/60 transform -rotate-45 mb-4 tracking-widest">PRODANO</div>
                      <p className="text-sm font-light uppercase tracking-widest text-muted-foreground">Oglas je arhiviran</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-none text-white text-xs font-light uppercase tracking-widest">
                  1 / 1
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-[300px] md:h-[500px]">
                {/* Main Image - Left (spans 2 columns, full height) */}
                <div
                  className="md:col-span-2 h-full relative bg-card rounded-none overflow-hidden cursor-pointer"
                  onClick={() => {
                    setLightboxSlides(sortedImages.map((img) => ({ src: img.url })));
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                  }}
                >
                  <img
                    src={sortedImages[0].url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={onImgError}
                  />
                  {listing.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-8xl font-light text-muted-foreground/60 transform -rotate-45 mb-4 tracking-widest">PRODANO</div>
                        <p className="text-sm font-light uppercase tracking-widest text-muted-foreground">Oglas je arhiviran</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-none text-white text-xs font-light uppercase tracking-widest">
                    1 / {sortedImages.length}
                  </div>
                </div>
                {/* Right Column - Stacked Images */}
                <div className="hidden md:flex flex-col gap-2 h-full">
                  {sortedImages.slice(1, 3).map((img, idx) => (
                    <div
                      key={img.id}
                      className="flex-1 relative bg-card rounded-none overflow-hidden cursor-pointer"
                      onClick={() => {
                        setLightboxSlides(sortedImages.map((i) => ({ src: i.url })));
                        setLightboxIndex(idx + 1);
                        setLightboxOpen(true);
                      }}
                    >
                      <img
                        src={img.url}
                        alt={`Thumbnail ${idx + 2}`}
                        className="w-full h-full object-cover"
                        onError={onImgError}
                      />
                      {sortedImages.length > 3 && idx === 1 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-light uppercase tracking-widest text-sm">
                            +{sortedImages.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {sortedImages.length === 2 && <div className="flex-1 bg-card rounded-none" />}
                </div>
                {/* Mobile: horizontal scroll for extra images */}
                <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
                  {sortedImages.slice(1).map((img, idx) => (
                    <div
                      key={img.id}
                      className="flex-shrink-0 w-32 aspect-video bg-card rounded-none overflow-hidden cursor-pointer"
                      onClick={() => {
                        setLightboxSlides(sortedImages.map((i) => ({ src: i.url })));
                        setLightboxIndex(idx + 1);
                        setLightboxOpen(true);
                      }}
                    >
                      <img src={img.url} alt={`Thumbnail ${idx + 2}`} className="w-full h-full object-cover" onError={onImgError} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Damage Gallery Button */}
            {(listing.damage_images && listing.damage_images.length > 0) && (
              <button
                onClick={() => {
                  setLightboxSlides(listing.damage_images!.map((url) => ({ src: url })));
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }}
                className="w-full px-6 py-3 border border-red-500/30 bg-red-500/5 text-red-400 rounded-none font-light uppercase tracking-widest text-xs hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
                Galerija Oštećenja ({listing.damage_images.length})
              </button>
            )}

            {/* Description */}
            <div className="bg-card border border-border rounded-none p-8">
              <h2 className="text-xs font-light uppercase tracking-widest text-muted-foreground mb-4">Opis</h2>
              <p className="text-foreground/80 leading-relaxed font-light">
                {listing.description || 'Nema dostupnog opisa.'}
              </p>
            </div>

            {/* Dynamic Specs - Porsche Grid */}
            <div className="bg-card border border-border rounded-none p-8">
              <h2 className="text-xs font-light uppercase tracking-widest text-muted-foreground mb-8">Specifikacije</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {specs.map((spec, idx) => {
                  const Icon = spec.icon;
                  return (
                    <div key={idx} className="space-y-2">
                      <Icon className="w-5 h-5 text-muted-foreground mb-3" strokeWidth={1.5} />
                      <p className="text-[10px] font-light uppercase tracking-widest text-muted-foreground">
                        {spec.label}
                      </p>
                      <p className="text-lg font-light text-foreground">{spec.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipment Tags - Dodatna Oprema */}
            {attributes.equipment && Array.isArray(attributes.equipment) && attributes.equipment.length > 0 && (
              <div className="bg-card border border-border rounded-none p-8">
                <h2 className="text-xs font-light uppercase tracking-widest text-muted-foreground mb-4">Dodatna Oprema</h2>
                <div className="flex flex-wrap gap-2">
                  {attributes.equipment.map((tag: string) => (
                    <span
                      key={tag}
                      className="bg-muted/30 border border-border px-3 py-1 text-[10px] uppercase tracking-widest text-foreground/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* MILESTONE 4: Vehicle History Timeline */}
            <VehicleHistoryTimeline attributes={attributes} />

            {/* Price intel — Where this price sits vs comparable listings */}
            <PriceIntel listing={listing} />

            {/* Loan calculator — interactive, free buyer tool + pre-approval CTA */}
            <LoanCalculator price={listing.price} currency={listing.currency || 'EUR'} listingId={listing.id} />

            {/* Trust rail — paid + lead-gen products in one strip */}
            <TrustRail listingId={listing.id} vin={(attributes as any)?.vin ?? null} location={listing.location ?? undefined} />

            {/* Match Score breakdown — what raised the score, and what would push to 100 */}
            <MatchScoreCard listing={listing} />

            {/* Share — Web Share API + per-channel fallbacks */}
            <ShareButtons title={listing.title} url={listingUrl} />
          </div>

          {/* Right: Sticky Info Panel */}
          <div className="lg:col-span-1">
            <div className="sticky sticky-below-header space-y-8">
              {/* Price Card */}
              <div className="bg-card border border-border rounded-none p-8">
                <h1 className="text-2xl font-light text-foreground mb-8 leading-tight tracking-widest">
                  {listing.title}
                </h1>
                
                <div className="mb-8">
                  <p className="text-xs font-light uppercase tracking-widest text-muted-foreground mb-2">Cijena</p>
                  <p className="text-4xl font-light text-foreground">
                    {listing.price === 0 ? 'Na upit' : `${listing.price.toLocaleString()} ${listing.currency || '€'}`}
                  </p>
                </div>

                {/* Price Ribbon */}
                <div className={`flex items-center gap-2 px-4 py-2 ${priceRibbon.color} text-white rounded-none mb-5`}>
                  <RibbonIcon className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-xs font-light uppercase tracking-widest">{priceRibbon.text}</span>
                </div>

                {/* Price-watch toggle + Compare — drives loss-aversion + cross-listing engagement */}
                <div className="mb-6 flex flex-col gap-2">
                  {listing.price > 0 && (
                    <PriceWatchButton
                      listingId={listing.id}
                      currentPrice={listing.price}
                      currency={listing.currency || 'EUR'}
                    />
                  )}
                  <CompareButton listingId={listing.id} />
                </div>

                {/* Location */}
                {listing.location && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-8">
                    <MapPin className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-xs font-light uppercase tracking-widest">{listing.location}</span>
                  </div>
                )}

                {/* Contact Buttons - Sharp Design (Desktop) */}
                {listing.status === 'sold' ? (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-none text-center">
                    <p className="text-xs font-light uppercase tracking-widest text-red-400">
                      Oglas je arhiviran - kontakt nije dostupan
                    </p>
                  </div>
                ) : (
                  <div className="hidden lg:flex flex-col space-y-2">
                    {/* Primary CTA: in-platform message — anti-scam path */}
                    <button
                      onClick={startMessage}
                      className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-primary text-primary-foreground rounded-none font-light uppercase tracking-widest text-xs hover:bg-primary/90 transition-all duration-300"
                    >
                      <Mail className="w-5 h-5" strokeWidth={1.5} />
                      Pošalji poruku prodavaču
                    </button>

                    {messagingError && (
                      <p className="text-[10px] font-light text-red-400 px-1">{messagingError}</p>
                    )}

                    {whatsappLink && phoneRevealed && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          try {
                            const analytics = getAnalytics();
                            analytics.trackWhatsAppClick(listing.id, {
                              title: listing.title,
                              price: listing.price,
                              category: listing.categories?.slug,
                            });
                          } catch { /* analytics may not be initialized */ }
                        }}
                        className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-green-600 text-white rounded-none font-light uppercase tracking-widest text-xs hover:bg-green-700 transition-all duration-300"
                      >
                        <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                        WhatsApp
                      </a>
                    )}

                    {listing.contact_phone && !phoneRevealed && (
                      <button
                        onClick={() => setPhoneRevealed(true)}
                        className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-card border border-border text-foreground rounded-none font-light uppercase tracking-widest text-xs hover:border-primary transition-all duration-300"
                      >
                        <Phone className="w-5 h-5" strokeWidth={1.5} />
                        Prikaži broj
                      </button>
                    )}

                    {listing.contact_phone && phoneRevealed && (
                      <a
                        href={`tel:${listing.contact_phone}`}
                        className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-white text-black rounded-none font-light uppercase tracking-widest text-xs hover:bg-foreground/10 transition-all duration-300"
                      >
                        <Phone className="w-5 h-5" strokeWidth={1.5} />
                        <span className="tabular-nums">{listing.contact_phone}</span>
                      </a>
                    )}

                    {listing.contact_email && (
                      <a
                        href={`mailto:${listing.contact_email}`}
                        className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-muted text-foreground rounded-none font-light uppercase tracking-widest text-xs hover:bg-muted/70 transition-all duration-300"
                      >
                        <Mail className="w-5 h-5" strokeWidth={1.5} />
                        Email
                      </a>
                    )}

                    {/* Report listing — bottom of contact column, low-emphasis */}
                    <div className="pt-3 mt-1 border-t border-border/40 flex justify-center">
                      <ReportListingButton listingId={listing.id} />
                    </div>
                  </div>
                )}
              </div>

              {/* MILESTONE 5: Cost per 100km */}
              <CostPer100km attributes={attributes} />

              {/* Seller Info */}
              <div className="bg-card border border-border rounded-none p-8">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <h3 className="text-xs font-light uppercase tracking-widest text-muted-foreground">
                    Prodavač
                  </h3>
                </div>
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <p className="text-sm text-foreground/80 font-light">
                    {listing.owner?.company_name || 'Privatni prodavač'}
                  </p>
                  {(() => {
                    const subTier = listing.owner?.subscription_tier;
                    const subActive = listing.owner?.subscription_status === 'active' || listing.owner?.subscription_status === 'trialing';
                    if (subTier && subActive) return <VerifiedDealerBadge tier={subTier} size="sm" />;
                    if (listing.owner?.is_verified || listing.owner?.dealer_verified || listing.owner?.tier === 'premium') {
                      return (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/30 border border-border">
                          <ShieldCheck className="w-3 h-3 text-primary" strokeWidth={2} />
                          <span className="text-[9px] font-light uppercase tracking-widest text-muted-foreground">
                            Verificirani
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                {listing.owner?.subscription_tier === 'gold' && (
                  <p className="text-[10px] font-light uppercase tracking-widest text-primary/60">
                    Gold partner
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MILESTONE 6: Similar Vehicles */}
      <SimilarVehicles listing={listing} />

      {/* Mobile Sticky Contact Bar — theme-aware, one-tap to call/whatsapp/email */}
      {listing.status === 'active' && (
        <div className="lg:hidden fixed bottom-[60px] left-0 right-0 bg-background border-t border-border px-4 py-3 z-50 flex items-center justify-between gap-3 safe-area-pb">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-light uppercase tracking-widest text-muted-foreground truncate">
              {listing.title}
            </p>
            <p className="text-sm font-light text-foreground truncate tabular-nums">
              {listing.price === 0 ? 'Na upit' : `${listing.price.toLocaleString('hr-HR')} ${listing.currency || '€'}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    const analytics = getAnalytics();
                    analytics.trackWhatsAppClick(listing.id, {
                      title: listing.title,
                      price: listing.price,
                      category: listing.categories?.slug,
                    });
                  } catch {}
                }}
                aria-label="WhatsApp"
                className="inline-flex items-center justify-center w-11 h-11 bg-[#25D366] text-white hover:bg-[#22c55e] transition-colors"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.75} />
              </a>
            )}
            {listing.contact_phone && (
              <a
                href={`tel:${listing.contact_phone}`}
                aria-label="Nazovi"
                className="inline-flex items-center justify-center w-11 h-11 bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <Phone className="w-4 h-4" strokeWidth={1.75} />
              </a>
            )}
            {emailLink && (
              <a
                href={emailLink}
                aria-label="Pošalji email"
                className="inline-flex items-center justify-center w-11 h-11 border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" strokeWidth={1.75} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Premium Lightbox - Pitch Black Backdrop, keyboard nav, anti-context-menu */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom, Thumbnails]}
        controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
        carousel={{ finite: false, preload: 2 }}
        animation={{ swipe: 350, fade: 250 }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true, doubleTapDelay: 300 }}
        thumbnails={{ position: 'bottom', width: 96, height: 64, gap: 8 }}
        render={{
          slide: ({ slide }) => (
            <img
              src={(slide as any).src}
              alt=""
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ maxWidth: '100%', maxHeight: '100%', userSelect: 'none' }}
            />
          ),
        }}
        styles={{
          container: { backgroundColor: '#000000' },
          thumbnailsContainer: { backgroundColor: '#000000' },
          thumbnail: { backgroundColor: '#111' },
        }}
      />
    </div>
  );
};
