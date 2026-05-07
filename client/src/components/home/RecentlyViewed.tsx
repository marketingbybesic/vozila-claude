import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { loadRecent, RecentEntry } from '../../lib/recentlyViewed';
import { onImgError, PLACEHOLDER_CAR } from '../../lib/imageFallback';

// Recently-viewed strip — endowment-effect hook. Shows up to 6 cards in a
// horizontal scroll on home. Hidden if empty. Updates live when user views
// a new listing (via vozila:recent-updated CustomEvent).

export const RecentlyViewed = () => {
  const [items, setItems] = useState<RecentEntry[]>([]);

  useEffect(() => {
    const refresh = () => setItems(loadRecent().slice(0, 6));
    refresh();
    window.addEventListener('vozila:recent-updated', refresh);
    return () => window.removeEventListener('vozila:recent-updated', refresh);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 px-6 sm:px-10 lg:px-14 max-w-[1480px] mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-3 inline-flex items-center gap-2">
            <Clock className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Nedavno pregledano
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-light uppercase tracking-tight text-foreground">
            Tu si stao
          </h2>
        </div>
        <span className="hidden sm:block text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground tabular-nums">
          {String(items.length).padStart(2, '0')} oglasa
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-hide">
        {items.map((it) => (
          <Link
            key={it.id}
            to={`/listing/${it.id}`}
            className="group flex-shrink-0 w-[260px] sm:w-[280px] block"
            aria-label={`Vrati se na ${it.title}`}
          >
            <div className="relative aspect-[5/4] overflow-hidden bg-muted">
              <img
                src={it.imageUrl || PLACEHOLDER_CAR}
                alt={it.title}
                onError={onImgError}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <span className="absolute bottom-0 right-0 px-3 py-1.5 bg-background/90 backdrop-blur-sm text-[10px] font-light uppercase tracking-[0.2em] text-foreground">
                Vrati se →
              </span>
            </div>
            <div className="pt-3">
              <h3 className="text-sm font-light uppercase tracking-[0.08em] text-foreground line-clamp-1">
                {it.title}
              </h3>
              <p className="mt-1 text-sm font-light text-primary tabular-nums">
                {it.price > 0 ? `${it.price.toLocaleString('hr-HR')} €` : 'Na upit'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
