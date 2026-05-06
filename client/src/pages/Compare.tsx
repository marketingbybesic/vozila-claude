import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { X, ArrowLeftRight, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { onImgError, PLACEHOLDER_CAR } from '../lib/imageFallback';
import { matchScore } from '../lib/matchScore';
import { fuelCost } from '../lib/fuelCost';
import type { Listing } from '../types';

// /usporedba?ids=a,b,c — side-by-side spec table for 2-4 listings.
// Powerful buyer tool, no peers do it.
export const Compare = () => {
  const [params, setParams] = useSearchParams();
  const idsParam = params.get('ids') || '';
  const ids = idsParam.split(',').filter(Boolean).slice(0, 4);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    const run = async () => {
      try {
        const { data } = await supabase
          .from('listings')
          .select('*, categories(slug, name), listing_images(id, url, is_primary, sort_order)')
          .in('id', ids);
        // Preserve URL order
        const byId: Record<string, Listing> = Object.fromEntries((data || []).map((l: any) => [l.id, l]));
        setListings(ids.map((id) => byId[id]).filter(Boolean) as Listing[]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [idsParam]);

  const removeId = (id: string) => {
    const next = ids.filter((x) => x !== id);
    setParams(next.length ? { ids: next.join(',') } : {});
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Usporedba vozila | Vozila.hr</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <section className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-16 lg:py-20">
        <div className="mb-10 lg:mb-12 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-2 inline-flex items-center gap-2">
              <ArrowLeftRight className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              Usporedba
            </p>
            <h1 className="text-3xl sm:text-4xl font-light uppercase tracking-tight text-foreground">
              {listings.length} vozila side-by-side
            </h1>
          </div>
          <span className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground tabular-nums hidden sm:block">
            do 4 vozila istovremeno
          </span>
        </div>

        {loading ? (
          <p className="text-sm font-light text-muted-foreground">Učitavanje…</p>
        ) : listings.length === 0 ? (
          <div className="border border-border bg-muted/20 p-10 sm:p-14 text-center">
            <h3 className="text-xl font-light uppercase tracking-[0.08em] text-foreground mb-2">Nema vozila za usporedbu</h3>
            <p className="text-sm font-light text-muted-foreground max-w-md mx-auto leading-relaxed">
              Dodajte do 4 oglasa u usporedbu otvaranjem oglasa i klikom na &laquo;Usporedi&raquo;, ili posjetite Favoriti.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/pretraga" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors">
                Sva vozila
              </Link>
              <Link to="/favoriti" className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:border-primary hover:text-primary transition-colors">
                Favoriti
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:-mx-10 lg:-mx-14 px-6 sm:px-10 lg:px-14">
            <table className="w-full min-w-[720px] border-collapse">
              <colgroup>
                <col style={{ width: '180px' }} />
                {listings.map((l) => <col key={l.id} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 pr-4 align-bottom">
                    <span className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground">Atribut</span>
                  </th>
                  {listings.map((l) => {
                    const imgs = (l.listing_images || []).slice().sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
                    const img = imgs[0]?.url || PLACEHOLDER_CAR;
                    return (
                      <th key={l.id} className="text-left p-4 align-top relative min-w-[180px]">
                        <button onClick={() => removeId(l.id)} aria-label="Ukloni" className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <Link to={`/listing/${l.id}`} className="block">
                          <div className="relative aspect-[5/4] mb-3 overflow-hidden bg-muted">
                            <img src={img} alt={l.title} onError={onImgError} className="absolute inset-0 w-full h-full object-cover" />
                          </div>
                          <p className="text-xs font-light uppercase tracking-[0.08em] text-foreground line-clamp-2 leading-snug">
                            {l.title}
                          </p>
                          <p className="mt-2 text-base font-light text-primary tabular-nums">
                            {l.price > 0 ? `${l.price.toLocaleString('hr-HR')} ${l.currency || '€'}` : 'Na upit'}
                          </p>
                        </Link>
                      </th>
                    );
                  })}
                  {listings.length < 4 && (
                    <th className="text-left p-4 align-top">
                      <Link to="/pretraga" className="block aspect-[5/4] border border-dashed border-border flex items-center justify-center hover:border-primary text-muted-foreground hover:text-primary transition-colors">
                        <Plus className="w-5 h-5" strokeWidth={1.5} />
                      </Link>
                      <p className="mt-3 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
                        Dodaj vozilo
                      </p>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="text-sm font-light text-foreground">
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border">
                    <td className="py-3 pr-4 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
                      {row.label}
                    </td>
                    {listings.map((l) => (
                      <td key={l.id} className="py-3 px-4 tabular-nums">
                        {row.get(l) ?? <span className="text-muted-foreground/60">—</span>}
                      </td>
                    ))}
                    {listings.length < 4 && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

interface Row { label: string; get: (l: Listing) => any }
const fmtNum = (n: any) => (typeof n === 'number' ? n.toLocaleString('hr-HR') : n);
const ROWS: Row[] = [
  { label: 'Match Score', get: (l) => `${matchScore(l).total}/100` },
  { label: 'Marka',       get: (l) => l.attributes?.make },
  { label: 'Model',       get: (l) => l.attributes?.model },
  { label: 'Godište',     get: (l) => l.attributes?.year },
  { label: 'Kilometraža', get: (l) => l.attributes?.mileage ? `${fmtNum(l.attributes.mileage)} km` : null },
  { label: 'Gorivo',      get: (l) => l.attributes?.fuel },
  { label: 'Mjenjač',     get: (l) => l.attributes?.transmission },
  { label: 'Snaga',       get: (l) => l.attributes?.power_hp ? `${l.attributes.power_hp} KS` : null },
  { label: 'Motor',       get: (l) => l.attributes?.engine_cc ? `${fmtNum(l.attributes.engine_cc)} ccm` : null },
  { label: 'Karoserija',  get: (l) => l.attributes?.body_type },
  { label: 'Pogon',       get: (l) => l.attributes?.drivetrain },
  { label: 'Boja',        get: (l) => l.attributes?.color },
  { label: 'Lokacija',    get: (l) => l.location || l.attributes?.location },
  { label: 'Trošak goriva (€/100km)', get: (l) => {
    const e = fuelCost({ fuel: l.attributes?.fuel, engine_cc: l.attributes?.engine_cc, power_hp: l.attributes?.power_hp, body_type: l.attributes?.body_type, consumption_l_per_100km: l.attributes?.consumption_l_per_100km, consumption_kwh_per_100km: l.attributes?.consumption_kwh_per_100km });
    return e ? `${e.costPer100km.toFixed(2)} €` : null;
  } },
  { label: 'Servisna knjiga', get: (l) => (l.attributes?.service_history ? 'Da' : 'Ne') },
  { label: 'Prvi vlasnik',   get: (l) => (l.attributes?.first_owner ? 'Da' : 'Ne') },
];
