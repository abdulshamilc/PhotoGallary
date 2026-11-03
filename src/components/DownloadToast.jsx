import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, RefreshCw, X, Download } from 'lucide-react';
import { subscribeToDownloadStatus } from '../services/downloadService';
import WeddingSpinner from './WeddingSpinner';

export default function DownloadToast() {
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    let autoDismissTimer = null;

    const unsubscribe = subscribeToDownloadStatus((event) => {
      clearTimeout(autoDismissTimer);
      setActiveToast(event);

      // Auto-dismiss completed downloads after 4 seconds
      if (event.status === 'completed') {
        autoDismissTimer = setTimeout(() => {
          setActiveToast(null);
        }, 4000);
      }
    });

    return () => {
      clearTimeout(autoDismissTimer);
      unsubscribe();
    };
  }, []);

  if (!activeToast) return null;

  const handleDismiss = () => {
    setActiveToast(null);
  };

  const handleRetry = () => {
    if (activeToast?.retry) {
      activeToast.retry();
    }
  };

  return (
    <div className="fixed bottom-4 inset-x-0 sm:inset-x-auto sm:bottom-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-4 mx-auto sm:mx-0">
      <AnimatePresence>
        <motion.div
          key={activeToast.id + activeToast.status}
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto rounded-2xl bg-[#1C1310]/95 border border-[#D4AF37]/50 text-[#FFF9F0] p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3.5"
        >
          <div className="flex items-center gap-3 min-w-0">
            {activeToast.status === 'downloading' && (
              <WeddingSpinner size="sm" />
            )}
            {activeToast.status === 'completed' && (
              <div className="w-8 h-8 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            {activeToast.status === 'error' && (
              <div className="w-8 h-8 rounded-full bg-rose-950/70 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#FFF9F0] truncate font-sans">
                {activeToast.fileName}
              </p>
              <p className="text-[11px] text-[#E8C878] truncate font-light">
                {activeToast.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeToast.status === 'error' && activeToast.retry && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#800020] hover:bg-[#A52A2A] border border-[#D4AF37]/40 text-xs font-medium text-[#FFF9F0] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              className="p-1 rounded-full text-white/60 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
