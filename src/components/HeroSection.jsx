import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Heart, Sparkles } from 'lucide-react';
import siteConfig from '../config/siteConfig';

export default function HeroSection({ onScrollToGallery, photoCount = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  const heroImageUrl = siteConfig.heroBgImage;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.2,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.85,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <section className="relative w-full h-[85vh] sm:h-[90vh] min-h-[460px] sm:min-h-[580px] flex items-center justify-center overflow-hidden">
      {/* Background Image with eager loading (above the fold) */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImageUrl}
          alt={siteConfig.eventTitle}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-center transform scale-105 animate-[kenburns_24s_ease-out_infinite_alternate]"
        />
        
        {/* Cinematic Multi-Layer Gradient Overlay: Burgundy & Charcoal Tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2B2118]/70 via-[#800020]/40 to-[#2B2118]/85 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF9F0] via-transparent to-black/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(43,33,24,0.6)_100%)]" />
      </div>

      {/* Hero Content Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center justify-center pt-4 sm:pt-8 w-full"
      >
        {/* Subtle Gold Ornament / Monogram */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-[#D4AF37]/40 text-[#E8C878] text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] font-medium mb-4 sm:mb-6 shadow-gold-glow"
        >
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4AF37]" />
          <span>{siteConfig.eventBadge}</span>
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4AF37]" />
        </motion.div>

        {/* Wedding Title */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-serif text-white tracking-wide font-normal leading-tight drop-shadow-lg"
        >
          {siteConfig.coupleNames}
          <span className="block text-xl xs:text-2xl sm:text-4xl md:text-5xl italic font-serif text-[#E8C878] mt-1 font-light">
            {siteConfig.eventType}
          </span>
        </motion.h1>

        {/* Gold Filigree Line */}
        <motion.div
          variants={itemVariants}
          className="wedding-divider my-4 sm:my-6 text-[#D4AF37]"
        >
          <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#D4AF37] text-[#D4AF37]" />
        </motion.div>

        {/* Subtitle & Memory Badge */}
        <motion.p
          variants={itemVariants}
          className="text-xs sm:text-base md:text-lg text-white/90 font-light max-w-xl mx-auto leading-relaxed drop-shadow px-2"
        >
          {siteConfig.heroSubtitle}
        </motion.p>

        {/* Action Button & Memory Counter */}
        <motion.div
          variants={itemVariants}
          className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto"
        >
          <button
            onClick={onScrollToGallery}
            className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-[#800020] to-[#A52A2A] hover:from-[#A52A2A] hover:to-[#800020] text-[#FFF9F0] text-xs sm:text-sm font-medium tracking-wide shadow-burgundy-glow border border-[#D4AF37]/40 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span>Enter Photo Gallery</span>
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />
          </button>

          {photoCount > 0 && (
            <span className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/40 backdrop-blur-md text-[11px] sm:text-xs text-white/80 border border-white/10 font-mono">
              {photoCount} Preserved Photographs
            </span>
          )}
        </motion.div>
      </motion.div>

      {/* Floating Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        onClick={onScrollToGallery}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 cursor-pointer flex flex-col items-center gap-1 text-white/70 hover:text-[#D4AF37] transition-colors"
      >
        <span className="text-[10px] tracking-[0.25em] uppercase font-light">Scroll to View</span>
        <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
      </motion.div>
    </section>
  );
}
