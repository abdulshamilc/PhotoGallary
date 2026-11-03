import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, Loader2, RefreshCw, ImageOff } from 'lucide-react';
import { downloadImage } from '../utils/downloadImage';
import { isFileDownloading } from '../services/downloadService';
import { getCachedPreviewUrl } from '../services/imageCacheService';
import { buildDriveImageUrls, fetchSingleFileMetadata } from '../services/googleDrive';
import { loadImageWithQueue } from '../services/imageQueueService';
import { calculateBackoff, wait } from '../utils/retryWithBackoff';
import WeddingSpinner from './WeddingSpinner';

export default function ImageCard({
  file,
  index,
  onSelect,
  accessToken,
  onStatusChange,
  retryTrigger = 0,
}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'available' | 'unavailable'
  const [candidates, setCandidates] = useState(() => buildDriveImageUrls(file, 1000));
  const [activeSrc, setActiveSrc] = useState(null);

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(() => isFileDownloading(file?.id));

  const shouldReduceMotion = useReducedMotion();
  const fileIdRef = useRef(file?.id);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const lastRetryTriggerRef = useRef(retryTrigger);

  /**
   * Resilient Image Loading Pipeline
   * Attempts candidate URLs sequentially with concurrency limits and exponential backoff
   */
  const executeLoadPipeline = useCallback(async (urlList, isManualRetry = false) => {
    if (!urlList || urlList.length === 0) {
      if (isMountedRef.current) {
        setStatus('unavailable');
        if (onStatusChange && file?.id) onStatusChange(file.id, 'unavailable');
      }
      return;
    }

    // Cancel any previous in-flight load attempt
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isMountedRef.current && !isManualRetry) {
      setStatus('loading');
      setRetryError(null);
      if (onStatusChange && file?.id) onStatusChange(file.id, 'loading');
    }

    // 1. Check local Cache API first for immediate zero-latency resolution
    const firstUrl = urlList[0];
    if (firstUrl && !isManualRetry) {
      try {
        const cachedBlob = await getCachedPreviewUrl(firstUrl);
        if (cachedBlob && isMountedRef.current && !controller.signal.aborted) {
          setActiveSrc(cachedBlob);
          setStatus('available');
          if (onStatusChange && file?.id) onStatusChange(file.id, 'available');
          return;
        }
      } catch {}
    }

    // 2. Iterate through candidate URLs with concurrency limiting and exponential backoff
    let loadedSuccessfully = false;

    for (let attempt = 0; attempt < urlList.length; attempt++) {
      if (controller.signal.aborted || !isMountedRef.current) return;

      const candidateUrl = urlList[attempt];
      try {
        // Enqueue through concurrency limiter (max 4 concurrent requests across app)
        await loadImageWithQueue(candidateUrl, {
          signal: controller.signal,
          timeoutMs: 12000,
        });

        // Image completely loaded and decoded in memory
        if (isMountedRef.current && !controller.signal.aborted) {
          setActiveSrc(candidateUrl);
          setStatus('available');
          setIsRetrying(false);
          setRetryError(null);
          if (onStatusChange && file?.id) onStatusChange(file.id, 'available');
          loadedSuccessfully = true;
          break;
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        // If not the final candidate, apply exponential backoff with full jitter
        if (attempt < urlList.length - 1) {
          const backoffMs = calculateBackoff(attempt, { baseDelay: 300, maxDelay: 2500 });
          await wait(backoffMs);
        }
      }
    }

    // 3. If all candidate URLs failed
    if (!loadedSuccessfully && isMountedRef.current && !controller.signal.aborted) {
      setStatus('unavailable');
      setIsRetrying(false);
      if (isManualRetry) {
        setRetryError('Retry failed. Photograph still unavailable.');
      }
      if (onStatusChange && file?.id) onStatusChange(file.id, 'unavailable');
    }
  }, [file?.id, onStatusChange]);

  // Initial mount and file change pipeline
  useEffect(() => {
    isMountedRef.current = true;

    if (file?.id !== fileIdRef.current) {
      fileIdRef.current = file?.id;
      const newCandidates = buildDriveImageUrls(file, 1000);
      setCandidates(newCandidates);
      executeLoadPipeline(newCandidates, false);
    } else {
      executeLoadPipeline(candidates, false);
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [file?.id]); // Only re-run if file identity changes

  // Manual retry handler (refreshes Google Drive token, appends cache-buster, re-attempts)
  const handleRetry = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isRetrying) return; // Prevent duplicate concurrent retry requests

    setIsRetrying(true);
    setRetryError(null);

    try {
      // Re-fetch metadata with forceRefresh = true to obtain fresh signatures
      let freshFile = null;
      try {
        freshFile = await fetchSingleFileMetadata(file.id, accessToken, true);
      } catch (metaErr) {
        console.warn('Metadata token refresh notice:', metaErr?.message || metaErr);
      }

      const targetFile = freshFile || file;
      const baseUrls = buildDriveImageUrls(targetFile, 1000);
      const cacheBustCandidates = baseUrls.map((u) => {
        const sep = u.includes('?') ? '&' : '?';
        return `${u}${sep}_r=${Date.now()}`;
      });

      setCandidates(cacheBustCandidates);
      await executeLoadPipeline(cacheBustCandidates, true);
    } catch {
      if (isMountedRef.current) {
        setIsRetrying(false);
        setStatus('unavailable');
        setRetryError('Retry failed');
        if (onStatusChange && file?.id) onStatusChange(file.id, 'unavailable');
      }
    }
  }, [file, accessToken, isRetrying, executeLoadPipeline, onStatusChange]);

  // Gallery-level retry trigger listener
  useEffect(() => {
    if (retryTrigger > 0 && retryTrigger !== lastRetryTriggerRef.current) {
      lastRetryTriggerRef.current = retryTrigger;
      if (status === 'unavailable' && !isRetrying) {
        handleRetry();
      }
    }
  }, [retryTrigger, status, isRetrying, handleRetry]);

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (isDownloading || isFileDownloading(file?.id)) return;

    try {
      setIsDownloading(true);
      await downloadImage(file, accessToken);
    } catch (err) {
      console.warn('Download notice:', err?.message || err);
    } finally {
      if (isMountedRef.current) {
        setIsDownloading(false);
      }
    }
  };

  // =========================================================================
  // UNAVAILABLE CARD: Kept in grid at bottom, luxury styling, 3-column mobile fit
  // =========================================================================
  if (status === 'unavailable') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="photo-card group relative aspect-[3/4] min-w-0 rounded-lg sm:rounded-2xl overflow-hidden bg-gradient-to-b from-[#F5E6CC]/50 via-[#F5E6CC]/25 to-[#FFF9F0] border border-[#D4AF37]/35 shadow-sm hover:border-[#800020]/50 transition-all duration-300 flex flex-col items-center justify-between p-2 sm:p-4 text-center select-none"
      >
        {/* Subtle decorative top border */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />

        {/* Top: Icon */}
        <div className="pt-2 sm:pt-4">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] mx-auto shadow-inner">
            <ImageOff className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
          </div>
        </div>

        {/* Center: Message & Metadata */}
        <div className="my-auto px-0.5 sm:px-1 space-y-1">
          <p className="text-[10px] sm:text-xs font-serif font-medium text-[#2B2118] leading-tight">
            Image currently unavailable
          </p>
          {file?.name && (
            <p className="text-[8px] sm:text-[10px] text-[#75675A] truncate max-w-[90px] sm:max-w-[130px] mx-auto font-mono opacity-80" title={file.name}>
              {file.name}
            </p>
          )}
          {retryError && (
            <p className="text-[8px] sm:text-[9px] text-[#800020] font-medium leading-none animate-fade-in">
              {retryError}
            </p>
          )}
        </div>

        {/* Bottom: Retry Button */}
        <div className="pb-1 sm:pb-2 w-full flex justify-center">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full max-w-[105px] sm:max-w-[125px] flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#800020] hover:bg-[#A52A2A] text-[#FFF9F0] text-[9px] sm:text-xs font-medium border border-[#D4AF37]/50 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60"
            aria-label={`Retry loading ${file.name || 'photograph'}`}
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                <span className="hidden sm:inline">Retrying...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Retry</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // AVAILABLE / LOADING CARD: Normal photograph display with high visual polish
  // =========================================================================
  const isAvailable = status === 'available';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.15 : 0.45,
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.04, 0.5),
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => {
        if (isAvailable && onSelect) {
          onSelect(file, index);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && isAvailable && onSelect) {
          e.preventDefault();
          onSelect(file, index);
        }
      }}
      className="photo-card group relative aspect-[3/4] min-w-0 rounded-lg sm:rounded-2xl overflow-hidden bg-[#F5E6CC]/40 cursor-pointer border border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-wedding hover:shadow-wedding-lg transition-all duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-[#800020]/60 select-none"
    >
      {/* Background loading spinner while image is in 'loading' state */}
      {!isAvailable && (
        <div className="absolute inset-0 bg-[#F5E6CC]/35 flex items-center justify-center z-0">
          <WeddingSpinner size="sm" label="Curating photograph..." />
        </div>
      )}

      {/* Verified image element. Rendered only when completely decoded and available */}
      {activeSrc && (
        <img
          key={activeSrc}
          src={activeSrc}
          alt={file.name || 'Wedding photograph'}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 z-10 relative ${
            isAvailable ? 'opacity-100 filter-none' : 'opacity-0 blur-sm pointer-events-none'
          }`}
        />
      )}

      {/* Elegant Warm Vignette Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#2B2118]/85 via-[#800020]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />

      {/* Subtle Gold Rim Highlight */}
      <div className="absolute inset-0 rounded-lg sm:rounded-2xl ring-1 ring-inset ring-[#D4AF37]/30 group-hover:ring-[#D4AF37] transition-all duration-300 pointer-events-none z-20" />

      {/* Minimal Download Button Floating in Bottom Right */}
      {isAvailable && (
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-3 sm:right-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            aria-label={`Download ${file.name || 'photograph'}`}
            title="Download original resolution"
            className="p-1.5 sm:p-2.5 rounded-full bg-[#800020]/90 sm:bg-[#800020] hover:bg-[#A52A2A] text-[#FFF9F0] border border-[#D4AF37]/50 transition-all duration-200 shadow-md hover:shadow-burgundy-glow hover:scale-110 active:scale-95"
          >
            {isDownloading ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-[#FFF9F0]" />
            ) : (
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
