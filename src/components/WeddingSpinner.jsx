import React from 'react';
import { Heart } from 'lucide-react';

/**
 * Elegant Circular Loading Animation
 * Curated with the wedding luxury palette: Burgundy (#800020), Soft Gold (#D4AF37), and Champagne (#F5E6CC)
 * @param {'sm' | 'md' | 'lg'} size - Size variant
 * @param {string} [label] - Optional accessibility label or visible text
 * @param {boolean} [showText=false] - Display visible text under spinner
 */
export default function WeddingSpinner({ size = 'md', label = 'Loading memories...', showText = false, className = '' }) {
  const sizeMap = {
    sm: { container: 'w-7 h-7', ring: 'w-7 h-7 border-[2.5px]', heart: 'w-3 h-3', text: 'text-[11px]' },
    md: { container: 'w-12 h-12', ring: 'w-12 h-12 border-3', heart: 'w-4 h-4', text: 'text-xs' },
    lg: { container: 'w-16 h-16', ring: 'w-16 h-16 border-[3.5px]', heart: 'w-6 h-6', text: 'text-sm' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className={`relative flex items-center justify-center ${currentSize.container}`}>
        {/* Background track ring */}
        <div
          className={`absolute inset-0 rounded-full border-[#D4AF37]/25 ${currentSize.ring}`}
        />
        
        {/* Spinning arc in deep burgundy and gold */}
        <div
          className={`absolute inset-0 rounded-full border-t-[#800020] border-r-[#D4AF37] border-b-transparent border-l-transparent animate-spin ${currentSize.ring}`}
          style={{ animationDuration: '0.9s' }}
        />

        {/* Center Heart Emblem */}
        <Heart
          className={`text-[#800020] fill-[#800020]/20 animate-pulse ${currentSize.heart}`}
          style={{ animationDuration: '1.8s' }}
        />
      </div>

      {showText && (
        <p className={`font-serif text-[#75675A] tracking-wider uppercase ${currentSize.text} animate-pulse`}>
          {label}
        </p>
      )}

      <span className="sr-only">{label}</span>
    </div>
  );
}
