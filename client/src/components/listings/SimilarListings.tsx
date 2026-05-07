import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getOptimizedImageUrl } from '../../lib/imageOptimization';

interface SimilarRow {
  id: string;
  title: string;
  price: number | null;
  main_image: string | null;
  category_slug: string | null;
  attributes: any;
  similarity_score: number;
}

export const SimilarListings = ({ listingId }: { listingId: string }) => {
  const [items, setItems] = useState<SimilarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error } = await supabase.rpc('search_similar_listings', {
          p_listing_id: listingId,
          p_limit: 6,
        });
        if (cancelled) return;
        if (error) throw error;
        setItems((data as SimilarRow[]) || []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (error) return null;
  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-lg font-light uppercase tracking-widest text-foreground mb-8">
        Slična vozila
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[5/4] bg-muted animate-pulse" />
            ))
          : items.map((it) => {
              const img = it.main_image
                ? getOptimizedImageUrl(it.main_image, { width: 400, quality: 70, format: 'webp', resize: 'cover' })
                : null;
              const year = it.attributes?.year;
              return (
                <Link
                  key={it.id}
                  to={`/listing/${it.id}`}
                  className="group block bg-card border border-transparent hover:border-border transition-colors"
                >
                  <div className="relative aspect-[5/4] bg-muted overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={it.title}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : null}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-[11px] font-light uppercase tracking-widest text-foreground line-clamp-1">
                      {it.title}
                    </p>
                    <p className="text-[10px] font-light text-muted-foreground">
                      {year ? `${year} · ` : ''}
                      {it.price ? `${Number(it.price).toLocaleString('hr-HR')} €` : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
};
