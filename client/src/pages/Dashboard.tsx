import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import { PromoteListingButton } from '../components/listings/PromoteListingButton';
import {
  Plus, Eye, MoreVertical, Car as CarIcon,
  ToggleLeft, ToggleRight, TrendingUp, Pause, Play, Trash2, CheckCircle2
} from 'lucide-react';
import { matchScore } from '../lib/matchScore';

type ListingStatus = 'draft' | 'active' | 'paused' | 'sold';

interface Listing {
  id: string;
  title: string;
  price: number;
  status: ListingStatus;
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
      
      // Get current user (unauth visit is expected — silently bail to "Login required" UI)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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

  const setStatus = async (listingId: string, newStatus: ListingStatus) => {
    setTogglingId(listingId);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId);
      if (error) throw error;
      setListings(prev => prev.map(l => (l.id === listingId ? { ...l, status: newStatus } : l)));
    } catch (e) {
      console.error('Error updating status:', e);
      alert('Promjena statusa nije uspjela.');
    } finally {
      setTogglingId(null);
    }
  };

  const deleteListing = async (listingId: string) => {
    if (!confirm('Sigurno želite obrisati ovaj oglas? Akcija je nepovratna.')) return;
    setTogglingId(listingId);
    try {
      const { error } = await supabase.from('listings').delete().eq('id', listingId);
      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== listingId));
    } catch (e) {
      console.error('Error deleting listing:', e);
      alert('Brisanje nije uspjelo.');
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
      case 'paused': return 'Pauzirano';
      case 'sold':   return 'Prodano';
      case 'draft':  return 'Nacrt';
      default:       return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'paused': return 'text-amber-400 bg-amber-400/10';
      case 'sold':   return 'text-red-400 bg-red-400/10';
      case 'draft':  return 'text-yellow-400 bg-yellow-400/10';
      default:       return 'text-slate-400 bg-slate-400/10';
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

        {/* Analytics — 4 editorial stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          <StatCard label="Aktivnih oglasa" value={String(listings.filter(l => l.status === 'active').length)} icon={CarIcon} />
          <StatCard label="Ukupno pregleda" value={listings.reduce((s, l) => s + (l.views_count || 0), 0).toLocaleString('hr-HR')} icon={Eye} />
          <StatCard label="Ukupno upita" value={String(totalLeads)} icon={TrendingUp} />
          <StatCard
            label="Prosječni Match Score"
            value={(() => {
              const active = listings.filter(l => l.status === 'active');
              if (active.length === 0) return '—';
              const avg = active.reduce((s, l) => s + matchScore(l as any).total, 0) / active.length;
              return `${Math.round(avg)}/100`;
            })()}
            icon={ToggleRight}
            accent
          />
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
                      Match Score
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-neutral-400">
                      Promocija
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
                        {(() => {
                          const ms = matchScore(listing as any);
                          const tone = ms.band === 'Premium' ? 'text-primary border-primary/40 bg-primary/5'
                                    : ms.band === 'Solid'   ? 'text-foreground border-foreground/30'
                                    :                          'text-muted-foreground border-border';
                          return (
                            <span
                              title={ms.reasons.length ? ms.reasons.join(' · ') : 'Osnovni oglas'}
                              className={`inline-flex items-baseline gap-1 px-2 py-0.5 text-[10px] font-light uppercase tracking-[0.2em] tabular-nums border ${tone}`}
                            >
                              <span className="font-medium tabular-nums">{ms.total}</span>
                              <span className="opacity-60">/100</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${getStatusColor(listing.status)}`}>
                          {getStatusText(listing.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <PromoteListingButton
                          listingId={listing.id}
                          onPromoted={fetchListings}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Edit: jump to wizard preloaded with this listing (wizard reads ?edit=<id>) */}
                          <Link
                            to={`/predaj-oglas?edit=${listing.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border text-foreground hover:border-primary text-[10px] font-light uppercase tracking-[0.2em] transition-colors"
                            title="Uredi"
                          >
                            <MoreVertical className="w-3 h-3" strokeWidth={1.5} />
                            Uredi
                          </Link>

                          {/* Pause / Resume — only when active or paused */}
                          {listing.status === 'active' && (
                            <button
                              onClick={() => setStatus(listing.id, 'paused')}
                              disabled={togglingId === listing.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 text-[10px] font-light uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                              title="Pauziraj"
                            >
                              <Pause className="w-3 h-3" strokeWidth={1.5} />
                              Pauziraj
                            </button>
                          )}
                          {listing.status === 'paused' && (
                            <button
                              onClick={() => setStatus(listing.id, 'active')}
                              disabled={togglingId === listing.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 text-[10px] font-light uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                              title="Nastavi"
                            >
                              <Play className="w-3 h-3" strokeWidth={1.5} />
                              Nastavi
                            </button>
                          )}

                          {/* Mark sold — when active or paused */}
                          {(listing.status === 'active' || listing.status === 'paused') && (
                            <button
                              onClick={() => setStatus(listing.id, 'sold')}
                              disabled={togglingId === listing.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-[10px] font-light uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                              title="Označi kao prodano"
                            >
                              <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                              Prodano
                            </button>
                          )}

                          {/* Restore — when sold */}
                          {listing.status === 'sold' && (
                            <button
                              onClick={() => setStatus(listing.id, 'active')}
                              disabled={togglingId === listing.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 text-[10px] font-light uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                              title="Vrati u prodaju"
                            >
                              <ToggleRight className="w-3 h-3" strokeWidth={1.5} />
                              Vrati
                            </button>
                          )}

                          {/* Delete — always available */}
                          <button
                            onClick={() => deleteListing(listing.id)}
                            disabled={togglingId === listing.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-400 hover:bg-red-500/10 text-[10px] font-light uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                            title="Obriši"
                          >
                            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                        </div>
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

const StatCard = ({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: any; accent?: boolean }) => (
  <div className={`p-5 sm:p-6 border ${accent ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'}`}>
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-3.5 h-3.5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={1.5} aria-hidden="true" />
      <span className="text-[9px] font-light uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
    </div>
    <p className={`text-2xl sm:text-3xl font-light tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>
      {value}
    </p>
  </div>
);
