import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { supabase } from '../lib/supabase';
import type { Listing } from '../types';
// Bug A2 fix: consolidated to the single ListingCard exported from
// ListingFeed (the one with tier-aware VerifiedDealerBadge + matchScore
// pill + 5:4 aspect). Standalone components/listing/ListingCard.tsx deleted.
import { ListingCard } from '../components/listings/ListingFeed';

export const Favorites = () => {
  const { favorites, loading: favLoading } = useFavorites();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (favLoading) return;
      if (favorites.length === 0) { setLoading(false); return; }
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(*)')
        .in('id', favorites)
        .eq('status', 'active');
      setListings((data || []) as unknown as Listing[]);
      setLoading(false);
    };
    load();
  }, [favorites, favLoading]);

  if (favLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Natrag
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-6 h-6 text-muted-foreground fill-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-xl font-light uppercase tracking-widest text-foreground">Favoriti</h1>
      </div>

      {listings.length === 0 ? (
        <div className="border border-border bg-background p-12 text-center">
          <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-sm font-light text-muted-foreground">Nemate spremljenih favorita.</p>
          <Link to="/" className="inline-block mt-4 px-5 py-2 bg-primary text-primary-foreground font-light uppercase tracking-widest text-[10px] border border-border hover:bg-gradient-to-t hover:from-white/5 hover:to-transparent transition-all duration-300">
            Pregledaj oglase
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <Link key={listing.id} to={`/listing/${listing.id}`} className="block">
              <ListingCard car={listing} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
