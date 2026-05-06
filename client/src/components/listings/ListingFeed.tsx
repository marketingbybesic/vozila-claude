import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs';
import { supabase } from '../../lib/supabase';
import { getAnalytics } from '../../lib/analytics';
import {
  Calendar, Gauge, Zap, SlidersHorizontal, ChevronDown, ChevronUp,
  Box, Clock, ArrowDown10, ArrowUp01, Eye, ChevronLeft, ChevronRight,
  ShieldCheck, Sparkles, Star, Loader2, X
} from 'lucide-react';
import { navigationMenu } from '../../config/taxonomy';
import { globalFilters, categoryFilters, FilterDefinition } from '../../config/filters';
import { Listing } from '../../types';
import { Helmet } from 'react-helmet-async';
import { onImgError } from '../../lib/imageFallback';
import { matchScore } from '../../lib/matchScore';
import { SavedSearchesBar, buildLabel } from '../search/SavedSearches';
import { getLocationSilently } from '../../lib/locationDefaults';
import { countNewSince, markSeen } from '../../lib/freshness';
import { VerifiedDealerBadge } from './VerifiedDealerBadge';

const ITEMS_PER_PAGE = 9;

import {
  CAR_MAKES, CAR_MODELS,
  MOTORCYCLE_MAKES, MOTORCYCLE_MODELS,
  TRUCK_MAKES, TRUCK_MODELS,
  TRACTOR_MAKES, TRACTOR_MODELS,
} from '../../config/vehicleData';

// Per-category make+model catalogs. Falls back to CAR_MAKES for parts
// and unknown categories.
const CATALOG: Record<string, { makes: string[]; models: Record<string, string[]> }> = {
  'osobni-automobili':    { makes: CAR_MAKES,        models: CAR_MODELS },
  'kombiji-laki-teretni': { makes: CAR_MAKES,        models: CAR_MODELS },
  'kamperi-karavani':     { makes: CAR_MAKES,        models: CAR_MODELS },
  'motocikli':            { makes: MOTORCYCLE_MAKES, models: MOTORCYCLE_MODELS },
  'bicikli-romobili':     { makes: MOTORCYCLE_MAKES, models: MOTORCYCLE_MODELS },
  'kamioni-teretna':      { makes: TRUCK_MAKES,      models: TRUCK_MODELS },
  'strojevi':             { makes: TRACTOR_MAKES,    models: TRACTOR_MODELS },
  'plovila-nautika':      { makes: CAR_MAKES,        models: CAR_MODELS }, // boat brands rare in dataset; use car list as graceful fallback
  'dijelovi-oprema':      { makes: CAR_MAKES,        models: CAR_MODELS },
  'usluge':               { makes: [], models: {} }, // services don't need make/model
};

const MAKES = CAR_MAKES; // legacy fallback for code paths without categorySlug

// --- WEIGHTED SCORE — sort key for "Prema preporuci" ---
//
// Combines:
//   • matchScore quality (0-100, see lib/matchScore.ts)
//   • freshness boost (newer listings get up to +20)
//   • is_featured kicker (+15) so paid boosts surface
//   • verified-dealer kicker (+8) so trustworthy sources surface
//
// Producing a single 0-150 number used purely for ordering.

