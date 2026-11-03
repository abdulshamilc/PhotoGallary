import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Heart, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGallerySettings } from '../context/GallerySettingsContext';
import siteConfig from '../config/siteConfig';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { isPublic } = useGallerySettings();

  return (
    <header className="sticky top-0 z-40 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#D4AF37]/20 transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        
        {/* Brand / Monogram */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3.5 group min-w-0">
          <div className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 rounded-full border border-[#D4AF37] bg-[#F5E6CC]/50 flex items-center justify-center text-[#800020] shadow-sm shadow-[#D4AF37]/20 group-hover:scale-105 group-hover:border-[#800020] transition-all duration-300">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-[#800020]/20 text-[#800020]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl md:text-2xl font-serif tracking-wide text-[#2B2118] font-medium truncate leading-tight">
              {siteConfig.coupleNames}
            </h1>
            <p className="text-[8px] sm:text-[10px] md:text-xs text-[#75675A] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-light truncate">
              {isPublic ? 'Public Wedding Gallery' : 'Exclusive Private Gallery'}
            </p>
          </div>
        </Link>

        {/* Right side: Admin Access */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Admin Dashboard Controls */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link
                to="/admin"
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#800020]/10 hover:bg-[#800020]/20 text-[#800020] border border-[#800020]/30 text-[11px] sm:text-xs font-medium transition-colors"
                title="Open Admin Dashboard"
              >
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Admin</span>
              </Link>

              <button
                onClick={logout}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-[#F5E6CC]/70 hover:bg-[#800020] text-[#75675A] hover:text-[#FFF9F0] border border-[#D4AF37]/30 hover:border-[#800020] text-[11px] sm:text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
                title="Sign out of Administrator Session"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/admin"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#F5E6CC] hover:bg-[#E8D4B4] text-[11px] sm:text-xs text-[#2B2118] border border-[#D4AF37]/35 transition-colors font-medium"
              title="Admin Portal"
            >
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#800020]" />
              <span className="hidden xs:inline">Admin Portal</span>
              <span className="xs:hidden">Admin</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
