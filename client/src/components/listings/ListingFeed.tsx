import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getAnalytics } from '../../lib/analytics';
import { 
  Calendar, Gauge, Zap, SlidersHorizontal, ChevronDown, ChevronUp, 
  Search, Box, Clock, ArrowDown10, ArrowUp01, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import { navigationMenu } from '../../config/taxonomy';
import { globalFilters, categoryFilters, FilterDefinition } from '../../config/filters';
import { Listing } from '../../types';

const ITEMS_PER_PAGE = 9;

// --- CUSTOM UI COMPONENTS ---

const Accordion = ({ title, children, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40 last:border-0 py-4 first:pt-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors">
          {title}
        </span>
        {isOpen ? 
          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" /> : 
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
        }
      </button>
      <div className={`overflow-hidden transition-all duration-500 ease-premium ${isOpen ? 'max-h-[500px] opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

const SortDropdown = ({ value, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { id: 'newest', label: 'Najnovije dodano', icon: Clock },
    { id: 'price_asc', label: 'Cijena: Najniža', icon: ArrowDown10 },
    { id: 'price_desc', label: 'Cijena: Najviša', icon: ArrowUp01 },
  ];

  const selected = options.find(o => o.id === value) || options[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative min-w-[240px]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-card/60 backdrop-blur-sm border border-border/60 pl-4 pr-3 py-3.5 rounded-xl hover:border-primary/50 transition-colors shadow-sm group"
      >
        <div className="flex items-center gap-2">
          <SelectedIcon className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
            {selected.label}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-full bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => { onChange(option.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  value === option.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${value === option.id ? 'text-primary' : 'text-slate-400'}`} />
                <span className="text-[11px] font-bold uppercase tracking-widest">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StateDisplay = ({ icon: Icon, title, subtitle, isSpinning = false }: any) => (
  <div className="flex flex-col items-center justify-center py-24 text-center w-full">
    <div className="relative flex items-center justify-center w-40 h-40 mb-8 group">
      <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 blur-[40px] rounded-full scale-110 group-hover:scale-125 transition-transform duration-700"></div>
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl">
        <Icon className={`w-10 h-10 text-slate-800 dark:text-slate-100 ${isSpinning ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
      </div>
    </div>
    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3">
      {title}
    </h3>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
      {subtitle}
    </p>
  </div>
);

// --- PREMIUM LISTING CARD COMPONENT ---

const ListingCard = ({ car }: { car: Listing }) => {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const specs = typeof car.attributes === 'string' ? JSON.parse(car.attributes) : car.attributes;
  const images = car.listing_images?.length > 0 ? car.listing_images : [];
  
  // Ensure we sort images if they exist so primary is first
  const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  const displayImg = sortedImages[currentImgIdx]?.url;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev + 1) % sortedImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  };

  return (
    <div 
      className="group flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-700 ease-premium cursor-pointer h-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setCurrentImgIdx(0); }}
    >
      {/* Image Wrapper with Professional Studio Effect */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
        {displayImg ? (
          <>
            {/* Background Layer: Blurred Stage */}
            <img 
              src={displayImg} 
              alt={`${car.title} background`}
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 transition-transform duration-1000 ease-premium"
            />
            {/* Foreground Layer: Centered Car */}
            <img 
              src={displayImg} 
              alt={car.title} 
              className={`absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-1000 ease-premium ${isHovered && sortedImages.length <= 1 ? 'scale-110' : ''}`} 
            />
          </>
        ) : (
          <img src="/vozilahrlogo.svg" alt="Nema slike" className="h-10 w-auto opacity-10 dark:opacity-20 transform group-hover:scale-110 transition-transform duration-1000 ease-premium" />
        )}
        
        {/* Navigation Arrows (Only show if multiple images and hovered) */}
        {isHovered && sortedImages.length > 1 && (
          <>
            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Carousel Indicators */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {sortedImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1 rounded-full transition-all duration-300 ${idx === currentImgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
          {car.featured && (
            <div className="px-3 py-1.5 bg-white/95 dark:bg-black/95 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest text-primary shadow-lg">
              Premium
            </div>
          )}
        </div>

        {/* Psychological Trigger: View Counter Overlay on Hover */}
        <div className={`absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <Eye className="w-3 h-3" />
          {car.views_count + 124} pregleda
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 xl:p-6 flex flex-col flex-grow">
        <div className="mb-5 flex-grow">
          <h3 className="text-base xl:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-2">
            {car.title}
          </h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px] xl:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {(specs.godina || car.year) && <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {specs.godina || car.year}</span>}
            {(specs.kilometraza || car.mileage) && <span className="flex items-center gap-2"><Gauge className="w-3.5 h-3.5 text-slate-400" /> {(specs.kilometraza || car.mileage).toLocaleString()} km</span>}
            {specs.snaga_ks && <span className="flex items-center gap-2 col-span-2"><Zap className="w-3.5 h-3.5 text-slate-400" /> {specs.snaga_ks} KS</span>}
          </div>
        </div>

        <div className="mt-auto pt-5 border-t border-border/40 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Cijena</p>
            {Number(car.price) === 0 ? (
              <p className="text-2xl font-black italic text-primary tracking-tight drop-shadow-sm">
                Na upit
              </p>
            ) : (
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {Number(car.price).toLocaleString('hr-HR')} <span className="text-base font-bold text-slate-400 ml-0.5">{car.currency || '€'}</span>
              </p>
            )}
          </div>
          
          {/* Rent or Buy Badge - Dynamic based on category or attributes later */}
          <div className="px-3 py-1.5 border border-border/60 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-500">
            Prodaja
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN FEED COMPONENT ---

export const ListingFeed = () => {
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  
  const [cars, setCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState<Record<string, string>>({
    priceMin: '', priceMax: '',
    yearMin: '', yearMax: '',
    mileageMax: '', powerMin: '',
    lat: '', lng: '', radiusKm: ''
  });

  const currentCategory = navigationMenu.find(c => c.slug === categorySlug);
  const displayTitle = currentCategory ? currentCategory.name : 'SVI OGLASI';
  const CategoryIcon = currentCategory?.icon || Box;

  const fetchListings = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      
      // 1. Determine if we are doing a radius search or a standard search
      let query: any;
      if (filters.radiusKm && filters.lat && filters.lng) {
        // Use our custom PostGIS RPC function
        query = supabase.rpc('search_listings_by_radius', {
          search_lat: parseFloat(filters.lat),
          search_lng: parseFloat(filters.lng),
          radius_km: parseFloat(filters.radiusKm)
        });
      } else {
        // Standard table query
        query = supabase.from('listings').select('*, categories!inner(slug), listing_images(id, url, is_primary, sort_order)', { count: 'exact' });
      }

      // Base Filters
      query = query.eq('status', 'active');
      if (categorySlug) query = query.eq('categories.slug', categorySlug);

      // Global Numeric Filters
      if (filters.priceMin) query = query.gte('price', parseInt(filters.priceMin));
      if (filters.priceMax) query = query.lte('price', parseInt(filters.priceMax));

      // JSONB DYNAMIC FILTERS (The Magic)
      // We loop over the filters state. If the key isn't price/lat/lng/radius, it's a JSONB attribute!
      Object.entries(filters).forEach(([key, value]) => {
        if (!value || ['priceMin', 'priceMax', 'lat', 'lng', 'radiusKm'].includes(key)) return;
        
        // If it's a min/max range (e.g., yearMin, mileageMax)
        if (key.endsWith('Min')) {
          const attr = key.replace('Min', '');
          query = query.gte(`attributes->>${attr}`, parseInt(value as string));
        } else if (key.endsWith('Max')) {
          const attr = key.replace('Max', '');
          query = query.lte(`attributes->>${attr}`, parseInt(value as string));
        } 
        // If it's an exact match (e.g., fuel: 'Diesel', condition: 'Novo')
        else {
          query = query.eq(`attributes->>${key}`, value);
        }
      });
      
      // Sorting
      if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      // Pagination
      const from = (isLoadMore ? page + 1 : 0) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      if (isLoadMore) {
        setCars(prev => [...prev, ...(data as Listing[] || [])]);
        setPage(page + 1);
      } else {
        setCars(data as Listing[] || []);
        setPage(0);
      }
      
      setHasMore(count !== null && to < count - 1);
    } catch (err) {
      console.error('Supabase Error:', err);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, filters, sortBy, page]);

  useEffect(() => {
    fetchListings();
  }, [categorySlug, sortBy, fetchListings]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Dynamic filter input renderer with visual chips
  const renderFilterInput = (filter: FilterDefinition) => {
    if (filter.type === 'range') {
      // Histograph bars (dummy data visualization)
      const histogramHeights = [40, 60, 80, 100, 90, 70, 85, 95, 75, 50];
      
      return (
        <div className="space-y-3">
          {/* Mini Histogram */}
          <div className="flex items-end justify-between gap-0.5 h-8 px-1">
            {histogramHeights.map((height, idx) => (
              <div 
                key={idx}
                className="flex-1 bg-primary/20 rounded-t transition-all duration-300 hover:bg-primary/40"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          
          {/* Range Inputs */}
          <div className="flex gap-2">
            <input 
              type="number" 
              name={`${filter.id}Min`} 
              placeholder="Od" 
              value={filters[`${filter.id}Min`] || ''} 
              onChange={handleFilterChange} 
              className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all" 
            />
            <input 
              type="number" 
              name={`${filter.id}Max`} 
              placeholder="Do" 
              value={filters[`${filter.id}Max`] || ''} 
              onChange={handleFilterChange} 
              className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all" 
            />
          </div>
        </div>
      );
    }
    if (filter.type === 'select') {
      // Choice Chips instead of dropdown
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilters(prev => ({ ...prev, [filter.id]: '' }))}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              !filters[filter.id] 
                ? 'bg-primary text-white border-2 border-primary' 
                : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50'
            }`}
          >
            Sve
          </button>
          {filter.options?.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilters(prev => ({ ...prev, [filter.id]: String(opt.value) }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                filters[filter.id] === String(opt.value)
                  ? 'bg-primary text-white border-2 border-primary'
                  : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    }
    if (filter.type === 'radio') {
      // Choice Chips for radio too
      return (
        <div className="flex flex-wrap gap-2">
          {filter.options?.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilters(prev => ({ ...prev, [filter.id]: String(opt.value) }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                filters[filter.id] === String(opt.value)
                  ? 'bg-primary text-white border-2 border-primary'
                  : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get category-specific filters
  const currentCatFilters = categorySlug ? categoryFilters[categorySlug] : categoryFilters['osobni-automobili'];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-[1700px] flex flex-col xl:flex-row gap-8 lg:gap-12">
      
      <aside className="w-full xl:w-[320px] flex-shrink-0">
        <div className="sticky top-24 relative">
          <div className="absolute inset-0 bg-primary/5 blur-[50px] rounded-3xl -z-10 pointer-events-none"></div>
          
          <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-5">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                Napredna Pretraga
              </h3>
            </div>

            <div className="space-y-2">
              {/* Accordion 1: Lokacija (Radius Search) */}
              <Accordion title="Lokacija" defaultOpen={false}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grad</label>
                    <select 
                      name="locationSelect"
                      onChange={(e) => {
                        const [lat, lng] = e.target.value.split(',');
                        setFilters(prev => ({ ...prev, lat, lng }));
                      }}
                      className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary appearance-none outline-none transition-all"
                    >
                      <option value="">Odaberi grad...</option>
                      <option value="45.815,15.981">Zagreb</option>
                      <option value="43.508,16.440">Split</option>
                      <option value="45.327,14.442">Rijeka</option>
                      <option value="42.650,18.094">Dubrovnik</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Radijus: {filters.radiusKm || 50} km
                    </label>
                    <input 
                      type="range" 
                      name="radiusKm"
                      min="0" 
                      max="100" 
                      value={filters.radiusKm || 50}
                      onChange={handleFilterChange}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </Accordion>

              {/* Accordion 2: Osnovno (Global Filters) */}
              <Accordion title="Osnovno" defaultOpen={true}>
                <div className="space-y-4">
                  {globalFilters.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {filter.label} {filter.unit && `(${filter.unit})`}
                      </label>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>
              </Accordion>

              {/* Accordion 3: Karakteristike (Category-Specific Filters) */}
              {currentCatFilters && currentCatFilters.length > 0 && (
                <Accordion title="Karakteristike" defaultOpen={true}>
                  <div className="space-y-4">
                    {currentCatFilters.map((filter) => (
                      <div key={filter.id} className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {filter.label} {filter.unit && `(${filter.unit})`}
                        </label>
                        {renderFilterInput(filter)}
                      </div>
                    ))}
                  </div>
                </Accordion>
              )}

              <button 
                onClick={() => {
                  fetchListings(false);
                  try {
                    const analytics = getAnalytics();
                    const searchTerms = Object.entries(filters)
                      .filter(([, v]) => v)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(' ');
                    analytics.trackSearchPerformed(searchTerms || 'filter_applied', filters);
                  } catch {
                    // Analytics not initialized yet, silently fail
                  }
                }}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[11px] py-4 rounded-xl hover:scale-[1.02] transition-transform duration-300 shadow-xl shadow-slate-900/10 dark:shadow-white/10 mt-6"
              >
                Primijeni Filtere
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
              {displayTitle}
            </h2>
          </div>

          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>

        {loading && page === 0 ? (
          <StateDisplay 
            icon={CategoryIcon} 
            title={displayTitle} 
            subtitle={`Učitavanje baze podataka za kategoriju ${displayTitle.toLowerCase()}...`} 
            isSpinning={true}
          />
        ) : cars.length === 0 ? (
          <StateDisplay 
            icon={CategoryIcon} 
            title="Nema Rezultata" 
            subtitle="Trenutno nema vozila koja odgovaraju vašim kriterijima. Pokušajte izmijeniti filtere." 
          />
        ) : (
          <>
            {/* Quick Filters Bar */}
            <div className="mb-8 p-4 bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Brzi Filteri
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, transmission: 'Automatik' }))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    filters.transmission === 'Automatik'
                      ? 'bg-primary text-white border-2 border-primary shadow-lg'
                      : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                  }`}
                >
                  🚗 Samo Automatik
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, priceMax: '20000' }))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    filters.priceMax === '20000'
                      ? 'bg-primary text-white border-2 border-primary shadow-lg'
                      : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                  }`}
                >
                  💰 Ispod 20.000€
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, yearMin: '2020' }))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    filters.yearMin === '2020'
                      ? 'bg-primary text-white border-2 border-primary shadow-lg'
                      : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                  }`}
                >
                  ✨ Novi oglasi (2020+)
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, fuel: 'Struja' }))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    filters.fuel === 'Struja'
                      ? 'bg-primary text-white border-2 border-primary shadow-lg'
                      : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                  }`}
                >
                  ⚡ Električni
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, mileageMax: '50000' }))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    filters.mileageMax === '50000'
                      ? 'bg-primary text-white border-2 border-primary shadow-lg'
                      : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                  }`}
                >
                  🎯 Mala kilometraža
                </button>
                {/* Clear All Filters */}
                {Object.values(filters).some(v => v) && (
                  <button
                    onClick={() => setFilters({ priceMin: '', priceMax: '', yearMin: '', yearMax: '', mileageMax: '', powerMin: '', lat: '', lng: '', radiusKm: '' })}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-red-500/10 border-2 border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all duration-200"
                  >
                    ✕ Očisti sve
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-6 xl:gap-8">
              {cars.map((car) => (
                <Link key={car.id} to={`/listing/${car.id}`}>
                  <ListingCard car={car} />
                </Link>
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button 
                  onClick={() => fetchListings(true)}
                  disabled={loading}
                  className="px-8 py-4 bg-card border border-border/60 text-slate-900 dark:text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-secondary transition-colors shadow-sm"
                >
                  {loading ? 'Učitavanje...' : 'Prikaži Više'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};