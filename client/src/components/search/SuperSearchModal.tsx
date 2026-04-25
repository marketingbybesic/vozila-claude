import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, X, ArrowRight } from 'lucide-react';
import { globalFilters, categoryFilters, FilterDefinition } from '../../config/filters';
import { navigationMenu } from '../../config/taxonomy';

interface SuperSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterGroupKey = 'Tehnički podaci' | 'Oprema' | 'Sigurnost' | 'Opće';

const GROUP_ORDER: FilterGroupKey[] = ['Opće', 'Tehnički podaci', 'Oprema', 'Sigurnost'];
const GROUP_LABELS: Record<FilterGroupKey, string> = {
  'Opće': 'Osnovno',
  'Tehnički podaci': 'Tehnički podaci',
  'Oprema': 'Oprema',
  'Sigurnost': 'Sigurnost',
};

export const SuperSearchModal = ({ open, onOpenChange }: SuperSearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('osobni-automobili');
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    Object.entries(advancedFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate('/?' + params.toString());
    onOpenChange(false);
    setSearchQuery('');
    setAdvancedFilters({});
  };

  const handleFilterChange = (name: string, value: string) => {
    setAdvancedFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setAdvancedFilters({});
    setSearchQuery('');
  };

  const uniqueCategories = useMemo(() => {
    const seen = new Map<string, typeof navigationMenu[0]>();
    navigationMenu.forEach((cat) => {
      if (!seen.has(cat.slug)) seen.set(cat.slug, cat);
    });
    return Array.from(seen.values());
  }, []);

  const selectedCategoryObj = useMemo(() => {
    return uniqueCategories.find((c) => c.slug === selectedCategory);
  }, [uniqueCategories, selectedCategory]);

  const allFilters = useMemo(() => {
    const catFilters = categoryFilters[selectedCategory] || [];
    return [...globalFilters, ...catFilters];
  }, [selectedCategory]);

  const groupedFilters = useMemo(() => {
    const groups: Record<string, FilterDefinition[]> = {};
    allFilters.forEach(filter => {
      const group = filter.group || 'Opće';
      if (!groups[group]) groups[group] = [];
      groups[group].push(filter);
    });
    return groups;
  }, [allFilters]);

  const renderFilterInput = (filter: FilterDefinition) => {
    if (filter.type === 'range') {
      return (
        <div className="flex gap-2">
          <input
            type="number"
            name={`${filter.id}Min`}
            placeholder="Od"
            value={advancedFilters[`${filter.id}Min`] || ''}
            onChange={(e) => handleFilterChange(`${filter.id}Min`, e.target.value)}
            className="flex-1 h-9 px-3 bg-white/5 border border-white/10 text-white placeholder-white/20 text-xs font-light focus:outline-none focus:border-white/30 transition-colors"
          />
          <input
            type="number"
            name={`${filter.id}Max`}
            placeholder="Do"
            value={advancedFilters[`${filter.id}Max`] || ''}
            onChange={(e) => handleFilterChange(`${filter.id}Max`, e.target.value)}
            className="flex-1 h-9 px-3 bg-white/5 border border-white/10 text-white placeholder-white/20 text-xs font-light focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
      );
    }
    if (filter.type === 'select' || filter.type === 'radio') {
      return (
        <select
          name={filter.id}
          value={advancedFilters[filter.id] || ''}
          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          className="w-full h-9 px-3 bg-white/5 border border-white/10 text-white text-xs font-light focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
        >
          <option value="" className="bg-black text-white">Sve</option>
          {filter.options?.map(opt => (
            <option key={opt.value} value={String(opt.value)} className="bg-black text-white">
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return null;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          className="fixed inset-0 bg-black/80 z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={() => onOpenChange(false)}
        />

        {/* Content - Large Centered Frosted Interface */}
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-4xl max-h-[90vh] overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="relative backdrop-blur-xl bg-black/60 border border-white/10">
            {/* Fallback background for no backdrop-filter */}
            <div className="absolute inset-0 bg-black/80 -z-10" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <Dialog.Title className="text-xs font-light uppercase tracking-widest text-white/60 flex items-center gap-3">
                <Search className="h-4 w-4 text-white/40" strokeWidth={1.5} />
                Napredna pretraga
              </Dialog.Title>
              <Dialog.Close className="p-2 text-white/40 hover:text-white hover:bg-white/5 transition-all duration-200">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Search Input */}
              <div className="px-6 py-4 border-b border-white/10">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Unesite pojam..."
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm font-light focus:outline-none focus:border-white/30 transition-colors"
                  autoFocus
                />
              </div>

              {/* Category Selector */}
              <div className="px-6 py-4 border-b border-white/10">
                <label className="block text-[10px] font-light uppercase tracking-widest text-white/40 mb-3">
                  Kategorija
                </label>
                <div className="flex flex-wrap gap-2">
                  {uniqueCategories.map((category) => (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.slug);
                        setAdvancedFilters(prev => ({ ...prev, subcategory: '' }));
                      }}
                      className={`px-4 py-2 text-[10px] font-light uppercase tracking-widest border transition-all duration-200 ${
                        selectedCategory === category.slug
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory Selector */}
              {selectedCategoryObj && selectedCategoryObj.sub.length > 0 && (
                <div className="px-6 py-4 border-b border-white/10">
                  <label className="block text-[10px] font-light uppercase tracking-widest text-white/40 mb-3">
                    Podkategorija
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleFilterChange('subcategory', '')}
                      className={`px-4 py-2 text-[10px] font-light uppercase tracking-widest border transition-all duration-200 ${
                        !advancedFilters.subcategory
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      Sve
                    </button>
                    {selectedCategoryObj.sub.map((subcat) => (
                      <button
                        key={subcat.slug}
                        type="button"
                        onClick={() => handleFilterChange('subcategory', subcat.slug)}
                        className={`px-4 py-2 text-[10px] font-light uppercase tracking-widest border transition-all duration-200 ${
                          advancedFilters.subcategory === subcat.slug
                            ? 'bg-white text-black border-white'
                            : 'bg-transparent text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {subcat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Groups */}
              <div className="px-6 py-4 space-y-6">
                {GROUP_ORDER.map((groupKey) => {
                  const filters = groupedFilters[groupKey];
                  if (!filters || filters.length === 0) return null;
                  return (
                    <div key={groupKey}>
                      <h3 className="text-[10px] font-light uppercase tracking-widest text-white/40 mb-3 pb-2 border-b border-white/10">
                        {GROUP_LABELS[groupKey]}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filters.map((filter) => (
                          <div key={filter.id}>
                            <label className="block text-[10px] font-light uppercase tracking-widest text-white/30 mb-2">
                              {filter.label} {filter.unit && <span className="text-white/20">({filter.unit})</span>}
                            </label>
                            {renderFilterInput(filter)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[10px] font-light uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors duration-200"
                >
                  Očisti filtere
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="px-6 py-3 border border-white/10 text-white/60 text-xs font-light uppercase tracking-widest hover:border-white/30 hover:text-white transition-all duration-200"
                  >
                    Odustani
                  </button>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-light uppercase tracking-widest hover:bg-white/90 transition-all duration-200"
                  >
                    Pretraži
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
