import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { Listing } from '../types';
import { Hero } from '../components/home/Hero';
import { SuperSearch } from '../components/home/SuperSearch';

export const Home = () => {
  const [latestListings, setLatestListings] = useState<Listing[]>([]);
  const [trendingListings, setTrendingListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Fetch latest 8 listings
        const { data: latest } = await supabase
          .from('listings')
          .select('*, listing_images(id, url, is_primary, sort_order)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

        // Fetch trending 8 listings (by views)
        const { data: trending } = await supabase
          .from('listings')
          .select('*, listing_images(id, url, is_primary, sort_order)')
          .eq('status', 'active')
          .order('views_count', { ascending: false })
          .limit(8);

        setLatestListings(latest || []);
        setTrendingListings(trending || []);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Component */}
      <Hero />

      {/* Super Search Component */}
      <SuperSearch />

      {/* Section 1: Najnovije u garaži */}
      <section className="pt-8 pb-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">Najnovije u garaži</h2>
          </div>
          <Link 
            to="/?sortBy=created_at"
            className="text-sm font-bold text-primary hover:underline flex items-center gap-2"
          >
            Vidi sve
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-card/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Sponzorirani prostor */}
      <section className="py-12 px-4 bg-accent/20">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-64 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl overflow-hidden border border-border/40 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Sponzorirani prostor
              </p>
              <p className="text-2xl font-black text-foreground">
                Vaša reklama ovdje
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Najgledanije */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">Najgledanije</h2>
          </div>
          <Link 
            to="/?sortBy=views"
            className="text-sm font-bold text-primary hover:underline flex items-center gap-2"
          >
            Vidi sve
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-card/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// Compact Listing Card for Home Page
const ListingCard = ({ listing }: { listing: Listing }) => {
  const images = listing.listing_images || [];
  const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  const displayImg = sortedImages[0]?.url || '/placeholder-car.jpg';

  return (
    <Link 
      to={`/listing/${listing.id}`}
      className="group block bg-card border border-border/40 rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden">
        <img 
          src={displayImg} 
          alt={listing.title}
          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30"
        />
        <img 
          src={displayImg} 
          alt={listing.title}
          className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>
        <p className="text-xl font-black text-primary">
          {listing.price === 0 ? 'Na upit' : `${listing.price.toLocaleString()} €`}
        </p>
      </div>
    </Link>
  );
};
