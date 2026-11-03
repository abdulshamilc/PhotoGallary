import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { downloadImage } from '../utils/downloadImage';
import { isFileDownloading } from '../services/downloadService';
import { getCachedPreviewUrl } from '../services/imageCacheService';
import { buildDriveImageUrls } from '../services/googleDrive';
import { loadImageWithQueue } from '../services/imageQueueService';
import { calculateBackoff, wait } from '../utils/retryWithBackoff';
import WeddingSpinner from './WeddingSpinner';

export default function ImagePreviewModal({
  images,
  selectedIndex,
  onClose,
  onNavigate,
  accessToken,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeHighResSrc, setActiveHighResSrc] = useState(null);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const abortRef = useRef(null);

  const currentFile = images[selectedIndex];
  const hasMultiple = images.length > 1;

  // Progressive high-resolution image loading pipeline
  useEffect(() => {
    if (!currentFile) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsHighResLoaded(false);
    // Display thumbnail immediately as low-res placeholder while high-res loads
    const initialThumb = currentFile.thumbnailLink || currentFile.previewLink;
    setActiveHighResSrc(initialThumb);

    const candidates = buildDriveImageUrls(currentFile, 2048);

    (async () => {
      // 1. Check cache first
      for (const u of candidates) {
        if (controller.signal.aborted) return;
        try {
          const cached = await getCachedPreviewUrl(u);
          if (cached && !controller.signal.aborted) {
            setActiveHighResSrc(cached);
            setIsHighResLoaded(true);
            return;
          }
        } catch {}
      }

      // 2. Load candidates via concurrency queue with exponential backoff
      for (let attempt = 0; attempt < candidates.length; attempt++) {
        if (controller.signal.aborted) return;
        const url = candidates[attempt];
        try {
          await loadImageWithQueue(url, { signal: controller.signal, timeoutMs: 15000 });
          if (!controller.signal.aborted) {
            setActiveHighResSrc(url);
            setIsHighResLoaded(true);
            return;
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          if (attempt < candidates.length - 1) {
            const delay = calculateBackoff(attempt, { baseDelay: 250, maxDelay: 2000 });
            await wait(delay);
          }
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [currentFile?.id]);

  // Keyboard navigation listener (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        onNavigate((selectedIndex - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        onNavigate((selectedIndex + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedIndex, images.length, hasMultiple, onClose, onNavigate]);

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance && hasMultiple) {
      onNavigate((selectedIndex + 1) % images.length);
    } else if (distance < -minSwipeDistance && hasMultiple) {
      onNavigate((selectedIndex - 1 + images.length) % images.length);
    }

    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  const handleDownload = async () => {
    if (!currentFile || isDownloading || isFileDownloading(currentFile.id)) return;
    try {
      setIsDownloading(true);
      await downloadImage(currentFile, accessToken);
    } catch (err) {
      console.warn('Download notice in modal:', err?.message || err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!currentFile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1610]/95 backdrop-blur-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Action Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-10 py-3 sm:py-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Photo Counter & Size Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#E8C878] font-medium">
              {selectedIndex + 1} / {images.length}
            </span>
            {currentFile.size && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono text-white/70 bg-white/10 border border-[#D4AF37]/30">
                {currentFile.size}
              </span>
            )}
          </div>

          {/* Actions: Download & Close */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#800020] hover:bg-[#A52A2A] text-[#FFF9F0] border border-[#D4AF37]/50 text-xs sm:text-sm font-medium transition-all duration-200 shadow-burgundy-glow hover:scale-105 active:scale-95 disabled:opacity-60"
              title="Download original resolution"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  <span className="hidden sm:inline">Downloading Original...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E8C878]" />
                  <span className="hidden sm:inline">Download Original</span>
                  <span className="sm:hidden text-[11px]">Download</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-[#800020] text-white/80 hover:text-white border border-[#D4AF37]/30 transition-all duration-200 hover:scale-105 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Close preview"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main Image Container */}
        <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-12 md:p-16 select-none">
          {!isHighResLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <WeddingSpinner size="lg" label="Enhancing resolution..." />
            </div>
          )}

          <motion.img
            key={currentFile.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: isHighResLoaded ? 1 : 0.6, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            src={activeHighResSrc}
            alt={currentFile.name || 'Wedding photograph'}
            className="max-w-full max-h-[72vh] sm:max-h-[84vh] object-contain rounded-lg sm:rounded-xl shadow-2xl ring-1 ring-[#D4AF37]/20"
          />
        </div>

        {/* Navigation Buttons (Both Mobile & Desktop) */}
        {hasMultiple && (
          <>
            <button
              onClick={() => onNavigate((selectedIndex - 1 + images.length) % images.length)}
              className="flex absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 p-2 sm:p-3.5 rounded-full bg-black/40 hover:bg-[#800020] text-[#E8C878] hover:text-[#FFF9F0] border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all duration-200 backdrop-blur-md shadow-lg hover:scale-110 active:scale-95 z-30"
              aria-label="Previous photograph"
              title="Previous (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={() => onNavigate((selectedIndex + 1) % images.length)}
              className="flex absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 p-2 sm:p-3.5 rounded-full bg-black/40 hover:bg-[#800020] text-[#E8C878] hover:text-[#FFF9F0] border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all duration-200 backdrop-blur-md shadow-lg hover:scale-110 active:scale-95 z-30"
              aria-label="Next photograph"
              title="Next (Right Arrow)"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Bottom Mobile Hint */}
        <div className="sm:hidden absolute bottom-5 inset-x-0 text-center pointer-events-none">
          <span className="text-[11px] text-[#E8C878]/70 tracking-widest uppercase">Swipe left or right to browse</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
