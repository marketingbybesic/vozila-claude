import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Trash2, ArrowLeft, Shield, User, Bell, BellRing, CreditCard, ExternalLink, Loader2, Download } from 'lucide-react';
import { deleteAccount } from '../lib/auth';
import { getMySubscription, openCustomerPortal, tierLabel, type ProfileSubscription } from '../lib/subscription';
import { VerifiedDealerBadge } from '../components/listings/VerifiedDealerBadge';
import { supabase } from '../lib/supabase';

export const Settings = () => {
  const [params] = useSearchParams();
  const subSuccess = params.get('sub') === 'success';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [sub, setSub] = useState<ProfileSubscription | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const reload = () => getMySubscription().then((p) => { if (alive) setSub(p); });
    reload();
    // After Checkout success, the webhook may take a beat; poll briefly.
    if (subSuccess) {
      const t = setTimeout(reload, 1500);
      return () => { alive = false; clearTimeout(t); };
    }
    return () => { alive = false; };
  }, [subSuccess]);

  const handlePortal = async () => {
    setPortalError(null);
    setPortalBusy(true);
    try {
      const { url, error } = await openCustomerPortal();
      if (url) { window.location.href = url; return; }
      setPortalError(error ?? 'Greška.');
    } finally {
      setPortalBusy(false);
    }
  };

  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExportError(null);
    setExportBusy(true);
    try {
      const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
      if (!fnUrl) { setExportError('Nije konfigurirano (VITE_SUPABASE_FUNCTIONS_URL).'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setExportError('Niste prijavljeni.'); return; }
      const res = await fetch(`${fnUrl}/gdpr-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setExportError(`(${res.status}) Greška.`); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vozila-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Greška.');
    } finally {
      setExportBusy(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText.trim().toLowerCase() !== 'obrisi') return;
    setDeleting(true);
    const res = await deleteAccount();
    setDeleting(false);
    if (res.success) {
      setResult({ success: true, message: 'Vaši podaci su trajno obrisani. Preusmjeravam...' });
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } else {
      setResult({ success: false, message: res.error || 'Brisanje nije uspjelo.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Natrag
      </Link>

      <h1 className="text-xl font-light uppercase tracking-[0.2em] text-foreground mb-8">Postavke</h1>

      <div className="flex flex-col gap-6">
        {/* Subscription Card */}
        <div className="border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-xs font-light uppercase tracking-[0.15em] text-foreground">Pretplata</h2>
            {sub?.subscription_tier && (
              <span className="ml-auto"><VerifiedDealerBadge tier={sub.subscription_tier} size="md" /></span>
            )}
          </div>

          {subSuccess && (
            <p className="text-xs font-light text-green-400 mb-4 border border-green-500/30 px-3 py-2">
              Plaćanje je uspjelo. Status pretplate ažurira se u nekoliko sekundi.
            </p>
          )}

          {sub?.subscription_tier && sub.subscription_status === 'active' ? (
            <div className="space-y-3">
              <p className="text-sm font-light text-foreground/70">
                Aktivni plan: <span className="text-foreground">{tierLabel(sub.subscription_tier)}</span>
              </p>
              {sub.subscription_renews_at && (
                <p className="text-xs font-light text-muted-foreground">
                  Sljedeća naplata: {new Date(sub.subscription_renews_at).toLocaleDateString('hr-HR')}
                </p>
              )}
              <button
                onClick={handlePortal}
                disabled={portalBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted/30 text-foreground font-light uppercase tracking-[0.15em] text-[10px] border border-border hover:bg-muted/50 transition-all duration-300 disabled:opacity-50"
              >
                {portalBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />}
                Upravljaj pretplatom
              </button>
              {portalError && (
                <p className="text-[10px] font-light text-red-400">{portalError}</p>
              )}
            </div>
          ) : sub?.subscription_status === 'past_due' ? (
            <div className="space-y-3">
              <p className="text-sm font-light text-orange-400">
                Plaćanje nije uspjelo. Ažurirajte karticu da zadržite pristup.
              </p>
              <button
                onClick={handlePortal}
                disabled={portalBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500/10 text-orange-400 font-light uppercase tracking-[0.15em] text-[10px] border border-orange-500/30 hover:bg-orange-500/20 transition-all duration-300 disabled:opacity-50"
              >
                {portalBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />}
                Ažuriraj plaćanje
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-light text-muted-foreground leading-relaxed">
                Nemate aktivnu pretplatu. Pretplate Bronze / Silver / Gold otključavaju verificiranu značku, više oglasa i Boost kredite.
              </p>
              <Link
                to="/za-partnere"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-light uppercase tracking-[0.15em] text-[10px] hover:bg-primary/90 transition-colors"
              >
                Pogledaj pakete
              </Link>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-xs font-light uppercase tracking-[0.15em] text-foreground">Profil</h2>
          </div>
          <p className="text-sm font-light text-muted-foreground leading-relaxed">
            Upravljanje profilom dolazi uskoro. Trenutno možete zatražiti brisanje svih Vaših podataka u skladu s GDPR-om.
          </p>
        </div>

        {/* Notification Settings Card */}
        <div className="border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-xs font-light uppercase tracking-[0.15em] text-foreground">Obavijesti</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm font-light text-muted-foreground">Email obavijesti o novim oglasima</span>
              </div>
              <button
                onClick={() => setEmailNotifications((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 border border-border ${emailNotifications ? 'bg-primary' : 'bg-muted/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-300 ${emailNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm font-light text-muted-foreground">In-app obavijesti o promjeni cijene</span>
              </div>
              <button
                onClick={() => setPriceAlerts((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 border border-border ${priceAlerts ? 'bg-primary' : 'bg-muted/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-300 ${priceAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & GDPR Card */}
        <div className="border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-xs font-light uppercase tracking-[0.15em] text-foreground">Privatnost i sigurnost</h2>
          </div>

          {/* GDPR — data export */}
          <div className="border-t border-border pt-4 mt-4 mb-6">
            <h3 className="text-[10px] font-light uppercase tracking-[0.2em] text-foregroundmb-3 flex items-center gap-2">
              <Download className="w-4 h-4" strokeWidth={1.5} />
              Preuzmi moje podatke (GDPR)
            </h3>
            <p className="text-sm font-light text-muted-foreground mb-4 leading-relaxed">
              Preuzmite JSON datoteku sa svim Vašim podacima na Vozila.hr — oglasi, poruke, recenzije, leadovi, rezervacije, VIN izvještaji, spremljene pretrage.
            </p>
            <button
              onClick={handleExport}
              disabled={exportBusy}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted/30 text-foregroundborder border-border hover:bg-muted/50 font-light uppercase tracking-[0.15em] text-[10px] transition-all disabled:opacity-50"
            >
              {exportBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Download className="w-3.5 h-3.5" strokeWidth={1.5} />}
              Preuzmi podatke
            </button>
            {exportError && <p className="text-[10px] font-light text-red-400 mt-2">{exportError}</p>}
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-[10px] font-light uppercase tracking-[0.2em] text-red-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
              Brisanje računa (GDPR — pravo na zaborav)
            </h3>
            <p className="text-sm font-light text-muted-foreground mb-6 leading-relaxed">
              Brisanjem računa uklanjamo sve Vaše oglase, slike, analitiku i osobne podatke. Ova radnja je
              <span className="text-muted-foreground"> nepovratna</span>.
            </p>

            {!confirmOpen ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-transparent text-red-400 font-light uppercase tracking-[0.15em] text-[10px] border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                Obriši moje podatke
              </button>
            ) : (
              <div className="border border-red-500/20 bg-red-500/5 p-5">
                {result ? (
                  <p className={`text-sm font-light ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                    {result.message}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-light text-muted-foreground mb-4">
                      Za potvrdu, upišite <span className="text-foreground font-light">"obrisi"</span> u polje ispod:
                    </p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full bg-transparent border border-border px-4 py-3 text-sm font-light text-foregroundplaceholder-white/20 focus:border-red-500/30 focus:outline-none mb-4"
                      placeholder="obrisi"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDelete}
                        disabled={confirmText.trim().toLowerCase() !== 'obrisi' || deleting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 font-light uppercase tracking-[0.15em] text-[10px] border border-red-500/30 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {deleting ? 'Brisanje...' : 'Potvrdi brisanje'}
                      </button>
                      <button
                        onClick={() => { setConfirmOpen(false); setConfirmText(''); }}
                        className="px-5 py-2.5 text-muted-foreground font-light uppercase tracking-[0.15em] text-[10px] border border-border hover:bg-muted/30 hover:text-foreground transition-all duration-300"
                      >
                        Odustani
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
