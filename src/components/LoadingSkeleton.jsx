import React from 'react';

export default function LoadingSkeleton({ count = 12 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="photo-grid">
      {items.map((idx) => (
        <div
          key={idx}
          className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F5E6CC]/40 border border-[#D4AF37]/20 shadow-wedding animate-pulse"
        >
          {/* Subtle gold shimmer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#FFF9F0]/60 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="h-4 w-28 bg-[#D4AF37]/20 rounded-md" />
            <div className="h-8 w-8 rounded-full bg-[#D4AF37]/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
