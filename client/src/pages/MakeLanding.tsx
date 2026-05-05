import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ListingCard } from '../components/listings/ListingFeed';
import type { Listing } from '../types';

// /marka/<make> and /marka/<make>/<model> — SEO landing pages.
// Strategy: dedicated URL per make/model with crawlable intro text + pinned
// canonical, plus the underlying listing grid filtered server-side. Internal
// linking to top models for the make.

const niceMake = (slug: string) => slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export const MakeLanding = () => {
  const { makeSlug, modelSlug } = useParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [topModels, setTopModels] = useState<{ model: string; count: number }[]>([]);

  const makeName = useMemo(() => makeSlug ? niceMake(makeSlug) : '', [makeSlug]);
  const modelName = useMemo(() => modelSlug ? niceMake(modelSlug) : '', [modelSlug]);

  useEffect(() => {
    if (!makeSlug) return;
    let alive = true;
    setLoading(true);
    (async () => {
      let q = supabase
        .from('listings')
        .select('*, categories(slug, name), listing_images(id, url, is_primary, sort_order), owner:profiles!listings_user_id_fkey(id, company_name, logo_url, subscription_tier, subscription_status, is_verified, dealer_verified)')
        .eq('status', 'active')
        .eq('attributes->>make', makeName)
        .order('created_at', { ascending: false })
        .limit(48);
      if (modelSlug) q = q.eq('attributes->>model', modelName);
      const { data } = await q;
      if (!alive) return;
      setListings((data ?? []) as any);

      if (!modelSlug) {
        // Compute top models for this make (client-side bucket — fine for ≤48 rows).
        const counts = new Map<string, number>();
        for (const row of (data ?? []) as any[]) {
          const m = row?.attributes?.model;
          if (!m) continue;
          counts.set(m, (counts.get(m) ?? 0) + 1);
        }
        const top = [...counts.entries()].map(([model, count]) => ({ model, count }))
          .sort((a, b) => b.count - a.count).slice(0, 12);
        if (alive) setTopModels(top);
      } else {
        setTopModels([]);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [makeSlug, modelSlug, makeName, modelName]);

  if (!makeSlug) {
    navigate('/pretraga');
    return null;
  }

  const heading = modelName ? `${makeName} ${modelName} — oglasi u Hrvatskoj` : `${makeName} — oglasi u Hrvatskoj`;
  const intro = modelName
    ? `Pregledajte aktualne ${makeName} ${modelName} oglase na Vozila.hr. Filtriranje po godini, kilometraži, cijeni i lokaciji. Verificirani saloni, sigurne poruke, opcija plaćenog VIN izvještaja.`
    : `Pregledajte ${makeName} oglase u Hrvatskoj. Sve generacije, sve modele, sve cijene. Vozila.hr je premium marketplace za hrvatske kupce — ${listings.length > 0 ? listings.length + ' aktivnih oglasa' : 'redovito ažuriran katalog'}.`;
  const canonical = modelSlug
    ? `https://vozila.hr/marka/${makeSlug}/${modelSlug}`
    : `https://vozila.hr/marka/${makeSlug}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{heading} | Vozila.hr</title>
        <meta name="description" content={intro.slice(0, 160)} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={heading} />
        <meta property="og:description" content={intro.slice(0, 160)} />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: heading,
            description: intro,
            url: canonical,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: listings.length,
            },
          })}
        </script>
      </Helmet>

      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-12 lg:py-16">
        {/* Breadcrumbs */}
        <nav className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Početna</Link>
          <span className="mx-2 opacity-40">/</span>
          <Link to="/pretraga" className="hover:text-foreground">Pretraga</Link>
          <span className="mx-2 opacity-40">/</span>
          {modelSlug ? (
            <>
              <Link to={`/marka/${makeSlug}`} className="hover:text-foreground">{makeName}</Link>
              <span className="mx-2 opacity-40">/</span>
              <span className="text-foreground">{modelName}</span>
            </>
          ) : (
            <span className="text-foreground">{makeName}</span>
          )}
        </nav>

        <header className="mb-10 max-w-3xl">
          <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-3">
            Marka
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light uppercase tracking-tight text-foreground mb-5">
            {heading}
          </h1>
          <p className="text-sm font-light text-muted-foreground leading-relaxed">
            {intro}
          </p>
        </header>

        {/* Top models — internal linking */}
        {topModels.length > 0 && (
          <div className="mb-10">
            <p className="text-[10px] font-light uppercase tracking-[0.3em] text-foreground mb-3">
              Najpopularniji {makeName} modeli
            </p>
            <div className="flex flex-wrap gap-2">
              {topModels.map((m) => (
                <Link
                  key={m.model}
                  to={`/marka/${makeSlug}/${m.model.toLowerCase().replace(/\s+/g, '-')}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-border text-foreground text-[10px] font-light uppercase tracking-[0.2em] hover:border-primary hover:text-primary transition-colors"
                >
                  {m.model}
                  <span className="opacity-60 tabular-nums">{m.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" strokeWidth={1.5} />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-light text-muted-foreground mb-4">Trenutno nema {makeName} {modelName} oglasa.</p>
            <Link to="/pretraga" className="inline-flex items-center gap-2 px-5 py-3 border border-foreground text-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-foreground hover:text-background transition-colors">
              Pregledaj sve oglase
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {listings.map((l) => (
              <Link key={l.id} to={`/listing/${l.id}`} className="block">
                <ListingCard car={l} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
