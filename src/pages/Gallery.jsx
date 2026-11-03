import React, { useState, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import ImageGrid from '../components/ImageGrid';
import WeddingSpinner from '../components/WeddingSpinner';
import { useAuth } from '../context/AuthContext';
import { useGoogleDriveImages } from '../hooks/useGoogleDriveImages';
import { Sparkles, RefreshCw, Heart } from 'lucide-react';
import siteConfig from '../config/siteConfig';

// Code splitting: dynamically import ImagePreviewModal when needed
const ImagePreviewModal = lazy(() => import('../components/ImagePreviewModal'));

export default function Gallery() {
  const { accessToken } = useAuth();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [activeModalImages, setActiveModalImages] = useState(null);
  const galleryRef = useRef(null);

  const {
    images,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useGoogleDriveImages(accessToken);

  const handleSelectImage = (file, index, availableList) => {
    setActiveModalImages(availableList && availableList.length > 0 ? availableList : images);
    setSelectedPhotoIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedPhotoIndex(null);
  };

  const handleNavigateModal = (newIndex) => {
    setSelectedPhotoIndex(newIndex);
  };

  const scrollToGallery = () => {
    if (galleryRef.current) {
      galleryRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#2B2118] flex flex-col selection:bg-[#800020] selection:text-[#FFF9F0]">
      {/* Hero Section */}
      <HeroSection onScrollToGallery={scrollToGallery} photoCount={images.length} />

      {/* Main Gallery Section */}
      <section ref={galleryRef} className="relative pt-4 sm:pt-8 pb-16 sm:pb-24 px-2 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Image Grid */}
        <ImageGrid
          images={images}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          error={error}
          onSelectImage={handleSelectImage}
          onLoadMore={loadMore}
          onRetry={refresh}
          accessToken={accessToken}
        />
      </section>

      {/* Code-split Full-screen Lightbox Preview Modal */}
      {selectedPhotoIndex !== null && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
              <WeddingSpinner size="lg" label="Opening photograph..." />
            </div>
          }
        >
          <ImagePreviewModal
            images={activeModalImages || images}
            selectedIndex={selectedPhotoIndex}
            onClose={handleCloseModal}
            onNavigate={handleNavigateModal}
            accessToken={accessToken}
          />
        </Suspense>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[#D4AF37]/20 py-10 text-center text-xs text-[#75675A] bg-[#F5E6CC]/30">
        <p className="font-serif text-sm text-[#2B2118] mb-1">
          {siteConfig.eventTitle}
        </p>
        <p>© {siteConfig.footerTagline}</p>
        <div className="mt-3">
          <Link to="/admin" className="text-[11px] text-[#75675A]/60 hover:text-[#800020] transition-colors">
            Admin Portal
          </Link>
        </div>
      </footer>
    </div>
  );
}
