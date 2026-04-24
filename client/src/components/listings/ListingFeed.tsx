import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Gauge, Zap } from 'lucide-react';
import { navigationCategories } from '../../config/navigation';

const SkeletonCard = () => (
  <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm animate-pulse">
    <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-800/50"></div>
    <div className="p-6 flex flex-col flex-grow">
      <div className="h-6 bg-slate-200 dark:bg-slate-800/50 rounded w-3/4 mb-6"></div>
      <div className="flex gap-3 mb-8">
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-16"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-24"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-16"></div>
      </div>
      <div className="pt-4 border-t border-border/40 flex justify-between items-end">
        <div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800/50 rounded w-12 mb-2"></div>
          <div className="h-6 bg-slate-200 dark:bg-slate-800/50 rounded w-24"></div>
        </div>
      </div>
    </div>
  </div>
);

const subcategoriesMap: Record<string, string[]> = {
  'osobni-automobili': ['Limuzina', 'Hatchback', 'Karavan', 'SUV', 'Coupe', 'Cabriolet'],
  'motocikli': ['Sport', 'Naked', 'Cruiser', 'Enduro', 'Touring', 'Skuter'],
  'gospodarska-vozila': ['Kombi', 'Kamion', 'Tegljač', 'Prikolica'],
  'auto-dijelovi': ['Motor', 'Karoserija', 'Elektronika', 'Gume i felge'],
  'brodovi': ['Gliser', 'Jahta', 'Gumenjak', 'Jedrilica'],
  'strojevi': ['Bager', 'Traktor', 'Viličar', 'Kombajn']
};

export const ListingFeed = () => {
  const { categorySlug } = useParams();
  
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const currentCategory = navigationCategories.find(c => c.slug === categorySlug);
  const displayTitle = currentCategory ? currentCategory.label : 'SVI OGLASI';
  const currentSubcategories = categorySlug ? subcategoriesMap[categorySlug] || [] : [];

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        let query = supabase.from('listings').select('*, categories!inner(slug)').eq('status', 'active');

        if (categorySlug) {
          query = query.eq('categories.slug', categorySlug);
        }

        const { data, error } = await query;

        if (error) throw error;
        setCars(data || []);
      } catch (err) {
        console.error('Supabase Error:', err);
      } finally {
        setLoading(false);
      }
    };

    setActiveSubcategory(null);
    fetchCars();
  }, [categorySlug]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl">
      
      <div className="mb-8 space-y-4 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">
          {displayTitle}
        </h2>
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-relaxed transition-opacity duration-300">
          {loading ? 'PRETRAŽIVANJE BAZE PODATAKA...' : `PRONAĐENO ${cars.length} OGLASA`}
        </p>
      </div>

      {currentSubcategories.length > 0 && (
        <div className="flex overflow-x-auto pb-4 mb-8 gap-3 sm:gap-4 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {currentSubcategories.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSubcategory(activeSubcategory === sub ? null : sub)}
              className={`whitespace-nowrap px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 border flex-shrink-0 ${
                activeSubcategory === sub
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-md'
                  : 'bg-transparent text-slate-500 border-border hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/60 rounded-2xl bg-slate-50/50 dark:bg-card/50">
          <div className="flex flex-col items-center justify-center opacity-40 mb-6 grayscale mix-blend-multiply dark:mix-blend-screen">
            <img src="/vozilahrlogo-light.svg" alt="Vozila" className="h-8 w-auto block dark:hidden" />
            <img src="/vozilahrlogo-dark.svg" alt="Vozila" className="h-8 w-auto hidden dark:block" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-3">
            Nema rezultata
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Trenutno nema aktivnih oglasa u ovoj kategoriji. Pokušajte prilagoditi filtere ili se vratite kasnije.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cars.map((car) => {
            const specs = typeof car.attributes === 'string' ? JSON.parse(car.attributes) : car.attributes;

            return (
              <div key={car.id} className="group flex flex-col bg-card border border-border/40 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer">
                <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center overflow-hidden">
                  <div className="flex flex-col items-center justify-center opacity-20 transform group-hover:scale-110 transition-transform duration-700 grayscale">
                    <img src="/vozilahrlogo-light.svg" alt="Vozila fallback" className="h-10 w-auto block dark:hidden" />
                    <img src="/vozilahrlogo-dark.svg" alt="Vozila fallback" className="h-10 w-auto hidden dark:block" />
                  </div>
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100 shadow-sm">
                    Premium
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="mb-4 flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2 group-hover:text-primary transition-colors">
                      {car.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 mt-4">
                      {specs.godina && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {specs.godina}</span>}
                      {specs.kilometraza && <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> {specs.kilometraza.toLocaleString()} km</span>}
                      {specs.snaga_ks && <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {specs.snaga_ks} KS</span>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/40 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cijena</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {car.price.toLocaleString('hr-HR')} <span className="text-sm font-medium text-muted-foreground ml-1">{car.currency}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};