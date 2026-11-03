import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Heart, ShieldAlert, Sparkles, Loader2, ArrowRight, Mail, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGallerySettings } from '../context/GallerySettingsContext';
import siteConfig from '../config/siteConfig';

export default function Login() {
  const { user, loginWithGoogle, loginWithEmailPassword, loginDemoGuest, authError, clearAuthError, isFirebaseConfigured } = useAuth();
  const { isPublic, loadingSettings } = useGallerySettings();
  const shouldReduceMotion = useReducedMotion();

  const [authMethod, setAuthMethod] = useState('google'); // 'google' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If gallery is public, no login required - redirect straight to gallery
  if (!loadingSettings && isPublic) {
    return <Navigate to="/" replace />;
  }

  // If already authenticated, redirect to gallery
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    try {
      clearAuthError();
      setSubmitting(true);
      await loginWithGoogle();
    } catch (err) {
      console.warn('Sign in aborted or encountered an issue:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    try {
      clearAuthError();
      setSubmitting(true);
      await loginWithEmailPassword(email, password);
    } catch (err) {
      console.warn('Email sign in issue:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FFF9F0] overflow-hidden px-4 py-12 selection:bg-[#800020] selection:text-[#FFF9F0]">
      {/* Ambient Warm Champagne & Burgundy Background Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#F5E6CC] rounded-full blur-[140px] pointer-events-none opacity-80" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[#800020]/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Login Card with Framer Motion */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg z-10"
      >
        <div className="rounded-3xl bg-[#FFFFFF]/90 backdrop-blur-2xl border border-[#D4AF37]/35 p-8 sm:p-12 shadow-wedding-lg text-center">
          
          {/* Wedding Monogram */}
          <div className="mx-auto w-16 h-16 rounded-full border-2 border-[#D4AF37] bg-[#F5E6CC]/40 flex items-center justify-center text-[#800020] mb-6 shadow-sm shadow-[#D4AF37]/30 group transition-all duration-300 hover:scale-105">
            <Heart className="w-8 h-8 fill-[#800020]/20 text-[#800020] stroke-[1.5]" />
          </div>

          {/* Couple Subheading & Title */}
          <p className="text-xs uppercase tracking-[0.25em] text-[#800020] font-semibold mb-1.5">
            {siteConfig.eventTitle}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif text-[#2B2118] tracking-wide mb-2 font-normal">
            Every Moment, Forever
          </h1>
          <p className="text-sm text-[#75675A] font-light tracking-wide mb-8">
            Your memories, beautifully preserved.
          </p>

          {/* Error Message */}
          {authError && (
            <div className="mb-6 p-4 rounded-2xl bg-[#800020]/10 border border-[#800020]/30 text-left flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#800020] shrink-0 mt-0.5" />
              <div className="text-xs text-[#2B2118] leading-relaxed">
                <p className="font-semibold text-[#800020] mb-0.5">Authentication Notice</p>
                <p>{authError}</p>
              </div>
            </div>
          )}

          {/* Auth Method Selector */}
          <div className="flex rounded-2xl bg-[#F5E6CC]/60 p-1 border border-[#D4AF37]/30 mb-6">
            <button
              type="button"
              onClick={() => { setAuthMethod('google'); clearAuthError(); }}
              className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                authMethod === 'google'
                  ? 'bg-white text-[#2B2118] shadow-sm font-semibold'
                  : 'text-[#75675A] hover:text-[#2B2118]'
              }`}
            >
              Google Sign-In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('password'); clearAuthError(); }}
              className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 ${
                authMethod === 'password'
                  ? 'bg-white text-[#2B2118] shadow-sm font-semibold'
                  : 'text-[#75675A] hover:text-[#2B2118]'
              }`}
            >
              Email & Password
            </button>
          </div>

          {/* Method 1: Google Sign-in */}
          {authMethod === 'google' && (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3.5 px-6 py-4 rounded-2xl bg-white hover:bg-neutral-50 text-[#2B2118] font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:pointer-events-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#800020]" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {(!isFirebaseConfigured || import.meta.env.DEV) && (
                <button
                  type="button"
                  onClick={loginDemoGuest}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#F5E6CC]/70 hover:bg-[#F5E6CC] text-xs text-[#2B2118] border border-[#D4AF37]/40 transition-all duration-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#800020]" />
                  <span>Explore Preview Gallery (Demo Guest)</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-70" />
                </button>
              )}
            </div>
          )}

          {/* Method 2: Email & Password */}
          {authMethod === 'password' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-[#75675A] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#75675A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FFF9F0] border border-[#D4AF37]/40 text-[#2B2118] text-sm placeholder:text-[#75675A]/40 focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#75675A] mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#75675A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FFF9F0] border border-[#D4AF37]/40 text-[#2B2118] text-sm placeholder:text-[#75675A]/40 focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#800020] to-[#A52A2A] hover:from-[#A52A2A] hover:to-[#800020] text-[#FFF9F0] text-sm font-medium transition-all duration-200 shadow-burgundy-glow border border-[#D4AF37]/40 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Access Gallery</span>
                )}
              </button>
            </form>
          )}

          {/* Privacy & Admin Link Notice */}
          <div className="mt-8 pt-6 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#75675A]">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#800020]" />
              <span>Private Gallery · Invited Guests Only</span>
            </div>

            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-[11px] text-[#75675A] hover:text-[#800020] font-medium transition-colors"
            >
              <Shield className="w-3 h-3 text-[#D4AF37]" />
              <span>Admin Portal</span>
            </Link>
          </div>

        </div>

        {/* Decorative Quote */}
        <p className="mt-6 text-center text-xs text-[#75675A]/70 tracking-[0.2em] uppercase font-light">
          {siteConfig.loginQuote}
        </p>
      </motion.div>
    </div>
  );
}
