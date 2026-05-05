import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { useTypingAnimation } from '../../hooks/useTypingAnimation';
import { SuperSearchModal } from '../search/SuperSearchModal';
import { onImgError } from '../../lib/imageFallback';

// Editorial split-screen: rotating photograph (right 7/12) + typographic index (left 5/12).
// Photograph rotates every 6s with a slow Ken-Burns scale. The four-rectangle progress
// meter under the headline is the brand's signature index rule (see DESIGN_DIRECTION.md).
const SLIDES = [
  { label: 'Audi A6 Avant',          src: '/img/placeholder-car.jpg' },
  { label: 'BMW M3 Competition',     src: '/img/categories/cars.jpg' },
  { label: 'Volkswagen Golf 8 GTI',  src: '/img/categories/leisure.jpg' },
  { label: 'Zagreb → Split',    src: '/img/categories/commercial.jpg' },
];

export const Hero = () => {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [kmMax, setKmMax] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();

  // Auto-advance the photograph rotation. Pause is implicit (no hover handler — by design).
  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((i) => (i + 1) % SLIDES.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const { displayText } = useTypingAnimation({
    texts: SLIDES.map((s) => s.label),
    typingSpeed: 60,
    pauseDuration: 2500,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (kmMax) params.set('kmMax', kmMax);
    navigate('/?' + params.toString());
  };

  const slideIndex = String(activeSlide + 1).padStart(2, '0');
  const slideTotal = String(SLIDES.length).padStart(2, '0');

  return (
    <section className="relative w-full bg-background text-foreground overflow-hidden z-0">
      {/* Two-column on desktop, photograph stacks above index on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px] lg:min-h-[760px]">
        {/* RIGHT: rotating full-bleed photograph (mobile: top) */}
        <div className="relative lg:col-start-6 lg:col-span-7 lg:order-2 order-1 h-[42vh] lg:h-auto overflow-hidden bg-black">
          {SLIDES.map((slide, i) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.label}
              onError={onImgError}
              className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] ease-out ${
                i === activeSlide
                  ? 'opacity-100 scale-105 duration-[6000ms]'
                  : 'opacity-0 scale-100 duration-[1200ms]'
              }`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
          {/* Mild edge falloff so type at the seam stays readable on light photos */}
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black/60 to-transparent pointer-events-none hidden lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none lg:hidden" />

          {/* Bottom-right caption + four-rectangle index meter (signature interaction) */}
          <div className="absolute bottom-6 right-6 flex items-end gap-4 text-white">
            <span className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
              {SLIDES[activeSlide].label}
            </span>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  aria-label={`Pokaži sliku ${i + 1}`}
                  className={`h-[2px] transition-all duration-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                    i === activeSlide ? 'w-8 bg-primary' : 'w-4 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* LEFT: editorial typographic index */}
        <div className="relative lg:col-start-1 lg:col-span-5 lg:order-1 order-2 flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-10 lg:py-16">
          {/* Top row: index counter + brand mark */}
          <div className="flex items-start justify-between">
            <div className="flex items-baseline gap-2 font-light tabular-nums">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {slideIndex}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60">
                / {slideTotal}
              </span>
            </div>
            <span className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground">
              Premium marketplace
            </span>
          </div>

          {/* Headline block */}
          <div className="my-12 lg:my-0">
            <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-6">
              Vozila.hr
            </p>
            <h1
              key={activeSlide}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light uppercase tracking-tight leading-[1.05] text-foreground animate-in fade-in slide-in-from-bottom-2 duration-700"
            >
              {SLIDES[activeSlide].label}
            </h1>
            {/* Signature 1px index rule, redraws on every slide change via key={} above */}
            <div
              key={`rule-${activeSlide}`}
              className="mt-8 h-px bg-primary origin-left animate-in slide-in-from-left fade-in duration-1000"
              style={{ width: '88px' }}
            />
            <p className="mt-6 text-xs font-light uppercase tracking-[0.25em] text-muted-foreground max-w-md">
              {displayText || 'Pretražite po marki, modelu ili gradu'}
              <span className="ml-0.5 text-primary animate-pulse">|</span>
            </p>
          </div>

          {/* Search + filter strip — flat, underlined, no glass */}
          <div className="space-y-6">
            {/* Single underlined search line */}
            <div className="relative">
              <Search
                className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Marka, model, lokacija"
                aria-label="Pretraga vozila"
                className="w-full h-12 pl-7 pr-20 bg-transparent border-0 border-b border-border text-foreground placeholder:text-muted-foreground text-sm font-light tracking-widest focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleSearch}
                aria-label="Pretraži"
                className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
              >
                Traži <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>

            {/* Three bare numeric fields */}
            <div className="grid grid-cols-3 gap-x-4">
              {[
                { label: 'Cijena od (€)', value: priceMin, set: setPriceMin, ph: '0' },
                { label: 'Cijena do (€)', value: priceMax, set: setPriceMax, ph: '∞' },
                { label: 'Kilometri do',  value: kmMax,    set: setKmMax,    ph: '∞' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[9px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-2">
                    {f.label}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    aria-label={f.label}
                    className="w-full h-9 bg-transparent border-0 border-b border-border text-foreground placeholder:text-muted-foreground/60 text-sm font-light tabular-nums focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setSearchModalOpen(true)}
              className="group inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              Detaljna pretraga
              <span className="block h-px w-0 bg-primary group-hover:w-6 transition-all duration-500" />
            </button>
          </div>

          {/* Quick category typographic stack */}
          <div className="mt-10 lg:mt-0 flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              { name: 'Automobili', slug: 'osobni-automobili' },
              { name: 'Motocikli', slug: 'motocikli' },
              { name: 'Kombiji',   slug: 'kombiji-laki-teretni' },
              { name: 'Plovila',   slug: 'plovila-nautika' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                to={`/${cat.slug}`}
                className="group inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
              >
                <span className="block h-px w-3 bg-border group-hover:w-6 group-hover:bg-primary transition-all duration-500" />
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle gradient seam back into the page */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <SuperSearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />
    </section>
  );
};
