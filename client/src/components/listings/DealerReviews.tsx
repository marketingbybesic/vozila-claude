import { useEffect, useState } from 'react';
import { Star, MessageCircle, Loader2, Send } from 'lucide-react';
import {
  listDealerReviews,
  getDealerRatingSummary,
  canBuyerReview,
  submitReview,
  respondToReview,
  type Review,
  type DealerRatingSummary,
} from '../../lib/reviews';
import { supabase } from '../../lib/supabase';

interface Props {
  dealerId: string;
}

// Dealer reviews surface — used on DealerProfile.
// Shows aggregated rating + distribution + review list. Buyers eligible
// (message thread > 7 days old) see a write-review form. Dealer sees
// "Odgovori" button on each review.
export const DealerReviews = ({ dealerId }: Props) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<DealerRatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rev, sum, { data: { user } }] = await Promise.all([
        listDealerReviews(dealerId),
        getDealerRatingSummary(dealerId),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;
      setReviews(rev);
      setSummary(sum);
      setMeId(user?.id ?? null);
      if (user) {
        const e = await canBuyerReview(dealerId);
        if (alive) setEligibility(e);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [dealerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  const isDealer = meId === dealerId;
  const total = summary?.review_count ?? 0;
  const avg = summary?.avg_rating ?? 0;
  const dist = [
    { stars: 5, count: summary?.count_5 ?? 0 },
    { stars: 4, count: summary?.count_4 ?? 0 },
    { stars: 3, count: summary?.count_3 ?? 0 },
    { stars: 2, count: summary?.count_2 ?? 0 },
    { stars: 1, count: summary?.count_1 ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground mb-2">Recenzije</p>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-light text-foreground tabular-nums">
              {total > 0 ? avg.toFixed(1) : '—'}
            </p>
            <p className="text-sm font-light text-muted-foreground tabular-nums">
              / 5.0 · {total} {total === 1 ? 'recenzija' : 'recenzija'}
            </p>
          </div>
        </div>
        {total > 0 && (
          <div className="flex-1 min-w-[200px] max-w-md space-y-1">
            {dist.map(({ stars, count }) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
                  <span className="w-3">{stars}</span>
                  <Star className="w-3 h-3 text-primary" strokeWidth={1.5} />
                  <div className="flex-1 h-1 bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eligible buyer — write-review form */}
      {eligibility?.eligible && !isDealer && (
        <WriteReviewForm dealerId={dealerId} onSubmitted={(r) => setReviews((prev) => [r, ...prev])} />
      )}

      {/* Inelegible reason — show greyed out */}
      {eligibility && !eligibility.eligible && !isDealer && (
        <div className="border border-border px-4 py-3 text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground">
          {eligibility.reason}
        </div>
      )}

      {/* List */}
      {reviews.length === 0 ? (
        <p className="text-xs font-light text-muted-foreground">Još nema recenzija.</p>
      ) : (
        <ul className="space-y-5">
          {reviews.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              isDealer={isDealer}
              onResponded={(text) => {
                setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, dealer_response: text, response_at: new Date().toISOString() } : x)));
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

const WriteReviewForm = ({ dealerId, onSubmitted }: { dealerId: string; onSubmitted: (r: Review) => void }) => {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!rating) { setError('Odaberite ocjenu.'); return; }
    setBusy(true);
    const res = await submitReview({ dealer_id: dealerId, rating, body });
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Greška.'); return; }
    setDone(true);
    onSubmitted({
      id: res.id!,
      dealer_id: dealerId,
      buyer_id: '', listing_id: null,
      rating, body: body.trim() || null,
      verified_purchase: true,
      dealer_response: null, response_at: null,
      status: 'published',
      created_at: new Date().toISOString(),
    });
  };

  if (done) {
    return (
      <div className="border border-green-500/30 bg-green-500/5 px-4 py-3 text-xs font-light text-green-400">
        Hvala — recenzija je objavljena.
      </div>
    );
  }

  return (
    <div className="border border-border p-5">
      <p className="text-[10px] font-light uppercase tracking-[0.25em] text-foreground mb-3">Ostavite recenziju</p>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            aria-label={`${n} zvjezdica`}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star className={`w-5 h-5 ${n <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Recite drugima kako je izgledala suradnja…"
        className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 mb-3 resize-none"
      />
      {error && <p className="text-[10px] font-light text-red-400 mb-3">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !rating}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />}
        Pošalji recenziju
      </button>
    </div>
  );
};

const ReviewItem = ({ review, isDealer, onResponded }: { review: Review; isDealer: boolean; onResponded: (text: string) => void }) => {
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitResponse = async () => {
    setError(null);
    if (!responseText.trim()) return;
    setBusy(true);
    const res = await respondToReview(review.id, responseText);
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Greška.'); return; }
    onResponded(responseText);
    setResponding(false);
    setResponseText('');
  };

  return (
    <li className="border-b border-border pb-5 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} strokeWidth={1.5} />
        ))}
        {review.verified_purchase && (
          <span className="ml-2 text-[9px] font-light uppercase tracking-[0.25em] text-muted-foreground">Potvrđeni kontakt</span>
        )}
        <span className="ml-auto text-[9px] font-light uppercase tracking-[0.2em] text-muted-foreground/70 tabular-nums">
          {new Date(review.created_at).toLocaleDateString('hr-HR')}
        </span>
      </div>
      <p className="text-xs font-light text-muted-foreground mb-1">
        {review.buyer?.company_name || 'Anoniman kupac'}
      </p>
      {review.body && <p className="text-sm font-light text-foreground leading-relaxed">{review.body}</p>}

      {review.dealer_response && (
        <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/40 text-sm font-light text-foreground/85">
          <p className="text-[10px] font-light uppercase tracking-[0.25em] text-primary mb-1 inline-flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Odgovor prodavača
          </p>
          {review.dealer_response}
        </div>
      )}

      {isDealer && !review.dealer_response && !responding && (
        <button
          onClick={() => setResponding(true)}
          className="mt-3 text-[10px] font-light uppercase tracking-[0.25em] text-primary hover:underline"
        >
          Odgovori na recenziju
        </button>
      )}

      {isDealer && responding && (
        <div className="mt-3 space-y-2">
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Vaš odgovor…"
            className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 resize-none"
          />
          {error && <p className="text-[10px] font-light text-red-400">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={submitResponse}
              disabled={busy || !responseText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Send className="w-3 h-3" strokeWidth={1.5} />}
              Pošalji
            </button>
            <button
              onClick={() => { setResponding(false); setResponseText(''); }}
              className="px-4 py-2 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
            >
              Otkaži
            </button>
          </div>
        </div>
      )}
    </li>
  );
};
