import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrendingUp, ChevronRight, Sparkles } from 'lucide-react';
import { Listing } from '../types';
import { Hero } from '../components/home/Hero';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { NoviOglasiCarousel } from '../components/home/NoviOglasiCarousel';
import { RecentlyViewed } from '../components/home/RecentlyViewed';
import { TrendingSearches } from '../components/home/TrendingSearches';
import { ListingCard as FeedListingCard } from '../components/listings/ListingFeed';

export const Home = () => {
  const [trendingListings, setTrendingListings] = useState<Listing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Fetch trending 8 listings (most recent active — views_count column not in deployed schema)
        const { data: trending } = await supabase
          .from('listings')
          .select('*, listing_images(id, url, is_primary, sort_order)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

        setTrendingListings(trending || []);

        // Fetch featured listings (or fallback to random active)
        const { data: featured } = await supabase
          .from('listings')
          .select('*, listing_images(id, url, is_primary, sort_order)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4);

        setFeaturedListings(featured || []);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Component */}
      <Hero />

      {/* Recently viewed (only renders if user has history) */}
      <RecentlyViewed />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Trending searches — popular make/model queries from live data */}
      <TrendingSearches />

      {/* IZDVOJENI OGLASI - Featured Ads */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <div>
              <h2 className="text-[10px] font-light uppercase tracking-widest text-muted-foreground mb-1">
                Sponzorirano
              </h2>
              <p className="text-xl font-light uppercase tracking-widest text-foreground">
                IZDVOJENI OGLASI
              </p>
            </div>
          </div>
          <Link
            to="/pretraga?featured=true"
            className="text-xs font-light text-primary hover:text-primary/80 transition-colors duration-200 uppercase tracking-widest flex items-center gap-2"
          >
            Vidi sve
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 bg-muted/30 border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {featuredListings.map((listing) => (
              <Link key={listing.id} to={`/listing/${listing.id}`} className="border border-primary/30 overflow-hidden block">
                <FeedListingCard car={listing} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Novi Oglasi Showroom - Autoscroll Carousel */}
      <NoviOglasiCarousel />

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-px bg-muted/30" />
      </div>

      {/* Section: Najgledanije */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <div>
              <h2 className="text-[10px] font-light uppercase tracking-widest text-muted-foreground mb-1">
                Popularno
              </h2>
              <p className="text-xl font-light uppercase tracking-widest text-foreground">
                Najgledanije
              </p>
            </div>
          </div>
          <Link
            to="/pretraga?sort=newest"
            className="text-xs font-light text-primary hover:text-primary/80 transition-colors duration-200 uppercase tracking-widest flex items-center gap-2"
          >
            Vidi sve
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 bg-muted/30 border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {trendingListings.map((listing) => (
              <Link key={listing.id} to={`/listing/${listing.id}`} className="block">
                <FeedListingCard car={listing} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Sponsored Space - Minimal */}
      <section className="py-12 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-48 bg-white/[0.02] border border-border overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
            <div className="text-center relative">
              <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
                Sponzorirani prostor
              </p>
              <p className="text-lg font-light uppercase tracking-widest text-muted-foreground">
                Vaša reklama ovdje
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
