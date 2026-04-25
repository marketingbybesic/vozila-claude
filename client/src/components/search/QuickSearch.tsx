import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { navigationMenu } from '../../config/taxonomy';

interface QuickSearchFilters {
  categorySlug: string;
  brand?: string;
  model?: string;
  priceMin?: string;
  priceMax?: string;
  yearMin?: string;
  yearMax?: string;
  mileageMax?: string;
}

export const QuickSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [filters, setFilters] = useState<QuickSearchFilters>({
    categorySlug: 'osobni-automobili',
    brand: searchParams.get('brand') || '',
    model: searchParams.get('model') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    yearMin: searchParams.get('yearMin') || '',
    yearMax: searchParams.get('yearMax') || '',
    mileageMax: searchParams.get('mileageMax') || '',
  });

  // Mock brand data - in production, fetch from API
  const brands = useMemo(() => {
    const brandList = [
      'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Volvo', 'Skoda', 'Renault',
      'Peugeot', 'Fiat', 'Ford', 'Opel', 'Hyundai', 'Kia', 'Toyota', 'Honda',
      'Nissan', 'Mazda', 'Suzuki', 'Dacia', 'Seat', 'Citroën', 'Jeep', 'Alfa Romeo'
    ];
    return brandList.sort();
  }, []);

  // Mock models - in production, fetch based on selected brand
  const models = useMemo(() => {
    const modelList = [
      'A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7',
      '3 Series', '5 Series', '7 Series', 'X3', 'X5',
      'C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE',
      'Golf', 'Passat', 'Tiguan', 'Polo',
      'V90', 'XC60', 'XC90'
    ];
    return modelList.sort();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Build query string
    const queryParams = new URLSearchParams();
    if (filters.brand) queryParams.set('brand', filters.brand);
    if (filters.model) queryParams.set('model', filters.model);
    if (filters.priceMin) queryParams.set('priceMin', filters.priceMin);
    if (filters.priceMax) queryParams.set('priceMax', filters.priceMax);
    if (filters.yearMin) queryParams.set('yearMin', filters.yearMin);
    if (filters.yearMax) queryParams.set('yearMax', filters.yearMax);
    if (filters.mileageMax) queryParams.set('mileageMax', filters.mileageMax);

    // Navigate to category with filters
    const queryString = queryParams.toString();
    navigate(`/${filters.categorySlug}${queryString ? `?${queryString}` : ''}`);
  };

  const handleInputChange = (field: keyof QuickSearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="w-full bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Pronađi vozilo
          </h1>
          <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-neutral-400">
            Pretraži našu bazu od 10,000+ vozila
          </p>
        </div>

        {/* Search Form - Porsche Design */}
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Row 1: Category, Brand, Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Kategorija
              </label>
              <select
                value={filters.categorySlug}
                onChange={(e) => handleInputChange('categorySlug', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30 transition-all"
              >
                {navigationMenu.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Dropdown */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Marka
              </label>
              <select
                value={filters.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30 transition-all"
              >
                <option value="">Sve marke</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Dropdown */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Model
              </label>
              <select
                value={filters.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                disabled={!filters.brand}
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Svi modeli</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button - Spans on mobile, single column on desktop */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-white text-black rounded-none px-6 py-3 font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" strokeWidth={2} />
                Pretraži
              </button>
            </div>
          </div>

          {/* Row 2: Price Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Cijena od (€)
              </label>
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => handleInputChange('priceMin', e.target.value)}
                placeholder="0"
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Cijena do (€)
              </label>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => handleInputChange('priceMax', e.target.value)}
                placeholder="999999"
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Godište od
              </label>
              <input
                type="number"
                value={filters.yearMin}
                onChange={(e) => handleInputChange('yearMin', e.target.value)}
                placeholder="2000"
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Godište do
              </label>
              <input
                type="number"
                value={filters.yearMax}
                onChange={(e) => handleInputChange('yearMax', e.target.value)}
                placeholder={new Date().getFullYear().toString()}
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
          </div>

          {/* Row 3: Mileage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                Kilometraža do
              </label>
              <input
                type="number"
                value={filters.mileageMax}
                onChange={(e) => handleInputChange('mileageMax', e.target.value)}
                placeholder="999999"
                className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
          </div>
        </form>

        {/* Quick Stats */}
        <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-white">10,000+</p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest">Vozila</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">500+</p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest">Prodavača</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">24/7</p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest">Dostupno</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">100%</p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest">Sigurno</p>
          </div>
        </div>
      </div>
    </div>
  );
};
