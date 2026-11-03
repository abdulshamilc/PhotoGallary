import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GallerySettingsProvider, useGallerySettings } from './context/GallerySettingsContext';
import { Heart } from 'lucide-react';
import siteConfig from './config/siteConfig';

// Route-level Code Splitting: loads bundles on demand
const Gallery = lazy(() => import('./pages/Gallery'));
const Admin = lazy(() => import('./pages/Admin'));
const AccessCodeScreen = lazy(() => import('./components/AccessCodeScreen'));
import DownloadToast from './components/DownloadToast';

/**
 * Elegant Champagne/Gold Route Loading Fallback
 */
function LuxuryRouteLoader({ message = siteConfig.eventTitle }) {
  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col items-center justify-center selection:bg-[#800020] selection:text-[#FFF9F0]">
      <div className="relative flex items-center justify-center mb-5">
        <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37]/30 border-t-[#800020] animate-spin" />
        <Heart className="w-6 h-6 text-[#800020] absolute fill-[#800020]/20" />
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-[#75675A] font-light">
        {message}
      </p>
    </div>
  );
}

/**
 * Gallery Route Access Controller:
 * - Public Mode: Anyone can access the gallery without entering a code.
 * - Private Mode: Visitors must enter the 6-digit access code before viewing.
 * - Administrator: Always granted access.
 */
function GalleryRoute() {
  const { isAdmin } = useAuth();
  const { isPublic, isCodeVerified, loadingSettings } = useGallerySettings();

  if (loadingSettings) {
    return <LuxuryRouteLoader message="Opening Wedding Collection..." />;
  }

  // 1. In Public Mode: Open gallery directly
  if (isPublic) {
    return <Gallery />;
  }

  // 2. Administrator has access
  if (isAdmin) {
    return <Gallery />;
  }

  // 3. In Private Mode: If visitor verified access code, grant access
  if (isCodeVerified) {
    return <Gallery />;
  }

  // 4. In Private Mode: Display the 6-digit access-code screen
  return <AccessCodeScreen />;
}

export default function App() {
  return (
    <GallerySettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LuxuryRouteLoader />}>
            <Routes>
              {/* Admin Protected Dashboard */}
              <Route path="/admin" element={<Admin />} />
              
              {/* Main Gallery / Access Code Route */}
              <Route path="/" element={<GalleryRoute />} />
              
              {/* Redirect legacy /login to main access route */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <DownloadToast />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </GallerySettingsProvider>
  );
}
