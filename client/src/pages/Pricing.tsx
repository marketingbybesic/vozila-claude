import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Building2, ShieldCheck, Crown, Sparkles, Zap, BarChart3, Users, Headphones, Globe, Loader2 } from 'lucide-react';
import { startSubscriptionCheckout, getMySubscription, type SubTierId, type ProfileSubscription } from '../lib/subscription';

interface Tier {
  id: SubTierId | 'enterprise';
  name: string;
  priceEur: number;
  period: string;
  tagline: string;
  perks: { icon: any; text: string }[];
  highlighted?: boolean;
  ctaText: string;
  contactOnly?: boolean;
}

const tiers: Tier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    priceEur: 39,
    period: 'mjesečno',
    tagline: 'Idealno za male autosalone i privatne prodavače.',
    perks: [
      { icon: Check,        text: 'Do 15 aktivnih oglasa' },
      { icon: ShieldCheck,  text: 'Verificirani prodavač značka' },
      { icon: BarChart3,    text: 'Osnovne statistike' },
      { icon: Sparkles,     text: '10€ Boost kredita mjesečno' },
    ],
    ctaText: 'Pokreni Bronze',
  },
  {
    id: 'silver',
    name: 'Silver',
    priceEur: 99,
    period: 'mjesečno',
    tagline: 'Najbolji izbor za rastuće autosalone.',
    perks: [
      { icon: Check,        text: 'Do 50 aktivnih oglasa' },
      { icon: ShieldCheck,  text: 'Verificirani prodavač + Premium značka' },
      { icon: BarChart3,    text: 'Napredna analitika i lead tracking' },
      { icon: Sparkles,     text: '40€ Boost kredita mjesečno' },
      { icon: Zap,          text: 'Prioritetni rangiranje u kategorijama' },
      { icon: Headphones,   text: 'Brza email podrška (24h)' },
    ],
    highlighted: true,
    ctaText: 'Pokreni Silver',
  },
  {
    id: 'gold',
    name: 'Gold',
    priceEur: 299,
    period: 'mjesečno',
    tagline: 'Bez ograničenja. Vlastiti dashboard, dedicated podrška.',
    perks: [
      { icon: Check,        text: 'Neograničeno aktivnih oglasa' },
      { icon: Crown,        text: 'Brendirani salon profil' },
      { icon: BarChart3,    text: 'Tjedni izvještaji + API pristup' },
      { icon: Sparkles,     text: '150€ Boost kredita mjesečno' },
      { icon: Zap,          text: 'Featured na homepage rotaciji' },
      { icon: Users,        text: 'Multi-user dashboard za tim' },
      { icon: Headphones,   text: 'Dedicated account manager' },
      { icon: Globe,        text: 'Internacionalna distribucija (uskoro)' },
    ],
    ctaText: 'Pokreni Gold',
  },
];