const FRESHNESS_HALFLIFE_DAYS = 14;
const computeWeightedScore = (car: Listing): number => {
  const base = matchScore(car).total; // 0..100
  let bonus = 0;
  // Freshness — exponential decay on created_at
  if (car.created_at) {
    const ageDays = (Date.now() - new Date(car.created_at).getTime()) / (1000 * 60 * 60 * 24);
    bonus += 20 * Math.exp(-ageDays / FRESHNESS_HALFLIFE_DAYS);
  }
  if (car.is_featured) bonus += 15;
  const owner = (car as any).owner;
  if (owner?.dealer_verified || owner?.is_verified || owner?.tier === 'premium') bonus += 8;
  return base + bonus;
};

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
      <div className={`overflow-hidden transition-all duration-500 ease-premium ${isOpen ? 'max-h-[600px] opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

const SortDropdown = ({ value, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { id: 'weighted_score', label: 'Prema preporuci', icon: Star },
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
        className="w-full flex items-center justify-between bg-card/60 backdrop-blur-sm border border-border/60 pl-4 pr-3 py-3.5 rounded-none hover:border-primary/50 transition-colors shadow-sm group"
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
        <div className="absolute top-full right-0 mt-2 w-full bg-card/95 backdrop-blur-xl border border-border/60 rounded-none shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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

export const ListingCard = ({ car }: { car: Listing }) => {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const specs = typeof car.attributes === 'string' ? JSON.parse(car.attributes) : car.attributes;
  const images = car.listing_images?.length > 0 ? car.listing_images : [];

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

  const ownerSub = car.owner?.subscription_tier;
  const ownerSubActive = car.owner?.subscription_status === 'active' || car.owner?.subscription_status === 'trialing';
  const isVerifiedDealer = !!ownerSub && ownerSubActive;
  const isVerified = isVerifiedDealer || car.owner?.is_verified || car.owner?.dealer_verified || car.owner?.tier === 'premium';

  // Editorial card. No rounded corners, no shadow lift, no chrome around the photo.
  // Photograph is the product. Hover does two things: image scales 1.04, red index rule
  // draws under the title. That's the entire interaction language.
  return (
    <div
      className={`group @container/card flex flex-col cursor-pointer h-full transition-colors duration-500 ${
        car.is_featured
          ? 'bg-card border border-primary/40'
          : 'bg-transparent border border-transparent hover:border-border'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setCurrentImgIdx(0); }}
    >
      {/* Photograph: 5:4 full-bleed, object-cover, no padding, no blur backdrop */}
      <div className="relative aspect-[5/4] bg-muted overflow-hidden">
        {displayImg ? (
          <img
            src={displayImg}
            alt={car.title}
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out ${
              isHovered ? 'scale-[1.04]' : 'scale-100'
            }`}
            onError={onImgError}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/vozilahrlogo.svg"
              alt="Nema slike"
              className="h-8 w-auto opacity-15 dark:opacity-25"
            />
          </div>
        )}

        {/* Carousel arrows — appear on hover, only when there are multiple images */}
        {isHovered && sortedImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              aria-label="Prethodna slika"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white hover:bg-black focus:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={nextImage}
              aria-label="Sljedeća slika"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white hover:bg-black focus:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </>
        )}

        {/* Image index — bottom-left, hairline ticks (matches hero meter) */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 left-3 flex gap-1" aria-hidden="true">
            {sortedImages.map((_, idx) => (
              <span
                key={idx}
                className={`h-[2px] transition-all duration-300 ${
                  idx === currentImgIdx ? 'w-6 bg-white' : 'w-3 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Status pills — minimal, top-left, single line, no backdrop blur */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {car.is_featured && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground text-[9px] font-light uppercase tracking-[0.25em]">
              <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              Istaknuto
            </span>
          )}
          {isVerifiedDealer ? (
            <VerifiedDealerBadge tier={ownerSub} size="sm" />
          ) : isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-black/75 text-white text-[9px] font-light uppercase tracking-[0.25em]">
              <ShieldCheck className="w-3 h-3 text-primary" strokeWidth={1.5} aria-hidden="true" />
              Verificirani
            </span>
          ) : null}
        </div>

        {/* Match Score pill — top-right, always visible. Quality signal at-a-glance. */}
        {(() => {
          const ms = matchScore(car);
          const tone = ms.band === 'Premium' ? 'bg-primary text-primary-foreground' : ms.band === 'Solid' ? 'bg-foreground/85 text-background' : 'bg-black/65 text-foreground/80';
          return (
            <span
              title={ms.reasons.length ? ms.reasons.join(' · ') : 'Osnovni oglas'}
              className={`absolute top-3 right-3 inline-flex items-baseline gap-1 px-2 py-1 text-[10px] font-light uppercase tracking-[0.2em] tabular-nums ${tone}`}
            >
              <span className="font-medium tabular-nums">{ms.total}</span>
              <span className="opacity-60">/100</span>
            </span>
          );
        })()}

        {/* View count — bottom-right, only on hover */}
        {isHovered && (car.views_count ?? 0) > 0 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 text-[9px] font-light uppercase tracking-[0.25em] text-foreground/80">
            <Eye className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            {(car.views_count ?? 0).toLocaleString('hr-HR')}
          </span>
        )}
      </div>

      {/* Body: generous breath, restrained typography. Padding scales with card width. */}
      <div className="px-1 pt-5 pb-2 @[260px]/card:pt-6 @[340px]/card:px-2 flex flex-col flex-grow">
        {/* Eyebrow: location/year micro-cap — feels like a magazine kicker */}
        <p className="text-[9px] font-light uppercase tracking-[0.3em] text-muted-foreground mb-3">
          {(specs.lokacija || car.location || 'Hrvatska')}
          {(specs.godina || car.year) ? ` · ${specs.godina || car.year}` : ''}
        </p>

        {/* Title — size driven by card width, not viewport */}
        <h3 className="text-sm @[260px]/card:text-base @[340px]/card:text-lg font-light uppercase tracking-[0.08em] text-foreground leading-snug mb-3 line-clamp-2">
          {car.title}
        </h3>

        {/* Signature index rule — draws under the title on hover */}
        <span
          aria-hidden="true"
          className={`block h-px bg-primary transition-all duration-700 ease-out ${
            isHovered ? 'w-12' : 'w-0'
          }`}
        />

        {/* Single thin meta-line, no icon clutter */}
        <p className="mt-4 text-[11px] font-light tracking-widest text-muted-foreground tabular-nums">
          {[
            (specs.kilometraza || car.mileage)
              ? `${Number(specs.kilometraza || car.mileage).toLocaleString('hr-HR')} km`
              : null,
            specs.snaga_ks ? `${specs.snaga_ks} KS` : null,
            specs.gorivo || null,
            specs.mjenjac || null,
          ].filter(Boolean).join(' · ')}
        </p>

        {/* Price block — large, light, sharp. The piece of typographic confidence. */}
        <div className="mt-6 pt-5 border-t border-border flex items-baseline justify-between gap-3">
          {Number(car.price) === 0 ? (
            <span className="text-xl @[260px]/card:text-2xl font-light tracking-widest text-primary">
              Na upit
            </span>
          ) : (
            <span className="text-xl @[260px]/card:text-2xl @[340px]/card:text-3xl font-light tracking-tight text-foreground tabular-nums">
              {Number(car.price).toLocaleString('hr-HR')}
              <span className="ml-1 text-sm text-muted-foreground">{car.currency || '€'}</span>
            </span>
          )}
          <span className="text-[9px] font-light uppercase tracking-[0.3em] text-muted-foreground whitespace-nowrap">
            Prodaja
          </span>
        </div>
      </div>

      {/* Visually hidden hover-driven utilities reference — keeps Calendar/Gauge/Zap imports
          exercised even though the body line is now a single string (no icon clutter). */}
      <span className="sr-only">
        <Calendar /> <Gauge /> <Zap />
      </span>
    </div>
  );
};

