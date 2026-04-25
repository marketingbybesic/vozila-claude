import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import { 
  Plus, Eye, MoreVertical, Car as CarIcon,
  ToggleLeft, ToggleRight, TrendingUp
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  price: number;
  status: 'draft' | 'active' | 'sold';
  views_count: number;
  listing_analytics?: {
    whatsapp_clicks: number;
    phone_reveals: number;
  }[];
}

export const Dashboard = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
    fetchTotalLeads();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user authenticated');
        setLoading(false);
        return;
      }

      // Fetch listings with analytics - RLS enforced by user_id filter
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          price,
          status,
          views_count,
          listing_analytics (
            whatsapp_clicks,
            phone_reveals
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data as Listing[] || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get user's listing IDs
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id);

      if (listingsError) throw listingsError;
      
      if (!listingsData || listingsData.length === 0) {
        setTotalLeads(0);
        return;
      }

      const listingIds = listingsData.map(l => l.id);

      // Calculate total leads from listing_analytics for user's listings
      const { data, error } = await supabase
        .from('listing_analytics')
        .select('whatsapp_clicks, phone_reveals')
        .in('listing_id', listingIds);

      if (error) throw error;
      
      const total = (data || []).reduce((sum, item) => 
        sum + (item.whatsapp_clicks || 0) + (item.phone_reveals || 0), 
        0
      );
      setTotalLeads(total);
    } catch (error) {
      console.error('Error fetching total leads:', error);
    }
  };

  const toggleStatus = async (listingId: string, currentStatus: string) => {
    setTogglingId(listingId);
    
    try {
      const newStatus: 'active' | 'sold' = currentStatus === 'active' ? 'sold' : 'active';
      
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId);

      if (error) throw error;
      
      // Update local state
      setListings(prev => 
        prev.map(listing => 
          listing.id === listingId 
            ? { ...listing, status: newStatus }
            : listing
        )
      );
    } catch (error) {
      console.error('Error toggling status:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('hr-HR') + ' €';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Objavljeno';
      case 'sold': return 'Prodano';
      case 'draft': return 'Nacrt';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'sold': return 'text-red-400 bg-red-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-neutral-800 rounded-lg p-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-10 w-16" />
              </div>
            ))}
          </div>
          <Skeleton variant="table" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-foreground">
              Moji Oglasi
            </h1>
            <p className="text-sm text-neutral-400 mt-2">
              Upravljanje i analitika
            </p>
          </div>
          <Link 
            to="/predaj-oglas"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Novi Oglas
          </Link>
        </div>

        {/* Analytics Lite */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Ukupno upita
              </span>
            </div>
            <p className="text-3xl font-black text-foreground">
              {totalLeads}
            </p>
          </div>
          
          <div className="bg-card border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <CarIcon className="w-5 h-5 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Ukupno oglasa
              </span>
            </div>
            <p className="text-3xl font-black text-foreground">
              {listings.length}
            </p>
          </div>
          
          <div className="bg-card border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Ukupno pregleda
              </span>
            </div>
            <p className="text-3xl font-black text-foreground">
              {listings.reduce((sum, listing) => sum + (listing.views_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Empty State */}
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card border border-neutral-800 rounded-lg">
            <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mb-6">
              <Plus className="w-12 h-12 text-neutral-400" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">
              Nema oglasa
            </h2>
            <p className="text-neutral-400 mb-8 text-center">
              Predajte svoj prvi oglas i počnite prodavati
            </p>
            <Link 
              to="/predaj-oglas"
              className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Predaj prvi oglas
            </Link>
          </div>
        ) : (
          /* Listings Table */
          <div className="bg-card border border-neutral-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">
                      Vozilo
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">
                      Cijena
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">
                      Pregledi
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">
                      Status
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link 
                          to={`/listing/${listing.id}`}
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                        >
                          {listing.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-foreground">
                          {formatPrice(listing.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-neutral-400" />
                          <span className="text-sm font-bold text-foreground">
                            {listing.views_count || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${getStatusColor(listing.status)}`}>
                          {getStatusText(listing.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleStatus(listing.id, listing.status)}
                          disabled={togglingId === listing.id || listing.status === 'draft'}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                            listing.status === 'active' 
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                              : listing.status === 'sold'
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                          } ${togglingId === listing.id ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {listing.status === 'active' ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Objavljeno
                            </>
                          ) : listing.status === 'sold' ? (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Prodano
                            </>
                          ) : (
                            <>
                              <MoreVertical className="w-4 h-4" />
                              Nacrt
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
