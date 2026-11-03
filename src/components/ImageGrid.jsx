import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';
import ImageCard from './ImageCard';
import LoadingSkeleton from './LoadingSkeleton';
import WeddingSpinner from './WeddingSpinner';

export default function ImageGrid({
  images = [],
  loading,
  loadingMore,
  hasMore,
  error,
  onSelectImage,
  onLoadMore,
  onRetry,
  accessToken,
}) {
  // Track individual image statuses: 'loading' | 'available' | 'unavailable'
  const [statusMap, setStatusMap] = useState({});
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const sentinelRef = useRef(null);

  // Status update callback from ImageCard
  const handleStatusChange = useCallback((id, status) => {
    if (!id) return;
    setStatusMap((prev) => {
      if (prev[id] === status) return prev;
      return { ...prev, [id]: status };
    });
  }, []);

  // Gallery-level retry trigger for all unavailable images
  const handleRetryAllUnavailable = useCallback(() => {
    setIsRetryingAll(true);
    setRetryTrigger((prev) => prev + 1);
    setTimeout(() => {
      setIsRetryingAll(false);
    }, 1200);
  }, []);

  // Partition & Sort:
  // 1. Successfully loaded images first
  // 2. Images currently loading in the middle
  // 3. Unavailable images at the bottom
  // Preserves natural order within each group.
  const { sortedImages, unavailableCount, availableImages } = useMemo(() => {
    const availableList = [];
    const loadingList = [];
    const unavailableList = [];

    for (const img of images) {
      if (!img || !img.id) continue;
      const status = statusMap[img.id] || 'loading';
      if (status === 'available') {
        availableList.push(img);
      } else if (status === 'unavailable') {
        unavailableList.push(img);
      } else {
        loadingList.push(img);
      }
    }

    return {
      sortedImages: [...availableList, ...loadingList, ...unavailableList],
      unavailableCount: unavailableList.length,
      availableImages: availableList,
    };
  }, [images, statusMap]);

  // Handle card click - passes index within availableImages for modal lightbox
  const handleCardSelect = useCallback((file) => {
    if (!onSelectImage || !file) return;
    const indexInAvailable = availableImages.findIndex((img) => img.id === file.id);
    onSelectImage(file, indexInAvailable >= 0 ? indexInAvailable : 0, availableImages);
  }, [availableImages, onSelectImage]);

  // Infinite Scroll IntersectionObserver Sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore || error) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '350px 0px', // Pre-fetch before user reaches absolute bottom
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore, error, onLoadMore]);

  // Initial loading state with elegant wedding spinner
  if (loading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-8">
        <WeddingSpinner size="lg" label="Curating wedding memories..." showText={true} />
        <div className="w-full">
          <LoadingSkeleton count={8} />
        </div>
      </div>
    );
  }

  // Initial Error state
  if (error && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-4 rounded-full bg-[#F5E6CC] border border-[#800020]/30 text-[#800020] mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-serif text-[#2B2118] mb-2 font-medium">Unable to load photographs</h3>
        <p className="text-[#75675A] text-sm max-w-md mb-6 leading-relaxed">
          {error}
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#800020] hover:bg-[#A52A2A] text-[#FFF9F0] text-sm font-medium border border-[#D4AF37]/40 shadow-sm transition-all duration-200 hover:scale-105"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // Empty state
  if (!loading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-md mx-auto">
        <div className="p-5 rounded-full bg-[#F5E6CC]/60 border border-[#D4AF37]/40 text-[#800020] mb-4 shadow-sm">
          <Camera className="w-10 h-10 stroke-[1.25]" />
        </div>
        <h3 className="text-2xl font-serif text-[#2B2118] tracking-wide mb-2 font-medium">No Photographs Available</h3>
        <p className="text-[#75675A] text-xs sm:text-sm leading-relaxed mb-6 font-light">
          Photographs for this album are currently being curated. Please check back shortly.
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#800020] hover:bg-[#A52A2A] text-[#FFF9F0] text-xs font-medium border border-[#D4AF37]/40 shadow-sm transition-all duration-200 hover:scale-105"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Gallery</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Gallery-level Refresh Banner when unavailable images exist */}
      {unavailableCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#F5E6CC]/50 border border-[#D4AF37]/40 shadow-sm transition-all animate-fade-in">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="p-1.5 rounded-full bg-[#800020]/10 text-[#800020] shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-serif font-medium text-[#2B2118]">
                {unavailableCount} Photograph{unavailableCount > 1 ? 's' : ''} Currently Unavailable
              </p>
              <p className="text-[10px] sm:text-xs text-[#75675A]">
                Moved to the bottom of the gallery. You can retry them individually or all at once.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetryAllUnavailable}
            disabled={isRetryingAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#800020] hover:bg-[#A52A2A] text-[#FFF9F0] text-xs font-medium border border-[#D4AF37]/50 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
            <span>{isRetryingAll ? 'Retrying All...' : 'Retry All Unavailable'}</span>
          </button>
        </div>
      )}

      {/* Responsive Grid: Mobile 3-per-row, Tablet 4, Desktop 5-6 */}
      <div className="photo-grid">
        {sortedImages.map((image, index) => (
          <ImageCard
            key={image.id}
            file={image}
            index={index}
            onSelect={handleCardSelect}
            accessToken={accessToken}
            onStatusChange={handleStatusChange}
            retryTrigger={retryTrigger}
          />
        ))}
      </div>

      {/* Infinite Scroll Sentinel & Circular Loading Animation */}
      <div
        ref={sentinelRef}
        className="w-full flex flex-col items-center justify-center py-6 min-h-[90px]"
      >
        {loadingMore && (
          <div className="flex flex-col items-center justify-center py-4 animate-fade-in">
            <WeddingSpinner size="md" label="Loading more memories..." showText={true} />
          </div>
        )}

        {/* Retry option in case infinite scroll encounters a network glitch */}
        {error && images.length > 0 && !loadingMore && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-xs text-[#800020] font-medium">{error}</p>
            <button
              onClick={onLoadMore}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#F5E6CC] hover:bg-[#800020] text-[#2B2118] hover:text-[#FFF9F0] border border-[#D4AF37] text-xs font-medium transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading More Photographs</span>
            </button>
          </div>
        )}

        {/* End of Gallery subtle indicator */}
        {!hasMore && images.length > 0 && !loading && (
          <div className="flex items-center justify-center gap-3 py-6 opacity-60">
            <div className="h-[1px] w-12 bg-[#D4AF37]/40" />
            <span className="font-serif text-xs text-[#75675A] tracking-widest uppercase">
              End of Gallery
            </span>
            <div className="h-[1px] w-12 bg-[#D4AF37]/40" />
          </div>
        )}
      </div>
    </div>
  );
}
