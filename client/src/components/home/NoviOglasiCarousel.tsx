import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Listing } from '../../types';
import { supabase } from '../../lib/supabase';
import { onImgError, PLACEHOLDER_CAR } from '../../lib/imageFallback';

const AUTO_SCROLL_INTERVAL = 4000;

function getVisibleCount() {
  const w = window.innerWidth;
  if (w < 640) return 1;
  if (w < 1024) return 2;
  return 4;
}

export const NoviOglasiCarousel = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);
      setListings((data || []) as unknown as Listing[]);
      setLoading(false);
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    const onResize = () => setVisibleCount(getVisibleCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const realCount = listings.length;
  const hasEnough = realCount > visibleCount;

  // Build infinite loop array: [last visible] + [all] + [first visible]
  const extendedListings = hasEnough
    ? [
        ...listings.slice(-visibleCount),
        ...listings,
        ...listings.slice(0, visibleCount),
      ]
    : listings;

  const startOffset = hasEnough ? visibleCount : 0;
  const maxRealIndex = hasEnough ? startOffset + realCount - 1 : realCount - 1;

  const [displayIndex, setDisplayIndex] = useState(startOffset);

  // Sync displayIndex when listings load
  useEffect(() => {
    setDisplayIndex(startOffset);
  }, [startOffset, realCount]);

  const goNext = useCallback(() => {
    if (!hasEnough) return;
    setIsTransitioning(true);
    setDisplayIndex((prev: number) => prev + 1);
  }, [hasEnough]);

  const goPrev = useCallback(() => {
    if (!hasEnough) return;
    setIsTransitioning(true);
    setDisplayIndex((prev: number) => prev - 1);
  }, [hasEnough]);

  // Handle infinite loop snap
  useEffect(() => {
    if (!hasEnough) return;
    if (displayIndex >= maxRealIndex + 1) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setDisplayIndex(startOffset);
      }, 700);
      return () => clearTimeout(timer);
    }
    if (displayIndex < startOffset) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setDisplayIndex(maxRealIndex);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [displayIndex, hasEnough, maxRealIndex, startOffset]);

  // Autoscroll
  useEffect(() => {
    if (!hasEnough || isPaused) return;
    const interval = setInterval(goNext, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(interval);
  }, [hasEnough, isPaused, goNext]);

  // Derive visual currentIndex for progress indicator
  useEffect(() => {
    if (!hasEnough) return;
    const normalized = displayIndex - startOffset;
    if (normalized >= 0 && normalized < realCount - visibleCount + 1) {
      setCurrentIndex(normalized);
    }
  }, [displayIndex, hasEnough, startOffset, realCount, visibleCount]);

  if (loading) {
    return (
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="h-72 bg-muted/30 border border-border animate-pulse" />
      </section>
    );
  }

  if (listings.length === 0) return null;

  const slideWidthPercent = 100 / visibleCount;
  const totalSlides = Math.max(realCount - visibleCount + 1, 1);

  return (
    <section
      className="py-16 px-4 max-w-7xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[10px] font-light uppercase tracking-widest text-muted-foreground mb-2">
            Ponuda
          </h2>
          <p className="text-xl font-light uppercase tracking-widest text-foreground">
            NAJNOVIJE U PONUDI
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* Progress Indicator */}
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIsTransitioning(true);
                  setDisplayIndex(startOffset + i);
                }}
                className={`h-px transition-all duration-500 ${
                  i === currentIndex ? 'w-8 bg-white' : 'w-4 bg-white/20'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation Arrows - Sleek Thin Stroke */}
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              className="p-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-300"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1} />
            </button>
            <button
              onClick={goNext}
              className="p-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-300"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1} />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Track */}
      <div className="overflow-hidden scrollbar-hide" ref={trackRef}>
        <div
          className="flex"
          style={{
            transform: `translateX(-${displayIndex * slideWidthPercent}%)`,
            transition: isTransitioning ? 'transform 700ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          }}
        >
          {extendedListings.map((listing, idx) => {
            const images = listing.listing_images || [];
            const img = images.find((i) => i.is_primary)?.url || images[0]?.url || PLACEHOLDER_CAR;
            return (
              <Link
                key={`${listing.id}-${idx}`}
                to={`/listing/${listing.id}`}
                className="group flex-shrink-0 w-full sm:w-1/2 lg:w-1/4 min-w-[260px] px-2"
              >
                <div className="border border-border bg-black overflow-hidden">
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <img
                      src={img}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="lazy"
                      onError={onImgError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground truncate">
                      {listing.title}
                    </h3>
                    <p className="mt-2 text-sm font-light text-primary">
                      {listing.price === 0 ? 'Na upit' : `${listing.price.toLocaleString()} €`}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
