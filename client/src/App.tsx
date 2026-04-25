import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ConsentBanner } from './components/analytics/ConsentBanner';
import { initializeAnalytics } from './lib/analytics';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { ListingFeed } from './components/listings/ListingFeed';
import { ListingWizard } from './components/listings/ListingWizard';
import { CreateListingWizard } from './components/listings/CreateListingWizard';
import { ListingDetail } from './components/listings/ListingDetail';
import { MobileUpload } from './pages/MobileUpload';

function App() {
  useEffect(() => {
    initializeAnalytics({
      ga4MeasurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID || '',
      metaPixelId: import.meta.env.VITE_META_PIXEL_ID || '',
    });
  }, []);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/predaj-oglas" element={<ListingWizard />} />
            <Route path="/create-listing" element={<CreateListingWizard />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/mobile-upload" element={<MobileUpload />} />
            <Route path="/:categorySlug" element={<ListingFeed />} />
          </Routes>
        </main>

        <Footer />
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* GDPR Consent Banner */}
        <ConsentBanner />
      </div>
    </BrowserRouter>
  );
}

export default App;