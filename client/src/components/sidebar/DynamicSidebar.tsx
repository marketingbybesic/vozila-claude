import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { globalFilters, categoryFilters, FilterDefinition } from '../../config/filters';

interface DynamicSidebarProps {
  categorySlug: string;
}

export const DynamicSidebar = ({ categorySlug }: DynamicSidebarProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    global: true,
    category: true,
  });

  // Get filters for current category
  const currentCategoryFilters = categoryFilters[categorySlug] || [];

  // Parse URL params into filter state
  const getFilterValue = useCallback((filterId: string) => {
    const param = searchParams.get(filterId);
    if (!param) return null;

    // Try to parse as JSON for range filters
    try {
      return JSON.parse(param);
    } catch {
      return param;
    }
  }, [searchParams]);

  // Update URL when filter changes
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    const newParams = new URLSearchParams(searchParams);

    if (value === null || value === undefined || value === '') {
      newParams.delete(filterId);
    } else {
      // Stringify objects (like range filters)
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      newParams.set(filterId, stringValue);
    }

    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  return (
    <aside className="w-80 bg-black border-r border-white/10 h-screen overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black border-b border-white/10 px-8 py-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-white">Filteri</h2>
      </div>

      {/* Filter Groups */}
      <div className="px-8 py-8 space-y-8">
        {/* Global Filters */}
        <FilterGroup
          title="Osnovno"
          filters={globalFilters}
          isExpanded={expandedGroups.global}
          onToggle={() => toggleGroup('global')}
          getFilterValue={getFilterValue}
          onFilterChange={handleFilterChange}
        />

        {/* Category Filters */}
        {currentCategoryFilters.length > 0 && (
          <FilterGroup
            title="Specifikacije"
            filters={currentCategoryFilters}
            isExpanded={expandedGroups.category}
            onToggle={() => toggleGroup('category')}
            getFilterValue={getFilterValue}
            onFilterChange={handleFilterChange}
          />
        )}
      </div>
    </aside>
  );
};

// Filter Group Accordion
interface FilterGroupProps {
  title: string;
  filters: FilterDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  getFilterValue: (filterId: string) => any;
  onFilterChange: (key: string, value: any) => void;
}

const FilterGroup = ({
  title,
  filters,
  isExpanded,
  onToggle,
  getFilterValue,
  onFilterChange,
}: FilterGroupProps) => {
  return (
    <div className="border-b border-white/10 pb-8">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
      >
        <h3 className="text-xs font-black uppercase tracking-widest text-white">{title}</h3>
        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          strokeWidth={2}
        />
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="space-y-6 pt-4">
          {filters.map((filter) => (
            <FilterInput
              key={filter.id}
              filter={filter}
              value={getFilterValue(filter.id)}
              onChange={(value) => onFilterChange(filter.id, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual Filter Input
interface FilterInputProps {
  filter: FilterDefinition;
  value: any;
  onChange: (value: any) => void;
}

const FilterInput = ({ filter, value, onChange }: FilterInputProps) => {
  switch (filter.type) {
    case 'range':
      return <RangeFilter filter={filter} value={value} onChange={onChange} />;
    case 'select':
      return <SelectFilter filter={filter} value={value} onChange={onChange} />;
    case 'radio':
      return <RadioFilter filter={filter} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanFilter filter={filter} value={value} onChange={onChange} />;
    default:
      return null;
  }
};

// Range Filter with Custom Slider
const RangeFilter = ({ filter, value, onChange }: FilterInputProps) => {
  const [min, setMin] = useState(value?.min || '');
  const [max, setMax] = useState(value?.max || '');

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = e.target.value;
    setMin(newMin);
    onChange({ min: newMin ? Number(newMin) : '', max });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = e.target.value;
    setMax(newMax);
    onChange({ min, max: newMax ? Number(newMax) : '' });
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-black uppercase tracking-widest text-white/60">
        {filter.label}
      </label>

      {/* Custom Range Slider */}
      <div className="space-y-3">
        {/* Min Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 w-8">Od</span>
          <input
            type="number"
            value={min}
            onChange={handleMinChange}
            placeholder="Min"
            className="flex-1 bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-all"
          />
          {filter.unit && <span className="text-xs text-white/40 w-8">{filter.unit}</span>}
        </div>

        {/* Max Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 w-8">Do</span>
          <input
            type="number"
            value={max}
            onChange={handleMaxChange}
            placeholder="Max"
            className="flex-1 bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-all"
          />
          {filter.unit && <span className="text-xs text-white/40 w-8">{filter.unit}</span>}
        </div>
      </div>

      {/* Visual Range Bar */}
      <div className="h-px bg-white/10 relative mt-4">
        {min && max && (
          <div
            className="absolute h-full bg-white/40"
            style={{
              left: `${Math.max(0, (Number(min) / 1000000) * 100)}%`,
              right: `${Math.max(0, 100 - (Number(max) / 1000000) * 100)}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};

// Select Filter
const SelectFilter = ({ filter, value, onChange }: FilterInputProps) => {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-black uppercase tracking-widest text-white/60">
        {filter.label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40 transition-all appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          paddingRight: '28px',
        }}
      >
        <option value="">Odaberite</option>
        {filter.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Radio Filter
const RadioFilter = ({ filter, value, onChange }: FilterInputProps) => {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-black uppercase tracking-widest text-white/60">
        {filter.label}
      </label>
      <div className="space-y-2">
        {filter.options?.map((opt) => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name={filter.id}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="w-4 h-4 border border-white/20 rounded-none cursor-pointer accent-white"
            />
            <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Boolean Filter
const BooleanFilter = ({ filter, value, onChange }: FilterInputProps) => {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={value || false}
        onChange={(e) => onChange(e.target.checked || null)}
        className="w-4 h-4 border border-white/20 rounded-none cursor-pointer accent-white"
      />
      <label className="text-xs text-white/60 cursor-pointer">{filter.label}</label>
    </div>
  );
};