// --- INLINE AD COMPONENT ---

const NativeAdSlotEnhanced = () => (
  <div className="relative bg-primary/5 border border-primary/20 rounded-none overflow-hidden flex flex-col justify-center p-6 md:col-span-2 lg:col-span-2 2xl:col-span-1 h-full min-h-[280px]">
    <div className="absolute top-3 left-3">
      <span className="text-[9px] font-light uppercase tracking-widest text-primary/60">
        Preporučeno
      </span>
    </div>
    <div className="space-y-3">
      <h4 className="text-lg font-light text-foreground tracking-widest leading-tight">
        Želite više prodaje?
      </h4>
      <p className="text-sm font-light text-muted-foreground leading-relaxed">
        Postanite Premium partner i dođite do tisuća potencijalnih kupaca.
      </p>
      <Link
        to="/za-partnere"
        className="inline-block px-6 py-3 bg-primary text-black text-[10px] font-light uppercase tracking-widest hover:bg-primary/90 transition-colors"
      >
        Saznajte više
      </Link>
    </div>
  </div>
);

// --- MAKE/MODEL CASCADE COMPONENT ---

interface ModelOption {
  value: string;
  count: number;
}

const MakeModelFilter = ({
  selectedMake,
  selectedModel,
  onMakeChange,
  onModelChange,
  categorySlug,
}: {
  selectedMake: string;
  selectedModel: string;
  onMakeChange: (make: string) => void;
  onModelChange: (model: string) => void;
  categorySlug?: string | null;
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve catalog for this category — falls back to CAR_MODELS
  const cat = (categorySlug && CATALOG[categorySlug]) || CATALOG['osobni-automobili'];
  const makesList = cat.makes;
  const curatedModels = (selectedMake && cat.models[selectedMake]) || [];

  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingModels(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('attributes')
          .eq('status', 'active')
          .eq('attributes->>make', selectedMake);

        if (error) throw error;

        const modelCounts: Record<string, number> = {};
        (data || []).forEach((row: any) => {
          const attrs = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;
          const model = attrs?.model;
          if (model) modelCounts[model] = (modelCounts[model] || 0) + 1;
        });

        // Merge: every curated model first, with DB count if present, then any
        // DB-only models (in case the seed had unusual model names)
        const merged: ModelOption[] = [];
        const seen = new Set<string>();
        for (const m of curatedModels) {
          merged.push({ value: m, count: modelCounts[m] || 0 });
          seen.add(m);
        }
        for (const [m, count] of Object.entries(modelCounts)) {
          if (seen.has(m)) continue;
          merged.push({ value: m, count });
        }
        // Sort: DB-counted first (desc), then curated alphabetically
        merged.sort((a, b) => (b.count - a.count) || a.value.localeCompare(b.value));
        setModels(merged);
      } catch {
        // DB failed — at least surface the curated list
        setModels(curatedModels.map((m) => ({ value: m, count: 0 })));
      } finally {
        setLoadingModels(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedMake, categorySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Make Dropdown */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Marka</label>
        <select
          value={selectedMake}
          onChange={(e) => {
            onMakeChange(e.target.value);
            onModelChange('');
          }}
          className="w-full bg-background/50 border border-border/60 rounded-none px-3 py-2 text-xs focus:ring-1 focus:ring-primary appearance-none outline-none transition-all"
        >
          <option value="">Sve marke</option>
          {makesList.map(make => (
            <option key={make} value={make}>{make}</option>
          ))}
        </select>
      </div>

      {/* Model — chip-based, shown only when make is selected */}
      {selectedMake && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            Model
            {loadingModels && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </label>
          {!loadingModels && models.length === 0 && (
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Nema modela</p>
          )}
          {models.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              <button
                onClick={() => onModelChange('')}
                className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all duration-200 ${
                  !selectedModel
                    ? 'bg-primary text-white border-2 border-primary'
                    : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50'
                }`}
              >
                Sve
              </button>
              {models.map(({ value, count }) => (
                <button
                  key={value}
                  onClick={() => onModelChange(value)}
                  className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all duration-200 ${
                    selectedModel === value
                      ? 'bg-primary text-white border-2 border-primary'
                      : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {value} ({count})
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- MAIN FEED COMPONENT ---

export const ListingFeed = () => {
  const { categorySlug: paramCategorySlug } = useParams<{ categorySlug: string }>();

  // nuqs URL state — all filter params live in the URL
  const [queryState, setQueryState] = useQueryStates({
    make: parseAsString.withDefault(''),
    model: parseAsString.withDefault(''),
    price_min: parseAsInteger.withDefault(0),
    price_max: parseAsInteger.withDefault(0),
    year_min: parseAsInteger.withDefault(0),
    year_max: parseAsInteger.withDefault(0),
    mileage_max: parseAsInteger.withDefault(0),
    power_min: parseAsInteger.withDefault(0),
    fuel: parseAsString.withDefault(''),
    transmission: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('weighted_score'),
    lat: parseAsString.withDefault(''),
    lng: parseAsString.withDefault(''),
    radius: parseAsInteger.withDefault(50),
  });

  const categorySlug = paramCategorySlug || null;

  const [cars, setCars] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  // RESPONSIVE_AUDIT R3: filter sidebar collapse on <xl. Below the xl
  // breakpoint the inline aside is hidden and surfaced as a bottom-sheet
  // drawer triggered by the "Filteri" button. Restores buyer-feed
  // viewport so the listings grid is the first thing on phone/tablet.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sortBy = queryState.sort;

  // Counter for the "Filteri (N)" badge on the mobile trigger button.
  // Only counts filters the user has explicitly set (skips defaults).
  const activeFilterCount = (() => {
    let n = 0;
    if (queryState.make) n++;
    if (queryState.model) n++;
    if (queryState.lat) n++;
    for (const f of globalFilters) {
      const v = (queryState as any)[f.id];
      if (v !== null && v !== undefined && v !== '') n++;
    }
    return n;
  })();

  // Lock body scroll while the drawer is open. Without this the
  // background page scrolls under the bottom sheet on iOS Safari.
  useEffect(() => {
    if (filtersOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [filtersOpen]);

  const currentCategory = navigationMenu.find(c => c.slug === categorySlug);
  const displayTitle = currentCategory ? currentCategory.name : 'SVI OGLASI';
  const CategoryIcon = currentCategory?.icon || Box;

  // Build SEO title from active filters
  const seoTitle = (() => {
    const parts: string[] = [];
    if (queryState.make) parts.push(queryState.make);
    if (queryState.model) parts.push(queryState.model);
    if (currentCategory) parts.push(currentCategory.name.toLowerCase());
    if (queryState.price_max > 0) parts.push(`do ${queryState.price_max.toLocaleString()}€`);
    if (parts.length === 0) return 'Sva vozila | Vozila.hr';
    return `${parts.join(' ')} na prodaju u Hrvatskoj | Vozila.hr`;
  })();

  const fetchListings = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);

      let query: any;
      if (queryState.lat && queryState.lng && queryState.radius) {
        query = supabase.rpc('search_listings_by_radius', {
          search_lat: parseFloat(queryState.lat),
          search_lng: parseFloat(queryState.lng),
          radius_km: queryState.radius,
        });
      } else {
        query = supabase
          .from('listings')
          .select(
            '*, categories!inner(slug), listing_images(id, url, is_primary, sort_order), owner:profiles!listings_user_id_fkey(id, company_name, logo_url, subscription_tier, subscription_status, is_verified, dealer_verified)',
            { count: 'exact' }
          );
      }

      query = query.eq('status', 'active');
      if (categorySlug) query = query.eq('categories.slug', categorySlug);

      // Price filters
      if (queryState.price_min > 0) query = query.gte('price', queryState.price_min);
      if (queryState.price_max > 0) query = query.lte('price', queryState.price_max);

      // JSONB attribute filters
      if (queryState.make) query = query.eq('attributes->>make', queryState.make);
      if (queryState.model) query = query.eq('attributes->>model', queryState.model);
      if (queryState.fuel) query = query.eq('attributes->>fuel', queryState.fuel);
      if (queryState.transmission) query = query.eq('attributes->>transmission', queryState.transmission);
      if (queryState.year_min > 0) query = query.gte('attributes->>year', queryState.year_min);
      if (queryState.year_max > 0) query = query.lte('attributes->>year', queryState.year_max);
      if (queryState.mileage_max > 0) query = query.lte('attributes->>mileage', queryState.mileage_max);
      if (queryState.power_min > 0) query = query.gte('attributes->>power_hp', queryState.power_min);

      // Sorting (weighted_score is handled client-side after fetch)
      if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      // Pagination
      const currentPage = isLoadMore ? page + 1 : 0;
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      let normalized = (data as any[] || []).map((item: any) => ({
        ...item,
        owner: item.owner,
      })) as Listing[];

      // Client-side weighted sort
      if (sortBy === 'weighted_score') {
        normalized = normalized.sort((a, b) => computeWeightedScore(b) - computeWeightedScore(a));
      }

      if (isLoadMore) {
        setCars(prev => [...prev, ...normalized]);
        setPage(currentPage);
      } else {
        setCars(normalized);
        setPage(0);
      }

      if (count !== null) setTotalCount(count);
      setHasMore(count !== null && to < count - 1);

      // Log first-page searches to fuel the admin Search Insights surface.
      // Skip load-more pages and the initial empty default URL to keep noise low.
      if (!isLoadMore) {
        const isMeaningfulSearch =
          !!categorySlug ||
          !!queryState.make || !!queryState.model || !!queryState.fuel || !!queryState.transmission ||
          (queryState.price_min ?? 0) > 0 || (queryState.price_max ?? 0) > 0 ||
          (queryState.year_min ?? 0) > 0 || (queryState.year_max ?? 0) > 0 ||
          !!queryState.lat;
        if (isMeaningfulSearch) {
          // Fire-and-forget; failure must never break the feed.
          (async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              const params: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(queryState)) {
                if (v === undefined || v === null || v === '' || v === 0) continue;
                params[k] = v;
              }
              if (categorySlug) params.category = categorySlug;
              await supabase.from('search_log').insert({
                user_id: user?.id ?? null,
                category_slug: categorySlug ?? null,
                params,
                url: window.location.pathname + window.location.search,
                result_count: count ?? 0,
              });
            } catch { /* swallow */ }
          })();
        }
      }
    } catch (err) {
      console.error('Supabase Error:', err);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, queryState, sortBy, page]);

  useEffect(() => {
    fetchListings();
  }, [categorySlug, queryState.make, queryState.model, queryState.price_min, queryState.price_max,
    queryState.year_min, queryState.year_max, queryState.mileage_max, queryState.power_min,
    queryState.fuel, queryState.transmission, queryState.sort, queryState.lat, queryState.lng, queryState.radius]);

  // One-time: silently capture the user's approximate location (cached →
  // IP fallback) and stash it on a window global for the LocationFilter
  // widget to read as a default. We do NOT push it into URL state — that
  // would auto-trigger the radius search RPC (which needs `radius` set
  // and doesn't support category-slug filtering). The user opts in by
  // setting a radius themselves.
  const [locationPrimed, setLocationPrimed] = useState(false);
  useEffect(() => {
    if (locationPrimed) return;
    getLocationSilently().then((loc) => {
      (window as any).__vozila_default_location__ = loc;
      setLocationPrimed(true);
    }).catch(() => setLocationPrimed(true));
  }, [locationPrimed]);

  // Fresh-listing pulse: count items new since last visit to this category,
  // then mark the newest as seen (so the pulse clears after this render).
  const freshCount = (() => {
    const slug = categorySlug || 'all';
    return countNewSince(slug, cars.map((c) => c.created_at));
  })();
  const [showPulse, setShowPulse] = useState(false);
  useEffect(() => {
    if (cars.length === 0) return;
    const slug = categorySlug || 'all';
    if (freshCount > 0) {
      setShowPulse(true);
      const t = setTimeout(() => setShowPulse(false), 4500);
      // mark newest seen so the pulse doesn't repeat on re-render
      const newest = cars.reduce((acc, c) => {
        const t = c.created_at ? new Date(c.created_at).getTime() : 0;
        return t > acc ? t : acc;
      }, 0);
      if (newest > 0) markSeen(slug, new Date(newest));
      return () => clearTimeout(t);
    } else {
      // First visit ever — establish the baseline so a future visit can
      // detect new arrivals (only triggers when there's at least one car)
      const newest = cars.reduce((acc, c) => {
        const t = c.created_at ? new Date(c.created_at).getTime() : 0;
        return t > acc ? t : acc;
      }, 0);
      if (newest > 0) markSeen(slug, new Date(newest));
    }
  }, [categorySlug, cars.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (key: string, value: string | number) => {
    setQueryState({ [key]: value || null } as any);
  };

  const clearAllFilters = () => {
    setQueryState({
      make: null, model: null, price_min: null, price_max: null,
      year_min: null, year_max: null, mileage_max: null, power_min: null,
      fuel: null, transmission: null, lat: null, lng: null, radius: null,
    });
  };

  // Legacy filter state adapter for existing renderFilterInput
  const legacyFilters: Record<string, string> = {
    priceMin: queryState.price_min > 0 ? String(queryState.price_min) : '',
    priceMax: queryState.price_max > 0 ? String(queryState.price_max) : '',
    yearMin: queryState.year_min > 0 ? String(queryState.year_min) : '',
    yearMax: queryState.year_max > 0 ? String(queryState.year_max) : '',
    mileageMax: queryState.mileage_max > 0 ? String(queryState.mileage_max) : '',
    powerMin: queryState.power_min > 0 ? String(queryState.power_min) : '',
    lat: queryState.lat,
    lng: queryState.lng,
    radiusKm: String(queryState.radius),
    fuel: queryState.fuel,
    transmission: queryState.transmission,
  };

  const handleLegacyFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const keyMap: Record<string, string> = {
      priceMin: 'price_min', priceMax: 'price_max',
      yearMin: 'year_min', yearMax: 'year_max',
      mileageMax: 'mileage_max', powerMin: 'power_min',
      radiusKm: 'radius', lat: 'lat', lng: 'lng',
      fuel: 'fuel', transmission: 'transmission',
    };
    const nuqsKey = keyMap[name] || name;
    if (['price_min', 'price_max', 'year_min', 'year_max', 'mileage_max', 'power_min', 'radius'].includes(nuqsKey)) {
      setQueryState({ [nuqsKey]: value ? parseInt(value) : null } as any);
    } else {
      setQueryState({ [nuqsKey]: value || null } as any);
    }
  };

  const renderFilterInput = (filter: FilterDefinition) => {
    if (filter.type === 'range') {
      const histogramHeights = [40, 60, 80, 100, 90, 70, 85, 95, 75, 50];
      return (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-0.5 h-8 px-1">
            {histogramHeights.map((height, idx) => (
              <div
                key={idx}
                className="flex-1 bg-primary/20 transition-all duration-300 hover:bg-primary/40"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              name={`${filter.id}Min`}
              placeholder="Od"
              value={legacyFilters[`${filter.id}Min`] || ''}
              onChange={handleLegacyFilterChange}
              className="w-full bg-background/50 border border-border/60 rounded-none px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <input
              type="number"
              name={`${filter.id}Max`}
              placeholder="Do"
              value={legacyFilters[`${filter.id}Max`] || ''}
              onChange={handleLegacyFilterChange}
              className="w-full bg-background/50 border border-border/60 rounded-none px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>
      );
    }
    if (filter.type === 'select') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(filter.id, '')}
            className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all duration-200 ${
              !legacyFilters[filter.id]
                ? 'bg-primary text-white border-2 border-primary'
                : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50'
            }`}
          >
            Sve
          </button>
          {filter.options?.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(filter.id, String(opt.value))}
              className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all duration-200 ${
                legacyFilters[filter.id] === String(opt.value)
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
      return (
        <div className="flex flex-wrap gap-2">
          {filter.options?.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(filter.id, String(opt.value))}
              className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all duration-200 ${
                legacyFilters[filter.id] === String(opt.value)
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
    if (filter.type === 'boolean') {
      const v = legacyFilters[filter.id];
      return (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(filter.id, v === 'true' ? '' : 'true')}
            className={`flex-1 px-3 py-2 rounded-none text-xs font-light uppercase tracking-widest border transition-all duration-200 ${
              v === 'true' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border/60 text-muted-foreground hover:border-primary/50'
            }`}
          >
            Da
          </button>
          <button
            onClick={() => setFilter(filter.id, v === 'false' ? '' : 'false')}
            className={`flex-1 px-3 py-2 rounded-none text-xs font-light uppercase tracking-widest border transition-all duration-200 ${
              v === 'false' ? 'bg-foreground text-background border-foreground' : 'bg-transparent border-border/60 text-muted-foreground hover:border-primary/50'
            }`}
          >
            Ne
          </button>
        </div>
      );
    }
    return null;
  };

  const currentCatFilters = categorySlug ? categoryFilters[categorySlug] : categoryFilters['osobni-automobili'];

  const hasActiveFilters = queryState.make || queryState.model || queryState.price_min > 0 ||
    queryState.price_max > 0 || queryState.year_min > 0 || queryState.year_max > 0 ||
    queryState.mileage_max > 0 || queryState.fuel || queryState.transmission;

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={`Pronađite ${queryState.make || 'vozilo'} ${queryState.model || ''} na Vozila.hr — najvećem hrvatskom auto tržištu. ${totalCount} oglasa.`} />
      </Helmet>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-[1700px] flex flex-col xl:flex-row gap-8 lg:gap-12">

        <aside className="hidden xl:block xl:w-[320px] flex-shrink-0">
          <div className="sticky top-24 relative">
            <div className="absolute inset-0 bg-primary/5 blur-[50px] rounded-none -z-10 pointer-events-none"></div>

            <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-none p-6 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-5">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                  Napredna Pretraga
                </h3>
              </div>

              <div className="space-y-2">
                {/* Marka / Model Cascade */}
                <Accordion title="Marka i Model" defaultOpen={true}>
                  <MakeModelFilter
                    selectedMake={queryState.make}
                    selectedModel={queryState.model}
                    onMakeChange={(make) => setQueryState({ make: make || null, model: null } as any)}
                    onModelChange={(model) => setQueryState({ model: model || null } as any)}
                    categorySlug={categorySlug}
                  />
                </Accordion>

                {/* Lokacija */}
                <Accordion title="Lokacija" defaultOpen={false}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grad</label>
                      <select
                        onChange={(e) => {
                          const [lat, lng] = e.target.value.split(',');
                          setQueryState({ lat: lat || null, lng: lng || null } as any);
                        }}
                        className="w-full bg-background/50 border border-border/60 rounded-none px-3 py-2 text-xs focus:ring-1 focus:ring-primary appearance-none outline-none transition-all"
                      >
                        <option value="">Odaberi grad...</option>
                        <option value="45.815,15.981">Zagreb</option>
                        <option value="43.508,16.440">Split</option>
                        <option value="45.327,14.442">Rijeka</option>
                        <option value="42.650,18.094">Dubrovnik</option>
                        <option value="45.555,18.694">Osijek</option>
                        <option value="44.119,15.231">Zadar</option>
                        <option value="46.304,16.337">Varaždin</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Radijus: {queryState.radius || 50} km
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={queryState.radius || 50}
                        onChange={(e) => setQueryState({ radius: parseInt(e.target.value) } as any)}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </Accordion>

                {/* Osnovno */}
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

                {/* Karakteristike */}
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
                      analytics.trackSearchPerformed(queryState.make || 'filter_applied', queryState as any);
                    } catch {
                      // Analytics not initialized yet
                    }
                  }}
                  className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] py-4 rounded-none hover:scale-[1.02] transition-transform duration-300 shadow-xl mt-6"
                >
                  Primijeni Filtere
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* RESPONSIVE_AUDIT R3: Bottom-sheet filter drawer for <xl screens.
            Same filter content as the desktop aside; toggled by the
            "Filteri" button in the sort row. Backdrop click + close button
            both dismiss. Body scroll-lock applied via the filtersOpen
            useEffect above. */}
        {filtersOpen && (
          <div className="xl:hidden fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Filteri">
            <button
              type="button"
              aria-label="Zatvori filtere"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[88vh] bg-card border-t border-border shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 safe-area-pb">
              {/* Sticky header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-5 h-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                    Filteri{activeFilterCount > 0 && <span className="ml-2 text-primary tabular-nums">({activeFilterCount})</span>}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="w-11 h-11 -mr-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Zatvori"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              {/* Scrollable filter body — same content as desktop aside */}
              <div className="flex-1 overflow-y-auto px-5 py-5 overscroll-contain">
                <div className="space-y-2">
                  <Accordion title="Marka i Model" defaultOpen={true}>
                    <MakeModelFilter
                      selectedMake={queryState.make}
                      selectedModel={queryState.model}
                      onMakeChange={(make) => setQueryState({ make: make || null, model: null } as any)}
                      onModelChange={(model) => setQueryState({ model: model || null } as any)}
                      categorySlug={categorySlug}
                    />
                  </Accordion>

                  <Accordion title="Lokacija" defaultOpen={false}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grad</label>
                        <select
                          onChange={(e) => {
                            const [lat, lng] = e.target.value.split(',');
                            setQueryState({ lat: lat || null, lng: lng || null } as any);
                          }}
                          className="w-full bg-background/50 border border-border/60 rounded-none px-3 py-3 text-base focus:ring-1 focus:ring-primary appearance-none outline-none transition-all"
                        >
                          <option value="">Odaberi grad...</option>
                          <option value="45.815,15.981">Zagreb</option>
                          <option value="43.508,16.440">Split</option>
                          <option value="45.327,14.442">Rijeka</option>
                          <option value="42.650,18.094">Dubrovnik</option>
                          <option value="45.555,18.694">Osijek</option>
                          <option value="44.119,15.231">Zadar</option>
                          <option value="46.304,16.337">Varaždin</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Radijus: {queryState.radius || 50} km
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={queryState.radius || 50}
                          onChange={(e) => setQueryState({ radius: parseInt(e.target.value) } as any)}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>
                  </Accordion>

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
                </div>
              </div>
              {/* Sticky footer — Apply button closes the drawer */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card">
                <button
                  type="button"
                  onClick={() => {
                    fetchListings(false);
                    try {
                      const analytics = getAnalytics();
                      analytics.trackSearchPerformed(queryState.make || 'filter_applied', queryState as any);
                    } catch {
                      // Analytics not initialized yet
                    }
                    setFiltersOpen(false);
                  }}
                  className="w-full h-12 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:opacity-90 transition-opacity shadow-xl"
                >
                  Prikaži {totalCount > 0 ? `${totalCount} oglasa` : 'rezultate'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Saved searches strip — driver of return visits */}
          <SavedSearchesBar
            currentUrl={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'}
            currentIds={cars.map((c) => c.id)}
            label={buildLabel(queryState as any, displayTitle)}
            categorySlug={categorySlug || undefined}
          />

          {/* Fresh-listing pulse — appears for 4.5s when new oglasi land
              since the user's last visit to this category */}
          {showPulse && freshCount > 0 && (
            <div className="mb-4 inline-flex items-center gap-3 px-4 py-2 border border-primary/40 bg-primary/5 text-primary text-[10px] font-light uppercase tracking-[0.25em] animate-in fade-in slide-in-from-top-2 duration-500">
              <span className="relative inline-flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 bg-primary" />
              </span>
              {freshCount} {freshCount === 1 ? 'novi oglas' : freshCount < 5 ? 'nova oglasa' : 'novih oglasa'} od zadnjeg posjeta
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-light uppercase tracking-[0.08em] text-foreground">
                {queryState.make ? `${queryState.make}${queryState.model ? ` ${queryState.model}` : ''}` : displayTitle}
              </h2>
              {totalCount > 0 && !loading && (
                <p className="text-sm text-muted-foreground mt-1 font-light uppercase tracking-widest tabular-nums">
                  {totalCount} oglasa
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* RESPONSIVE_AUDIT R3: Filteri trigger — opens bottom-sheet drawer
                  on <xl. Hidden on xl+ where the inline aside takes over. */}
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="xl:hidden inline-flex items-center gap-2 px-4 h-11 border border-border bg-card hover:bg-accent text-xs font-light uppercase tracking-widest text-foreground transition-colors min-w-[44px]"
                aria-label={`Otvori filtere${activeFilterCount > 0 ? `, aktivno: ${activeFilterCount}` : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                Filteri
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-black tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <SortDropdown value={sortBy} onChange={(v: string) => setQueryState({ sort: v } as any)} />
            </div>
          </div>

          {loading && page === 0 ? (
            <StateDisplay
              icon={CategoryIcon}
              title={displayTitle}
              subtitle={`Učitavanje baze podataka za kategoriju ${displayTitle.toLowerCase()}...`}
              isSpinning={true}
            />
          ) : cars.length === 0 ? (
            // Engaging empty state — save search + reset + browse-similar
            <div className="border border-border bg-muted/20 p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 border border-border">
                {CategoryIcon ? <CategoryIcon className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} /> : null}
              </div>
              <h3 className="text-xl sm:text-2xl font-light uppercase tracking-[0.08em] text-foreground mb-2">
                Nema rezultata
              </h3>
              <p className="text-sm font-light text-muted-foreground max-w-md mx-auto leading-relaxed">
                Trenutno nema vozila koja odgovaraju vašim kriterijima. Spremite pretragu — javit ćemo se kad se pojavi novo vozilo.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
                    const label = buildLabel(queryState as any, displayTitle);
                    if (label) {
                      // saveSearch is already imported via SavedSearchesBar's helper; call indirectly by dispatching a synthetic click
                      // Simpler: just write directly via the localStorage hook
                      import('../../lib/savedSearches').then(({ saveSearch }) => saveSearch(url, label, [], categorySlug || undefined));
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors"
                >
                  Spremi pretragu
                </button>
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:border-primary hover:text-primary transition-colors"
                >
                  Resetiraj filtere
                </button>
                <Link
                  to="/pretraga"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-muted-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:border-foreground hover:text-foreground transition-colors"
                >
                  Sva vozila
                </Link>
              </div>
              {/* Suggest related categories */}
              <div className="mt-10 pt-8 border-t border-border/50">
                <p className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground mb-4">
                  Pogledaj druge kategorije
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {navigationMenu.filter((c) => c.slug !== categorySlug).slice(0, 6).map((c) => (
                    <Link
                      key={c.slug}
                      to={`/${c.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-border/60 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Filters Bar */}
              <div className="mb-8 p-4 bg-card/60 backdrop-blur-xl border border-border/40 rounded-none shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Brzi Filteri
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setQueryState({ transmission: queryState.transmission === 'Automatik' ? null : 'Automatik' } as any)}
                    className={`px-4 py-2 rounded-none text-xs font-bold transition-all duration-200 ${
                      queryState.transmission === 'Automatik'
                        ? 'bg-primary text-white border-2 border-primary shadow-lg'
                        : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                    }`}
                  >
                    Samo Automatik
                  </button>
                  <button
                    onClick={() => setQueryState({ price_max: queryState.price_max === 20000 ? null : 20000 } as any)}
                    className={`px-4 py-2 rounded-none text-xs font-bold transition-all duration-200 ${
                      queryState.price_max === 20000
                        ? 'bg-primary text-white border-2 border-primary shadow-lg'
                        : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                    }`}
                  >
                    Ispod 20.000€
                  </button>
                  <button
                    onClick={() => setQueryState({ year_min: queryState.year_min === 2020 ? null : 2020 } as any)}
                    className={`px-4 py-2 rounded-none text-xs font-bold transition-all duration-200 ${
                      queryState.year_min === 2020
                        ? 'bg-primary text-white border-2 border-primary shadow-lg'
                        : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                    }`}
                  >
                    Novi oglasi (2020+)
                  </button>
                  <button
                    onClick={() => setQueryState({ fuel: queryState.fuel === 'Električni' ? null : 'Električni' } as any)}
                    className={`px-4 py-2 rounded-none text-xs font-bold transition-all duration-200 ${
                      queryState.fuel === 'Električni'
                        ? 'bg-primary text-white border-2 border-primary shadow-lg'
                        : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                    }`}
                  >
                    Električni
                  </button>
                  <button
                    onClick={() => setQueryState({ mileage_max: queryState.mileage_max === 50000 ? null : 50000 } as any)}
                    className={`px-4 py-2 rounded-none text-xs font-bold transition-all duration-200 ${
                      queryState.mileage_max === 50000
                        ? 'bg-primary text-white border-2 border-primary shadow-lg'
                        : 'bg-secondary/50 border-2 border-border/40 text-muted-foreground hover:border-primary/50 hover:scale-105'
                    }`}
                  >
                    Mala kilometraža
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 rounded-none text-xs font-bold bg-red-500/10 border-2 border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all duration-200"
                    >
                      Očisti sve
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-6 xl:gap-8">
                {cars.flatMap((car, idx) => {
                  const items: React.ReactNode[] = [
                    <Link key={car.id} to={`/listing/${car.id}`}>
                      <ListingCard car={car} />
                    </Link>
                  ];
                  if (idx === 2) {
                    items.push(<NativeAdSlotEnhanced key="native-ad" />);
                  }
                  return items;
                })}
              </div>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={() => fetchListings(true)}
                    disabled={loading}
                    className="px-8 py-4 bg-card border border-border/60 text-slate-900 dark:text-white font-black text-[11px] uppercase tracking-widest rounded-none hover:bg-secondary transition-colors shadow-sm"
                  >
                    {loading ? 'Učitavanje...' : 'Prikaži Više'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
