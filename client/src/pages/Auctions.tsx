import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, Gavel, Clock, TrendingUp, ShieldCheck } from 'lucide-react';
import { listLiveAuctions, listEndedAuctions, formatCountdown, statusLabel, type AuctionRow } from '../lib/auctions';

// /aukcija — public auction listing grid. Live auctions sorted by end_at asc;
// ended (last 20) shown below as social proof.
export const Auctions = () => {
  const [live, setLive] = useState<AuctionRow[]>([]);
  const [ended, setEnded] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    Promise.all([listLiveAuctions(), listEndedAuctions()]).then(([l, e]) => {
      if (!alive) return;
      setLive(l); setEnded(e); setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Tick countdown every second.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-14">
      <Helmet>
        <title>Aukcija — premium vozila | Vozila.hr</title>
        <meta name="description" content="7-dnevne aukcije premium vozila u Hrvatskoj. Anti-snipe zaštita, transparentno licitiranje, 5% buyer premium." />
        <link rel="canonical" href="https://vozila.hr/aukcija" />
      </Helmet>

      <header className="mb-10 max-w-3xl">
        <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-3 inline-flex items-center gap-2">
          <Gavel className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Aukcija
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light uppercase tracking-tight text-foreground mb-4">
          Premium vozila — 7-dnevna aukcija
        </h1>
        <p className="text-sm font-light text-muted-foreground leading-relaxed">
          Transparentno licitiranje s anti-snipe zaštitom. Ako ponuda stigne u zadnjih 60 sekundi, kraj aukcije se produljuje za 60 sekundi. Buyer premium 5% pri kupnji.
        </p>
        <div className="flex items-center gap-4 mt-5 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> Verificirana vozila</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="w-3 h-3" strokeWidth={1.5} /> Anti-snipe</span>
          <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3 h-3" strokeWidth={1.5} /> Transparent</span>
        </div>
      </header>

      <section className="mb-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-base sm:text-lg font-light uppercase tracking-[0.2em] text-foreground">Aktivne aukcije</h2>
          <span className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
            {live.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} /></div>
        ) : live.length === 0 ? (
          <div className="border border-border bg-card p-10 text-center">
            <Gavel className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm font-light text-muted-foreground">Trenutno nema aktivnih aukcija.</p>
            <p className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground/70 mt-2">Pratite — nove aukcije objavljujemo tjedno.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {live.map((a) => <AuctionCard key={a.id} a={a} now={now} />)}
          </div>
        )}
      </section>

      {ended.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-base sm:text-lg font-light uppercase tracking-[0.2em] text-foreground">Nedavno završene</h2>
            <span className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">{ended.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ended.map((a) => <AuctionCard key={a.id} a={a} now={now} />)}
          </div>
        </section>
      )}
    </div>
  );
};

const AuctionCard = ({ a, now }: { a: AuctionRow; now: number }) => {
  const isLive = a.status === 'live';
  const ended = a.status === 'sold' || a.status === 'reserve_not_met';
  const yr = a.listing?.attributes?.year;
  const km = a.listing?.attributes?.mileage;

  return (
    <Link to={`/aukcija/${a.id}`} className="block group">
      <article className="bg-card border border-border hover:border-primary/40 transition-colors overflow-hidden">
        <div className="relative aspect-[5/4] bg-muted overflow-hidden">
          {a.listing?.main_image ? (
            <img src={a.listing.main_image} alt={a.listing.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Gavel className="w-10 h-10 text-muted-foreground/40" strokeWidth={1} />
            </div>
          )}
          {isLive && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground text-[9px] font-light uppercase tracking-[0.25em]">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Aktivno
            </span>
          )}
          {ended && (
            <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-light uppercase tracking-[0.25em] ${
              a.status === 'sold' ? 'bg-green-600 text-white' : 'bg-foreground/85 text-background'
            }`}>
              {statusLabel(a.status)}
            </span>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="text-sm font-light uppercase tracking-tight text-foreground line-clamp-1">
            {a.listing?.title ?? 'Aukcija'}
          </h3>
          <div className="flex items-center gap-3 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
            {yr && <span>{yr}</span>}
            {km && <span>{Number(km).toLocaleString('hr-HR')} km</span>}
          </div>
          <div className="pt-2 border-t border-border flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-light uppercase tracking-[0.25em] text-muted-foreground">{ended ? 'Posljednja' : 'Trenutna'}</p>
              <p className="text-lg font-light text-foreground tabular-nums">
                {a.current_bid_eur != null ? Number(a.current_bid_eur).toLocaleString('hr-HR') : Number(a.starting_bid_eur).toLocaleString('hr-HR')} €
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-light uppercase tracking-[0.25em] text-muted-foreground">{ended ? 'Ponuda' : 'Završetak'}</p>
              <p className="text-xs font-light text-foreground tabular-nums">
                {ended ? `${a.bid_count}` : formatCountdown(a.end_at, now)}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};
