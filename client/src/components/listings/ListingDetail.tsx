import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getAnalytics } from '../../lib/analytics';
import { Skeleton } from '../../components/ui/Skeleton';
import { 
  Calendar, Gauge, Zap, MapPin, Phone, Mail, User, 
  ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus,
  MessageCircle, ArrowLeft, AlertCircle
} from 'lucide-react';
import { Listing } from '../../types';

export const ListingDetail = () => {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*, categories(name, slug), listing_images(id, url, is_primary, sort_order)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setListing(data as Listing);

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
              <div className="relative aspect-video bg-neutral-900 rounded-none overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video" />
                ))}
              </div>
              <div className="bg-card border border-neutral-800 rounded-none p-8">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            {/* Info Panel Skeleton */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-8">
                <div className="bg-card border border-neutral-800 rounded-none p-8">
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
          <h1 className="text-4xl font-black text-foreground mb-4">Oglas nije pronađen</h1>
          <Link to="/" className="text-primary font-bold hover:underline">← Natrag na početnu</Link>
        </div>
      </div>
    );
  }

  const images = listing.listing_images || [];
  const sortedImages = images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const currentImage = sortedImages[currentImageIndex]?.url || '/placeholder-car.jpg';

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
  const whatsappMessage = `Hi, I'm interested in your ${listing.title} on Vozila.hr`;
  const whatsappLink = listing.contact_phone 
    ? `https://wa.me/${listing.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Status Badge for Inactive Listings */}
      {listing.status === 'inactive' && (
        <div className="bg-red-500 text-white py-3 px-4 text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-black uppercase tracking-widest text-sm">SOLD / ARCHIVED</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Natrag
        </Link>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-2 space-y-8">
            {/* Edge-to-Edge Hero Image - 16:9 */}
            <div className="relative aspect-video bg-neutral-900 rounded-none overflow-hidden">
              <img 
                src={currentImage} 
                alt={listing.title}
                className="w-full h-full object-cover"
              />

              {/* SOLD Watermark for Inactive Listings */}
              {listing.status === 'inactive' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl font-black text-white/30 transform -rotate-45 mb-4">SOLD</div>
                    <p className="text-sm font-black uppercase tracking-widest text-white/40">Oglas je arhiviran</p>
                  </div>
                </div>
              )}
              
              {/* Navigation Arrows - Sharp Design */}
              {sortedImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1))}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16 bg-black/80 hover:bg-black backdrop-blur-sm rounded-none flex items-center justify-center transition-all duration-300"
                  >
                    <ChevronLeft className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-16 bg-black/80 hover:bg-black backdrop-blur-sm rounded-none flex items-center justify-center transition-all duration-300"
                  >
                    <ChevronRight className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute bottom-0 right-0 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-none text-white text-xs font-black uppercase tracking-widest">
                {currentImageIndex + 1} / {sortedImages.length || 1}
              </div>
            </div>

            {/* Thumbnails */}
            {sortedImages.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {sortedImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`aspect-video rounded-none overflow-hidden border transition-all duration-300 ${
                      idx === currentImageIndex 
                        ? 'border-white' 
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="bg-card border border-neutral-800 rounded-none p-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">Opis</h2>
              <p className="text-white leading-relaxed">
                {listing.description || 'Nema dostupnog opisa.'}
              </p>
            </div>

            {/* Dynamic Specs - Porsche Grid */}
            <div className="bg-card border border-neutral-800 rounded-none p-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-8">Specifikacije</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {specs.map((spec, idx) => {
                  const Icon = spec.icon;
                  return (
                    <div key={idx} className="space-y-2">
                      <Icon className="w-5 h-5 text-neutral-400 mb-3" strokeWidth={1.5} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {spec.label}
                      </p>
                      <p className="text-lg font-black text-white">{spec.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Sticky Info Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              {/* Price Card */}
              <div className="bg-card border border-neutral-800 rounded-none p-8">
                <h1 className="text-2xl font-black text-white mb-8 leading-tight">
                  {listing.title}
                </h1>
                
                <div className="mb-8">
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Cijena</p>
                  <p className="text-4xl font-black text-white">
                    {listing.price === 0 ? 'Na upit' : `${listing.price.toLocaleString()} ${listing.currency || '€'}`}
                  </p>
                </div>

                {/* Price Ribbon */}
                <div className={`flex items-center gap-2 px-4 py-2 ${priceRibbon.color} text-white rounded-none mb-8`}>
                  <RibbonIcon className="w-4 h-4" strokeWidth={2} />
                  <span className="text-xs font-black uppercase tracking-widest">{priceRibbon.text}</span>
                </div>

                {/* Location */}
                {listing.location && (
                  <div className="flex items-center gap-2 text-neutral-400 mb-8">
                    <MapPin className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-xs font-black uppercase tracking-widest">{listing.location}</span>
                  </div>
                )}

                {/* Contact Buttons - Sharp Design */}
                {listing.status === 'inactive' ? (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-none text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-red-400">
                      Oglas je arhiviran - kontakt nije dostupan
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
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
                          } catch {
                            // Analytics not initialized yet, silently fail
                          }
                        }}
                        className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-green-600 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all duration-300"
                      >
                        <MessageCircle className="w-5 h-5" strokeWidth={2} />
                        WhatsApp
                      </a>
                    )}
                    
                    {listing.contact_phone && (
                      <a 
                        href={`tel:${listing.contact_phone}`}
                        className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all duration-300"
                      >
                        <Phone className="w-5 h-5" strokeWidth={2} />
                        Nazovi
                      </a>
                    )}
                    
                    {listing.contact_email && (
                      <a 
                        href={`mailto:${listing.contact_email}`}
                        className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-neutral-800 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-700 transition-all duration-300"
                      >
                        <Mail className="w-5 h-5" strokeWidth={2} />
                        Email
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Seller Info */}
              <div className="bg-card border border-neutral-800 rounded-none p-8">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">
                    Prodavač
                  </h3>
                </div>
                <p className="text-sm text-white">
                  Privatni prodavač
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
