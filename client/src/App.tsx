import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ConsentBanner } from './components/analytics/ConsentBanner';
import { initializeAnalytics } from './lib/analytics';
import { Home } from './pages/Home';
import { ListingFeed } from './components/listings/ListingFeed';

// Code-split the heavy / rarely-visited routes. Reduces initial JS by ~40%.
// Keeps Home + ListingFeed eager since they're the high-traffic landing routes.
const Dashboard           = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ListingWizard       = lazy(() => import('./components/listings/ListingWizard').then(m => ({ default: m.ListingWizard })));
const CreateListingWizard = lazy(() => import('./components/listings/CreateListingWizard').then(m => ({ default: m.CreateListingWizard })));
const ListingDetail       = lazy(() => import('./components/listings/ListingDetail').then(m => ({ default: m.ListingDetail })));
const MobileUpload        = lazy(() => import('./pages/MobileUpload').then(m => ({ default: m.MobileUpload })));
const Settings            = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const UserProfile         = lazy(() => import('./pages/Profile').then(m => ({ default: m.UserProfile })));
const Favorites           = lazy(() => import('./pages/Favorites').then(m => ({ default: m.Favorites })));
const Kontakt             = lazy(() => import('./pages/Kontakt').then(m => ({ default: m.Kontakt })));
const Privacy             = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms               = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Pricing             = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const AdminDashboard      = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DealerProfile       = lazy(() => import('./pages/DealerProfile').then(m => ({ default: m.DealerProfile })));
const NotFound            = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const DealerIndex         = lazy(() => import('./pages/DealerIndex').then(m => ({ default: m.DealerIndex })));
const About               = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Compare             = lazy(() => import('./pages/Compare').then(m => ({ default: m.Compare })));
const Messages            = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const MakeLanding         = lazy(() => import('./pages/MakeLanding').then(m => ({ default: m.MakeLanding })));
const Auctions            = lazy(() => import('./pages/Auctions').then(m => ({ default: m.Auctions })));
const AuctionDetail       = lazy(() => import('./pages/AuctionDetail').then(m => ({ default: m.AuctionDetail })));
const Inspector           = lazy(() => import('./pages/Inspector').then(m => ({ default: m.Inspector })));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

function App() {
  useEffect(() => {
    initializeAnalytics({
      ga4MeasurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID || '',
      metaPixelId: import.meta.env.VITE_META_PIXEL_ID || '',
    });
  }, []);

  return (
    <HelmetProvider>
      <BrowserRouter>
        <NuqsAdapter>
          <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header />

            <main className="flex-1 flex flex-col">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/predaj-oglas" element={<ListingWizard />} />
                  <Route path="/create-listing" element={<CreateListingWizard />} />
                  <Route path="/listing/:id" element={<ListingDetail />} />
                  <Route path="/mobile-upload" element={<MobileUpload />} />
                  <Route path="/postavke" element={<Settings />} />
                  <Route path="/profil" element={<UserProfile />} />
                  <Route path="/favoriti" element={<Favorites />} />
                  <Route path="/kontakt" element={<Kontakt />} />
                  <Route path="/privatnost" element={<Privacy />} />
                  <Route path="/uvjeti-koristenja" element={<Terms />} />
                  <Route path="/za-partnere" element={<Pricing />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/saloni" element={<DealerIndex />} />
                  <Route path="/saloni/:dealerSlug" element={<DealerProfile />} />
                  <Route path="/o-nama" element={<About />} />
                  <Route path="/usporedba" element={<Compare />} />
                  <Route path="/poruke" element={<Messages />} />
                  <Route path="/poruke/:id" element={<Messages />} />
                  <Route path="/marka/:makeSlug" element={<MakeLanding />} />
                  <Route path="/marka/:makeSlug/:modelSlug" element={<MakeLanding />} />
                  <Route path="/aukcija" element={<Auctions />} />
                  <Route path="/aukcija/:id" element={<AuctionDetail />} />
                  <Route path="/inspector" element={<Inspector />} />
                  {/* /pretraga — general search with nuqs URL state */}
                  <Route path="/pretraga" element={<ListingFeed />} />
                  <Route path="/:categorySlug" element={<ListingFeed />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>

            <Footer />

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />

            {/* GDPR Consent Banner */}
            <ConsentBanner />
          </div>
        </NuqsAdapter>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
