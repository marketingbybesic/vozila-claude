import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, Gavel, Clock, MapPin, ChevronLeft, AlertCircle, Sparkles } from 'lucide-react';
import {
  getAuction,
  listAuctionBids,
  placeBid,
  subscribeToAuction,
  formatCountdown,
  statusLabel,
  type AuctionRow,
  type AuctionBidRow,
} from '../lib/auctions';
import { supabase } from '../lib/supabase';

export const AuctionDetail = () => {
  const { id } = useParams();
  const [auction, setAuction] = useState<AuctionRow | null>(null);
  const [bids, setBids] = useState<AuctionBidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [meId, setMeId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidBusy, setBidBusy] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  // Auth.
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data: { user } }) => { if (alive) setMeId(user?.id ?? null); });
    return () => { alive = false; };
  }, []);

  const reload = useCallback(async () => {
    if (!id) return;
    const [a, b] = await Promise.all([getAuction(id), listAuctionBids(id)]);
    setAuction(a);
    setBids(b);
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime subscription.
  useEffect(() => {
    if (!id) return;
    const ch = subscribeToAuction(id, () => reload());
    return () => { ch.unsubscribe(); };
  }, [id, reload]);

  // 1s tick for countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} /></div>;
  }

  if (!auction) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
        <div>
          <Gavel className="w-10 h-10 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
          <h1 className="text-xl font-light uppercase tracking-tight text-foreground mb-2">Aukcija nije pronađena</h1>
          <Link to="/aukcija" className="inline-flex items-center gap-2 px-6 py-3 mt-4 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors">
            Sve aukcije
          </Link>
        </div>
      </div>
    );
  }

  const isLive = auction.status === 'live';
  const isSeller = meId === auction.seller_id;
  const reserveLabel = auction.reserve_eur != null
    ? auction.current_bid_eur != null && auction.current_bid_eur >= auction.reserve_eur
      ? 'Rezerva dostignuta'
      : 'Rezerva nije dostignuta'
    : null;
  const minNext = (auction.current_bid_eur ?? auction.starting_bid_eur) + auction.min_bid_increment_eur;

  const onPlaceBid = async () => {
    setBidError(null);
    setBidSuccess(null);
    const amount = Number(bidAmount);
    if (!Number.isFinite(amount)) { setBidError('Unesite broj.'); return; }
    if (!meId) { setBidError('Prijavite se za licitaciju.'); return; }
    if (isSeller) { setBidError('Ne možete licitirati svoju aukciju.'); return; }
    if (amount < minNext) { setBidError(`Minimalna sljedeća ponuda: ${minNext.toLocaleString('hr-HR')} €.`); return; }

    setBidBusy(true);
    const res = await placeBid(auction.id, amount);
    setBidBusy(false);
    if (!res.ok) {
      setBidError(
        res.error === 'auth_required' ? 'Prijavite se.' :
        res.error === 'seller_cannot_bid' ? 'Ne možete licitirati svoju aukciju.' :
        res.error === 'not_live' ? 'Aukcija nije aktivna.' :
        res.error === 'bid_too_low' ? `Minimalna sljedeća ponuda: ${(res.min_next ?? minNext).toLocaleString('hr-HR')} €.` :
        res.error || 'Greška.'
      );
      return;
    }
    setBidSuccess(res.extended ? `Ponuda primljena. Aukcija produžena na ${new Date(res.end_at!).toLocaleTimeString('hr-HR')}.` : 'Ponuda primljena.');
    setBidAmount('');
  };

  return (
    <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Helmet>
        <title>{auction.listing?.title ?? 'Aukcija'} — Aukcija | Vozila.hr</title>
        <link rel="canonical" href={`https://vozila.hr/aukcija/${auction.id}`} />
      </Helmet>

      <Link to="/aukcija" className="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-3 h-3" strokeWidth={1.5} /> Sve aukcije
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-10">
        {/* Main */}
        <div>
          <div className="aspect-video bg-muted overflow-hidden">
            {auction.listing?.main_image ? (
              <img src={auction.listing.main_image} alt={auction.listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gavel className="w-12 h-12 text-muted-foreground/40" strokeWidth={1} />
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <h1 className="fluid-h1 font-light uppercase tracking-tight text-foreground">
              {auction.listing?.title ?? 'Aukcija'}
            </h1>
            {auction.listing?.location && (
              <p className="inline-flex items-center gap-1.5 text-xs font-light uppercase tracking-[0.25em] text-muted-foreground">
                <MapPin className="w-3 h-3" strokeWidth={1.5} /> {auction.listing.location}
              </p>
            )}
            {auction.listing && (
              <Link to={`/listing/${auction.listing.id}`} className="inline-block text-[10px] font-light uppercase tracking-[0.25em] text-primary hover:underline">
                Pogledaj puni oglas →
              </Link>
            )}
          </div>

          {/* Bid history */}
          <section className="mt-10">
            <h2 className="text-sm font-light uppercase tracking-[0.25em] text-foreground mb-4">
              Ponude · {auction.bid_count}
            </h2>
            {bids.length === 0 ? (
              <p className="text-sm font-light text-muted-foreground">Još nema ponuda.</p>
            ) : (
              <ul className="border border-border divide-y divide-border bg-card">
                {bids.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-light text-foreground">
                        {b.bidder?.company_name || `Bidder ${b.bidder_id.slice(0, 6)}`}
                      </p>
                      <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
                        {new Date(b.placed_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'medium' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-light text-foreground tabular-nums">
                        {Number(b.amount_eur).toLocaleString('hr-HR')} €
                      </p>
                      {b.extended_end_to && (
                        <p className="text-[9px] font-light uppercase tracking-[0.25em] text-amber-500 inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" strokeWidth={1.5} /> Anti-snipe
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar — bid panel */}
        <aside className="lg:sticky lg:sticky-below-header self-start">
          <div className="border border-border bg-card p-5 space-y-4">
            <span className={`inline-flex px-2 py-1 text-[9px] font-light uppercase tracking-[0.25em] border ${
              isLive ? 'border-primary/40 bg-primary/5 text-primary'
              : auction.status === 'sold' ? 'border-green-500/40 bg-green-500/5 text-green-500'
              : 'border-border text-muted-foreground'
            }`}>
              {statusLabel(auction.status)}
            </span>

            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1">Trenutna ponuda</p>
              <p className="text-3xl font-light text-foreground tabular-nums">
                {auction.current_bid_eur != null
                  ? Number(auction.current_bid_eur).toLocaleString('hr-HR')
                  : Number(auction.starting_bid_eur).toLocaleString('hr-HR')} €
              </p>
              {reserveLabel && (
                <p className={`text-[10px] font-light uppercase tracking-[0.25em] mt-1 ${
                  reserveLabel === 'Rezerva dostignuta' ? 'text-green-500' : 'text-amber-500'
                }`}>
                  {reserveLabel}
                </p>
              )}
            </div>

            {isLive && (
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3" strokeWidth={1.5} /> Završetak
                </p>
                <p className="text-xl font-light text-foreground tabular-nums">{formatCountdown(auction.end_at, now)}</p>
              </div>
            )}

            {isLive && (
              <div className="border-t border-border pt-4 space-y-3">
                <label className="block">
                  <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Vaša ponuda (EUR)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={minNext}
                    step={auction.min_bid_increment_eur}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min ${minNext.toLocaleString('hr-HR')}`}
                    className="w-full bg-background border border-border px-3 py-3 text-base font-light text-foreground focus:outline-none focus:border-primary tabular-nums"
                    disabled={isSeller || !meId || bidBusy}
                  />
                </label>
                <button
                  onClick={onPlaceBid}
                  disabled={bidBusy || isSeller || !meId}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bidBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Gavel className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  Postavi ponudu
                </button>
                {bidError && <div className="flex items-start gap-2 text-[10px] font-light text-red-400"><AlertCircle className="w-3 h-3 mt-0.5" strokeWidth={1.5} />{bidError}</div>}
                {bidSuccess && <div className="text-[10px] font-light text-green-500">{bidSuccess}</div>}

                <p className="text-[10px] font-light text-muted-foreground/70 leading-relaxed">
                  Buyer premium {auction.buyer_premium_pct}%. Ponuda je obvezujuća. Anti-snipe produljuje aukciju 60s ako ponuda padne u zadnjih 60 sekundi.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
