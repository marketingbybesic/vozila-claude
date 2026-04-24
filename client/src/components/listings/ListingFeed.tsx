import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, Gauge, Zap, SlidersHorizontal, ChevronDown, ChevronUp, 
  Search, Box, Clock, ArrowDown10, ArrowUp01, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import { navigationCategories } from '../../config/navigation';
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
      className="group flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-700 ease-premium cursor-pointer h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setCurrentImgIdx(0); }}
    >
      {/* Image Wrapper with Carousel */}
      <div className="relative aspect-[4/3] bg-slate-100/50 dark:bg-slate-800/30 flex items-center justify-center overflow-hidden">
        {displayImg ? (
          <img 
            src={displayImg} 
            alt={car.title} 
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium ${isHovered && sortedImages.length <= 1 ? 'scale-110' : ''}`} 
          />
        ) : (
          <img src="/vozilahrlogo.svg" alt="Nema slike" className="h-10 w-auto opacity-10 dark:opacity-20 transform group-hover:scale-110 transition-transform duration-700 ease-premium" />
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
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {Number(car.price).toLocaleString('hr-HR')} <span className="text-base font-bold text-slate-400 ml-0.5">{car.currency || '€'}</span>
            </p>
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
  const { categorySlug } = useParams();
  
  const [cars, setCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState({
    priceMin: '', priceMax: '',
    yearMin: '', yearMax: '',
    mileageMax: '', powerMin: ''
  });

  const currentCategory = navigationCategories.find(c => c.slug === categorySlug);
  const displayTitle = currentCategory ? currentCategory.label : 'SVI OGLASI';
  const CategoryIcon = currentCategory ? currentCategory.icon : Box;

  const fetchListings = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      
      let query = supabase
        .from('listings')
        .select('*, categories!inner(slug), listing_images(id, url, is_primary, sort_order)', { count: 'exact' })
        .eq('status', 'active');

      // Map Croatian SEO slug from URL to English DB slug
      if (categorySlug) {
        const mappedCategory = navigationCategories.find(c => c.slug === categorySlug);
        if (mappedCategory) {
          query = query.eq('categories.slug', mappedCategory.dbSlug);
        } else {
          query = query.eq('categories.slug', categorySlug); // Fallback
        }
      }
      if (filters.priceMin) query = query.gte('price', parseInt(filters.priceMin));
      if (filters.priceMax) query = query.lte('price', parseInt(filters.priceMax));
      if (filters.yearMin) query = query.gte('year', parseInt(filters.yearMin));
      if (filters.yearMax) query = query.lte('year', parseInt(filters.yearMax));
      if (filters.mileageMax) query = query.lte('mileage', parseInt(filters.mileageMax));
      
      if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

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
  }, [categorySlug, sortBy]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

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
              <Accordion title="Osnovno" defaultOpen={true}>
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Cijena (€)</label>
                    <div className="flex gap-2">
                      <input type="number" name="priceMin" placeholder="Od" value={filters.priceMin} onChange={handleFilterChange} className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400" />
                      <input type="number" name="priceMax" placeholder="Do" value={filters.priceMax} onChange={handleFilterChange} className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Godina proizvodnje</label>
                    <div className="flex gap-2">
                      <input type="number" name="yearMin" placeholder="Od" value={filters.yearMin} onChange={handleFilterChange} className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400" />
                      <input type="number" name="yearMax" placeholder="Do" value={filters.yearMax} onChange={handleFilterChange} className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400" />
                    </div>
                  </div>
                </div>
              </Accordion>

              <Accordion title="Karakteristike" defaultOpen={true}>
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Max. Kilometraža</label>
                    <input type="number" name="mileageMax" placeholder="Npr. 150000" value={filters.mileageMax} onChange={handleFilterChange} className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Min. Snaga (KS)</label>
                    <input type="number" name="powerMin" placeholder="Npr. 150" value={filters.powerMin} onChange={handleFilterChange} className="w-full bg-background/50 border border-border/60 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400" />
                  </div>
                </div>
              </Accordion>

              <button onClick={() => fetchListings(false)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[11px] py-4 rounded-xl hover:scale-[1.02] transition-transform duration-300 shadow-xl shadow-slate-900/10 dark:shadow-white/10 mt-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-6 xl:gap-8">
              {cars.map((car) => (
                <ListingCard key={car.id} car={car} />
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