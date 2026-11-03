import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { KeyRound, Shield, Heart, AlertCircle, Loader2, Lock, ArrowRight, Clock } from 'lucide-react';
import { useGallerySettings } from '../context/GallerySettingsContext';
import siteConfig from '../config/siteConfig';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function AccessCodeScreen() {
  const { verifyCode } = useGallerySettings();
  const shouldReduceMotion = useReducedMotion();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  
  // Rate limiting / lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const inputRefs = useRef([]);
  const bgUrl = siteConfig.accessCodeBgImage;

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleDigitChange = (index, value) => {
    // Take only the last character entered
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return; // Only allow digits

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous input and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    const numbersOnly = pasted.replace(/\D/g, '').slice(0, 6);
    
    if (numbersOnly.length > 0) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < numbersOnly.length; i++) {
        newDigits[i] = numbersOnly[i];
      }
      setDigits(newDigits);
      setErrorMsg(null);

      // Focus the next empty or last input
      const nextIndex = Math.min(numbersOnly.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (lockoutTimer > 0) return;

    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the access code.');
      triggerShake();
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await verifyCode(fullCode);
      if (!res.success) {
        triggerShake();
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockoutTimer(LOCKOUT_SECONDS);
          setErrorMsg(`Too many invalid attempts. For security, please wait ${LOCKOUT_SECONDS} seconds.`);
        } else {
          setErrorMsg(res.message || 'Incorrect access code. Please try again.');
        }
        // Focus and select all
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      triggerShake();
      setErrorMsg(err.message || 'Verification failed. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0D0B09] overflow-hidden px-3 sm:px-4 py-6 sm:py-12 selection:bg-[#800020] selection:text-[#FFF9F0]">
      {/* Background Image with Warm Velvet Burgundy & Charcoal Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url("${bgUrl}")` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A0E0E]/90 via-[#140A0A]/85 to-[#0D0707]/95 backdrop-blur-[4px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 25, scale: shouldReduceMotion ? 1 : 0.98 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          x: isShaking ? [-12, 12, -8, 8, -4, 4, 0] : 0,
        }}
        transition={{ duration: shouldReduceMotion ? 0.2 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg z-10"
      >
        <div className="rounded-2xl sm:rounded-3xl bg-[#FFF9F0]/95 backdrop-blur-2xl border border-[#D4AF37]/40 p-5 sm:p-10 md:p-12 shadow-2xl shadow-black/60 text-center">
          
          {/* Header Monogram */}
          <div className="relative inline-flex items-center justify-center mb-5 sm:mb-6">
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full border-2 border-[#D4AF37] bg-[#F5E6CC]/50 flex items-center justify-center text-[#800020] shadow-md shadow-[#D4AF37]/30">
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.5]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#800020] text-[#FFF9F0] border border-[#D4AF37] flex items-center justify-center shadow-xs">
              <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
          </div>

          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.28em] text-[#800020] font-semibold mb-1.5 sm:mb-2">
            {siteConfig.eventTitle}
          </p>

          <h1 className="text-xl sm:text-3xl font-serif text-[#2B2118] tracking-wide font-normal mb-1.5 sm:mb-2">
            Private Gallery Access
          </h1>

          <p className="text-xs sm:text-sm text-[#75675A] font-light max-w-sm mx-auto mb-6 sm:mb-8 leading-relaxed">
            Enter your access code to view the memories.
          </p>

          {/* Error Banner */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#800020]/10 border border-[#800020]/30 text-xs text-[#800020] flex items-center justify-center gap-2 font-medium"
            >
              {lockoutTimer > 0 ? (
                <Clock className="w-4 h-4 shrink-0 animate-spin" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* 6-Digit Form */}
          <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-5 sm:space-y-7">
            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  disabled={lockoutTimer > 0 || submitting}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  aria-label={`Digit ${idx + 1}`}
                  className="w-9 h-12 xs:w-10 xs:h-13 sm:w-13 sm:h-16 text-center text-lg sm:text-2xl font-mono font-semibold rounded-xl sm:rounded-2xl bg-[#FFFDF9] border-2 border-[#D4AF37]/50 text-[#2B2118] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 focus:outline-none transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed selection:bg-transparent"
                />
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isComplete || submitting || lockoutTimer > 0}
              className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#800020] via-[#941A2D] to-[#800020] hover:from-[#941A2D] hover:to-[#A52A2A] text-[#FFF9F0] text-sm font-medium tracking-wide shadow-wedding-lg hover:shadow-burgundy-glow border border-[#D4AF37]/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#E8C878]" />
                  <span>Unlocking Gallery...</span>
                </>
              ) : lockoutTimer > 0 ? (
                <>
                  <Clock className="w-4 h-4 text-[#E8C878]" />
                  <span>Locked for {lockoutTimer}s</span>
                </>
              ) : (
                <>
                  <span>Enter Gallery</span>
                  <ArrowRight className="w-4 h-4 text-[#E8C878]" />
                </>
              )}
            </button>
          </form>

          {/* Footer & Admin Link */}
          <div className="mt-8 pt-6 border-t border-[#D4AF37]/20 flex items-center justify-between text-[11px] text-[#75675A]">
            <span className="flex items-center gap-1.5 font-light">
              <Heart className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
              Exclusive Album
            </span>

            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-[#75675A] hover:text-[#800020] font-medium transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
