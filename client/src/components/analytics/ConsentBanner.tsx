import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getAnalytics } from '../../lib/analytics';

export const ConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('analytics_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const analytics = getAnalytics();
    analytics.setConsent({
      analytics: true,
      marketing: true,
    });
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const analytics = getAnalytics();
    analytics.setConsent({
      analytics: false,
      marketing: false,
    });
    setIsVisible(false);
  };

  const handleCustom = (analytics: boolean, marketing: boolean) => {
    const analyticsManager = getAnalytics();
    analyticsManager.setConsent({
      analytics,
      marketing,
    });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 to-black/90 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!showDetails ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">
                Zaštita Vaše Privatnosti
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Koristimo Google Analytics i Meta Pixel za poboljšanje iskustva. Vaši podaci su zaštićeni prema GDPR regulativi.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
              >
                Detalji
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Odbij
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Prihvati
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                Postavke Privatnosti
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 bg-black/40 rounded-lg p-4 border border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-1">Google Analytics 4</p>
                  <p className="text-xs text-slate-400">
                    Analitika posjeta i ponašanja korisnika za poboljšanje platforme.
                  </p>
                </div>
                <label className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    onChange={(e) => {
                      const marketing = localStorage.getItem('analytics_consent')
                        ? JSON.parse(localStorage.getItem('analytics_consent')!).marketing
                        : false;
                      handleCustom(e.target.checked, marketing);
                    }}
                    className="w-4 h-4 rounded accent-primary"
                  />
                </label>
              </div>

              <div className="flex items-start justify-between pt-3 border-t border-white/10">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-1">Meta Pixel</p>
                  <p className="text-xs text-slate-400">
                    Praćenje konverzija i personalizirani oglasi (učitava se nakon prve interakcije).
                  </p>
                </div>
                <label className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    onChange={(e) => {
                      const analytics = localStorage.getItem('analytics_consent')
                        ? JSON.parse(localStorage.getItem('analytics_consent')!).analytics
                        : false;
                      handleCustom(analytics, e.target.checked);
                    }}
                    className="w-4 h-4 rounded accent-primary"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Odbij Sve
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Prihvati Sve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