export const Pricing = () => {
  const [params] = useSearchParams();
  const cancelled = params.get('sub') === 'cancel';
  const [me, setMe] = useState<ProfileSubscription | null>(null);
  const [busy, setBusy] = useState<SubTierId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMySubscription().then((p) => { if (alive) setMe(p); });
    return () => { alive = false; };
  }, []);

  const onPick = async (tier: Tier) => {
    setError(null);
    if (tier.contactOnly || tier.id === 'enterprise') return;
    const tierId = tier.id as SubTierId;
    setBusy(tierId);
    try {
      const { url, error: err } = await startSubscriptionCheckout(tierId);
      if (url) {
        window.location.href = url;
        return;
      }
      setError(err ?? 'Nepoznata greška.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pretplate za autosalone i prodavače | Vozila.hr</title>
        <meta name="description" content="Tri jasna paketa za autosalone i prodavače: Bronze 39€/mj, Silver 99€/mj, Gold 299€/mj. Verificirana značka, Boost kreditii, dashboard analitike." />
      </Helmet>

      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <p className="text-[10px] font-light uppercase tracking-[0.35em] text-primary mb-4 inline-flex items-center gap-2 justify-center">
            <Building2 className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Za autosalone i prodavače
          </p>
          <h1 className="fluid-h1 font-light uppercase tracking-tight text-foreground mb-5">
            Tri paketa. Jasna cijena.
          </h1>
          <p className="text-sm font-light text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Verificirana značka, Boost krediti, analitika. Bez skrivenih troškova. Otkažite kad god želite.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col p-6 sm:p-8 border transition-colors ${
                tier.highlighted ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-foreground/40'
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-6 px-2 py-1 bg-primary text-primary-foreground text-[9px] font-medium uppercase tracking-[0.25em]">
                  Najpopularnije
                </span>
              )}

              <h3 className="text-sm font-light uppercase tracking-[0.25em] text-foreground mb-2">
                {tier.name}
              </h3>
              <p className="text-xs font-light text-muted-foreground leading-relaxed mb-6 min-h-[2.5em]">
                {tier.tagline}
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="fluid-h1 font-light text-foreground tabular-nums">
                    {tier.priceEur}
                  </span>
                  <span className="text-base text-muted-foreground">€</span>
                </div>
                <p className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mt-1">
                  {tier.period} · isključujući PDV
                </p>
              </div>

              {/* Hairline */}
              <div className="h-px bg-border mb-6" />

              <ul className="flex-1 space-y-3 mb-8">
                {tier.perks.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.text} className="flex items-start gap-3 text-xs font-light text-foreground/85 leading-snug">
                      <Icon className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                      <span>{p.text}</span>
                    </li>
                  );
                })}
              </ul>

              {tier.contactOnly ? (
                <Link
                  to="/kontakt"
                  className={`block text-center px-5 py-3 text-[10px] font-light uppercase tracking-[0.25em] transition-colors ${
                    tier.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-foreground text-foreground hover:bg-foreground hover:text-background'
                  }`}
                >
                  {tier.ctaText}
                </Link>
              ) : (
                <button
                  onClick={() => onPick(tier)}
                  disabled={busy !== null || (me?.subscription_tier === tier.id && me?.subscription_status === 'active')}
                  className={`flex items-center justify-center gap-2 text-center px-5 py-3 text-[10px] font-light uppercase tracking-[0.25em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    tier.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-foreground text-foreground hover:bg-foreground hover:text-background'
                  }`}
                >
                  {busy === tier.id && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />}
                  {me?.subscription_tier === tier.id && me?.subscription_status === 'active'
                    ? 'Trenutni plan'
                    : tier.ctaText}
                </button>
              )}
            </div>
          ))}
        </div>

        {(error || cancelled) && (
          <div className="mt-6 max-w-xl mx-auto">
            {cancelled && !error && (
              <p className="text-xs font-light text-muted-foreground text-center border border-border px-4 py-3">
                Pretplata otkazana — niste naplaćeni. Možete pokušati ponovo.
              </p>
            )}
            {error && (
              <p className="text-xs font-light text-red-500 text-center border border-red-500/30 px-4 py-3">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Comparison strip */}
        <div className="mt-20 lg:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-5 border border-border">
            <p className="text-[10px] font-light uppercase tracking-[0.3em] text-primary mb-3">Verifikacija</p>
            <h4 className="text-base font-light uppercase tracking-tight text-foreground mb-2">
              Vozila Verified Salon
            </h4>
            <p className="text-xs font-light text-muted-foreground leading-relaxed">
              Provjeravamo OIB, sjedište i poslovne reference. Verificirani prodavači imaju 3× više leadova.
            </p>
          </div>
          <div className="p-5 border border-border">
            <p className="text-[10px] font-light uppercase tracking-[0.3em] text-primary mb-3">Boost krediti</p>
            <h4 className="text-base font-light uppercase tracking-tight text-foreground mb-2">
              Iskoristite kako vam odgovara
            </h4>
            <p className="text-xs font-light text-muted-foreground leading-relaxed">
              Boost krediti se troše kako vi odlučite — pojedinačno na svaki oglas. Featured 7 dana = 14,99 €.
            </p>
          </div>
          <div className="p-5 border border-border">
            <p className="text-[10px] font-light uppercase tracking-[0.3em] text-primary mb-3">Analitika</p>
            <h4 className="text-base font-light uppercase tracking-tight text-foreground mb-2">
              Stvarni signali ponašanja
            </h4>
            <p className="text-xs font-light text-muted-foreground leading-relaxed">
              Pregledi, klikovi WhatsAppa, otvaranja kontakata, prosječno vrijeme do prodaje — svaki tjedan u inboxu.
            </p>
          </div>
        </div>

        {/* FAQ-lite footer */}
        <div className="mt-20 text-center">
          <h2 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-foreground mb-4">
            Trebate prilagođenu ponudu?
          </h2>
          <p className="text-sm font-light text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            Veći salon, prilagođen API ili integracija s vašim CRM-om? Razgovarajmo.
          </p>
          <Link
            to="/kontakt"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Pošalji upit
          </Link>
        </div>
      </div>
    </div>
  );
};
