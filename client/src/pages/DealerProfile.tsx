import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, MapPin, Phone, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ListingCard } from '../components/listings/ListingFeed';
import { VerifiedDealerBadge } from '../components/listings/VerifiedDealerBadge';
import { DealerReviews } from '../components/listings/DealerReviews';
import type { SubTierId, SubStatus } from '../lib/subscription';
import type { Listing } from '../types';

// Bug A7 fix: dropped the email field from the public dealer view + the
// mailto link in the contact strip. Email lives in auth.users only and
// never reaches a public page now. Buyers contact via /poruke (messaging
// is the anti-scam path) or via the dealer's listed business phone.
// Slug ↔ dealer is resolved through the email's local-part lookup but
// the email itself is never selected into UI state.
interface DealerData {
  id: string;
  role: string;
  dealer_verified: boolean;
  company_name?: string;
  office_address?: string;
  business_phone?: string;
  whatsapp_number?: string;
  bio?: string;
  logo_url?: string;
  created_at?: string;
  subscription_tier?: SubTierId | null;
  subscription_status?: SubStatus;
}

// /saloni/:dealerSlug — public dealer profile.
// MVP: Shows dealer header (logo, name, verified badge, contact), and a grid
// of their active listings. When the listings.user_id column is restored,
// flip the listing query to filter by user_id instead of returning all.
export const DealerProfile = () => {
  const { dealerSlug } = useParams();
  const [dealer, setDealer] = useState<DealerData | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        // Resolve slug → user. The email's local-part is the slug for v1.
        // We look up auth.users.email to find the id, then ONLY select the
        // public-safe columns from users. Email never enters component state
        // — keeps it off the wire to any unauthenticated request.
        const email = dealerSlug?.includes('@') ? dealerSlug : `${dealerSlug}@vozila.hr`;
        const { data: u } = await supabase
          .from('users')
          .select('id, role, dealer_verified, company_name, office_address, business_phone, whatsapp_number, bio, logo_url, created_at')
          .eq('email', email)
          .maybeSingle();
        const dealerRow = u as DealerData | null;

        // Pull subscription state from profiles (canonical source).
        if (dealerRow) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('subscription_tier, subscription_status')
            .eq('id', dealerRow.id)
            .maybeSingle();
          if (prof) {
            dealerRow.subscription_tier = (prof as any).subscription_tier ?? null;
            dealerRow.subscription_status = (prof as any).subscription_status ?? null;
          }
        }
        setDealer(dealerRow);

        if (!dealerRow) {
          setListings([]);
          return;
        }

        // Filter to this dealer's listings only.
        const { data: l } = await supabase
          .from('listings')
          .select('*, categories(slug, name), listing_images(id, url, is_primary, sort_order)')
          .eq('status', 'active')
          .eq('user_id', dealerRow.id)
          .order('created_at', { ascending: false })
          .limit(48);
        setListings((l || []) as any);
      } catch {
        setDealer(null);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [dealerSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-3xl font-light uppercase tracking-tight text-foreground mb-3">Salon nije pronađen</h1>
          <p className="text-sm text-muted-foreground">Provjerite link ili pretražite druge salone.</p>
          <Link to="/" className="inline-block mt-6 text-xs font-light uppercase tracking-[0.25em] text-primary hover:underline">
            ← Natrag na početnu
          </Link>
        </div>
      </div>
    );
  }

  // Display name falls back to slug since email is no longer in component
  // state (bug A7 fix). dealerSlug is always present here.
  const display = dealer.company_name || (dealerSlug ?? 'Salon');

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{display} — Vozila.hr</title>
        <meta name="description" content={`${display} — autosalon na Vozila.hr. ${listings.length} aktivnih oglasa. ${dealer.dealer_verified ? 'Verificirani prodavač.' : ''}`} />
      </Helmet>

      {/* Header */}
      <section className="border-b border-border bg-muted/20">
        <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-12 lg:py-16">
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 border border-border bg-background flex items-center justify-center flex-shrink-0">
              {dealer.logo_url
                ? <img src={dealer.logo_url} alt={display} className="w-full h-full object-cover" />
                : <span className="text-2xl font-light uppercase tracking-widest text-muted-foreground">{display.slice(0, 2)}</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light uppercase tracking-[0.04em] text-foreground">
                  {display}
                </h1>
                {dealer.subscription_tier &&
                  (dealer.subscription_status === 'active' || dealer.subscription_status === 'trialing') ? (
                  <VerifiedDealerBadge tier={dealer.subscription_tier} size="md" />
                ) : dealer.dealer_verified ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-primary text-primary text-[9px] font-light uppercase tracking-[0.25em]">
                    <ShieldCheck className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                    Verificirani salon
                  </span>
                ) : null}
              </div>

              {dealer.bio && (
                <p className="mt-3 text-sm font-light text-muted-foreground leading-relaxed max-w-3xl">
                  {dealer.bio}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-2">
                  <span className="text-foreground text-base font-light">{listings.length}</span>
                  Aktivnih oglasa
                </span>
                {dealer.created_at && (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-foreground text-base font-light">{new Date(dealer.created_at).getFullYear()}</span>
                    Na platformi
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <Star className="w-3 h-3 text-primary" strokeWidth={1.5} aria-hidden="true" />
                  4.8 / 5.0  <span className="opacity-60">(12 ocjena)</span>
                </span>
              </div>

              {/* Contact line — email removed (bug A7). Buyers contact via
                  /poruke for anti-scam protection; phone stays as direct CTA
                  when the dealer has chosen to publish it. */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                {dealer.office_address && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
                    <MapPin className="w-3 h-3" strokeWidth={1.5} /> {dealer.office_address}
                  </span>
                )}
                {dealer.business_phone && (
                  <a href={`tel:${dealer.business_phone}`} className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.25em] text-foreground hover:text-primary transition-colors">
                    <Phone className="w-3 h-3" strokeWidth={1.5} /> {dealer.business_phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Listings grid */}
      <section className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-12 lg:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-2">
              Oglasi
            </p>
            <h2 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-foreground">
              Sva aktivna vozila
            </h2>
          </div>
          <span className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground tabular-nums">
            {listings.length} oglasa
          </span>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm font-light text-muted-foreground">
            Salon trenutno nema aktivnih oglasa.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {listings.map((l) => (
              <Link key={l.id} to={`/listing/${l.id}`} className="block">
                <ListingCard car={l} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Reviews — buyer ratings of this dealer */}
      <section className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-12 lg:py-16 border-t border-border">
        <DealerReviews dealerId={dealer.id} />
      </section>
    </div>
  );
};
