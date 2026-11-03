import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Globe, 
  Eye, 
  EyeOff, 
  KeyRound, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  ArrowLeft,
  RefreshCw,
  Hash,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGallerySettings } from '../context/GallerySettingsContext';
import { getAdminAccessSettings } from '../services/accessService';
import siteConfig from '../config/siteConfig';

const adminBgUrl = siteConfig.adminBgImage;

export default function Admin() {
  const { 
    user, 
    isAdmin, 
    loginAdmin, 
    updateAdminPassword,
    logout, 
    authError, 
    clearAuthError,
  } = useAuth();

  const { 
    mode,
    isPublic, 
    updateAccessSettings, 
    settingsMetadata,
    validateSixDigitCode
  } = useGallerySettings();

  const shouldReduceMotion = useReducedMotion();

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Gallery access toggle & code state
  const [isTogglingAccess, setIsTogglingAccess] = useState(false);
  const [accessFeedback, setAccessFeedback] = useState(null);
  const [newAccessCode, setNewAccessCode] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState(null);

  // Current access code reveal state
  const [currentAccessCode, setCurrentAccessCode] = useState('');
  const [showCurrentCode, setShowCurrentCode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Load current access code from Firestore
  useEffect(() => {
    let isSubscribed = true;
    getAdminAccessSettings().then((settings) => {
      if (isSubscribed && settings?.accessCode) {
        setCurrentAccessCode(settings.accessCode);
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, [user, isAdmin]);

  const handleCopyCode = async () => {
    if (!currentAccessCode) return;
    try {
      await navigator.clipboard.writeText(currentAccessCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  // Change Admin Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // 1. If not authenticated as Admin, show Admin Login View
  if (!user || !isAdmin) {
    const handleAdminSubmit = async (e) => {
      e.preventDefault();
      clearAuthError();
      setIsLoggingIn(true);
      try {
        await loginAdmin(loginUsername, loginPassword);
      } catch (err) {
        console.warn('Admin login error:', err);
      } finally {
        setIsLoggingIn(false);
      }
    };

    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#0D0B09] overflow-hidden px-3 sm:px-4 py-6 sm:py-12 selection:bg-[#800020] selection:text-[#FFF9F0]">
        {/* Wedding-themed background image with elegant burgundy/charcoal overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url("${adminBgUrl}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#140A0A]/90 via-[#120808]/88 to-[#0B0505]/95 backdrop-blur-[3px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md z-10"
        >
          <div className="rounded-2xl sm:rounded-3xl bg-[#FFF9F0]/95 backdrop-blur-2xl border border-[#D4AF37]/40 p-5 sm:p-10 shadow-2xl shadow-black/60">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4AF37] bg-[#F5E6CC]/50 flex items-center justify-center text-[#800020] mb-3 sm:mb-4 shadow-md shadow-[#D4AF37]/30">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.5]" />
              </div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] sm:tracking-[0.25em] text-[#800020] font-semibold mb-1">
                {siteConfig.eventTitle}
              </p>
              <h1 className="text-xl sm:text-3xl font-serif text-[#2B2118] tracking-wide font-normal">
                Wedding Gallery Admin
              </h1>
              <p className="text-xs text-[#75675A] mt-1 font-light">
                Secure access controls & gallery management
              </p>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="mb-6 p-4 rounded-2xl bg-[#800020]/10 border border-[#800020]/30 text-xs text-[#800020] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                <p>{authError}</p>
              </div>
            )}

            {/* Admin Login Form */}
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#75675A] mb-1.5 uppercase tracking-wider">
                  Administrator Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#75675A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter admin username"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FFFDF9] border border-[#D4AF37]/40 text-[#2B2118] text-sm placeholder:text-[#75675A]/40 focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#75675A] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#75675A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#FFFDF9] border border-[#D4AF37]/40 text-[#2B2118] text-sm placeholder:text-[#75675A]/40 focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#75675A] hover:text-[#2B2118] p-1"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#800020] to-[#A52A2A] hover:from-[#A52A2A] hover:to-[#800020] text-[#FFF9F0] text-sm font-medium transition-all duration-200 shadow-burgundy-glow border border-[#D4AF37]/40 disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-[#E8C878]" />
                    <span>Sign In to Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div className="mt-8 pt-6 border-t border-[#D4AF37]/20 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-[#75675A] hover:text-[#800020] font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Wedding Gallery</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  const handleToggleMode = async (targetMode) => {
    setIsTogglingAccess(true);
    setAccessFeedback(null);
    try {
      await updateAccessSettings({ mode: targetMode });
      setAccessFeedback({
        type: 'success',
        message: targetMode === 'public'
          ? 'Gallery is now PUBLIC. All visitors can browse and download photographs freely without an access code.' 
          : 'Gallery is now PRIVATE. Visitors must enter the 6-digit access code to view photographs.',
      });
    } catch (err) {
      setAccessFeedback({
        type: 'error',
        message: err.message || 'Failed to update access mode.',
      });
    } finally {
      setIsTogglingAccess(false);
    }
  };

  // Generate random 6-digit code
  const handleRegenerateRandomCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setNewAccessCode(randomCode);
    setCodeFeedback(null);
  };

  // Save new access code
  const handleSaveAccessCode = async (e) => {
    e.preventDefault();
    setCodeFeedback(null);

    if (!validateSixDigitCode(newAccessCode)) {
      setCodeFeedback({
        type: 'error',
        message: 'The access code must be exactly 6 numeric digits (e.g. 123456).',
      });
      return;
    }

    setIsSavingCode(true);
    try {
      await updateAccessSettings({ mode: 'private', accessCode: newAccessCode });
      setCurrentAccessCode(newAccessCode);
      setCodeFeedback({
        type: 'success',
        message: '6-digit access code saved successfully.',
      });
      setNewAccessCode('');
    } catch (err) {
      setCodeFeedback({
        type: 'error',
        message: err.message || 'Failed to save access code.',
      });
    } finally {
      setIsSavingCode(false);
    }
  };

  // Change Admin Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateAdminPassword(newPassword, currentPassword);
      setPasswordFeedback({
        type: 'success',
        message: 'Administrator password updated successfully in Firestore.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err.message || 'Failed to update password.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#2B2118] selection:bg-[#800020] selection:text-[#FFF9F0] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#D4AF37]/25 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <div className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 rounded-full border-2 border-[#D4AF37] bg-[#F5E6CC]/40 flex items-center justify-center text-[#800020]">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-serif text-[#2B2118] font-medium flex items-center gap-1.5 truncate leading-tight">
                Wedding Admin
              </h1>
              <p className="text-[8px] sm:text-[10px] text-[#75675A] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-light truncate">
                Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium text-[#2B2118] bg-[#F5E6CC] hover:bg-[#E8D4B4] border border-[#D4AF37]/35 transition-colors"
            >
              <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#800020]" />
              <span className="hidden xs:inline">Gallery</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium text-[#75675A] hover:text-[#800020] bg-[#F5E6CC]/60 hover:bg-[#F5E6CC] border border-[#D4AF37]/30 transition-all"
            >
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8">
        
        {/* Status Notification Toast if present */}
        {accessFeedback && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm animate-fade-in ${
              accessFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              {accessFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{accessFeedback.message}</span>
            </div>
            <button
              onClick={() => setAccessFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 ml-4 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Gallery Access Mode Section */}
        <section className="rounded-3xl bg-white border border-[#D4AF37]/30 p-6 sm:p-8 shadow-wedding">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D4AF37]/20">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-5 h-5 text-[#800020]" />
                <h2 className="text-xl font-serif text-[#2B2118] font-normal">Gallery Access Mode</h2>
              </div>
              <p className="text-xs text-[#75675A]">
                Toggle between unrestricted public access and private 6-digit access-code protection.
              </p>
            </div>

            {/* Current Status Pill */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border ${
                  isPublic
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-[#800020]/10 text-[#800020] border-[#800020]/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isPublic ? 'bg-emerald-500 animate-pulse' : 'bg-[#800020]'}`} />
                {isPublic ? 'Public Mode (Unrestricted)' : 'Private Mode (Access Code Required)'}
              </span>
            </div>
          </div>

          {/* Toggle Options: Public & Private */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            
            {/* Private Mode Card */}
            <div
              onClick={() => !isTogglingAccess && handleToggleMode('private')}
              className={`p-6 rounded-2xl border cursor-pointer transition-all duration-200 relative ${
                !isPublic
                  ? 'bg-[#FFF9F0] border-[#800020] shadow-wedding ring-1 ring-[#800020]/40'
                  : 'bg-[#FAF0E1]/60 border-[#D4AF37]/20 hover:border-[#D4AF37] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl ${!isPublic ? 'bg-[#800020] text-[#FFF9F0]' : 'bg-[#F5E6CC] text-[#75675A]'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#2B2118]">Private Mode</h3>
                    <p className="text-xs text-[#75675A] mt-0.5">Protected with 6-digit access code</p>
                  </div>
                </div>
                {!isPublic && (
                  <CheckCircle2 className="w-5 h-5 text-[#800020]" />
                )}
              </div>
              <ul className="mt-4 text-xs text-[#75675A] space-y-1.5 border-t border-[#D4AF37]/20 pt-3">
                <li>• Visitors must enter a 6-digit access code</li>
                <li>• No visitor username or password accounts required</li>
              </ul>
            </div>

            {/* Public Mode Card */}
            <div
              onClick={() => !isTogglingAccess && handleToggleMode('public')}
              className={`p-6 rounded-2xl border cursor-pointer transition-all duration-200 relative ${
                isPublic
                  ? 'bg-[#FFF9F0] border-emerald-500 shadow-wedding ring-1 ring-emerald-500/40'
                  : 'bg-[#FAF0E1]/60 border-[#D4AF37]/20 hover:border-[#D4AF37] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl ${isPublic ? 'bg-emerald-600 text-white' : 'bg-[#F5E6CC] text-[#75675A]'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#2B2118]">Public Mode</h3>
                    <p className="text-xs text-[#75675A] mt-0.5">Open gallery for all friends & family</p>
                  </div>
                </div>
                {isPublic && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <ul className="mt-4 text-xs text-[#75675A] space-y-1.5 border-t border-[#D4AF37]/20 pt-3">
                <li>• Anyone with the wedding link can view and download photos</li>
                <li>• No login or access-code screen shown to visitors</li>
                <li>• Admin dashboard remains strictly password-protected</li>
              </ul>
            </div>

          </div>

          {/* Sync details */}
          <div className="mt-6 flex flex-wrap items-center justify-between text-[11px] text-[#75675A] pt-4 border-t border-[#D4AF37]/20">
            <span>
              Firestore Synchronization: Realtime updates apply instantly to all active browsers
            </span>
            {settingsMetadata.updatedAt && (
              <span>Last modified: {new Date(settingsMetadata.updatedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </section>

        {/* 2. Management Cards: Side-by-side in Private mode, Centered in Public mode */}
        <div className={!isPublic ? "grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch" : "max-w-md mx-auto"}>
          
          {/* Set New Access Code - Displayed only in Private Mode */}
          {!isPublic && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl bg-white border border-[#D4AF37]/30 p-6 sm:p-8 shadow-wedding flex flex-col items-center text-center justify-between"
            >
              <div className="w-full flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border border-[#D4AF37]/50 bg-[#F5E6CC]/40 flex items-center justify-center text-[#800020] mb-3">
                  <Hash className="w-6 h-6 stroke-[1.5]" />
                </div>

                <h3 className="text-xl font-serif text-[#2B2118] font-medium mb-1">
                  Set New Access Code
                </h3>
                <p className="text-xs text-[#75675A] mb-4">
                  Enter the 6-digit numeric code required by visitors when Private Mode is enabled.
                </p>

                {/* Current Active Access Code (Masked as ****** with reveal button) */}
                <div className="w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-[#FFFDF9] border border-[#D4AF37]/45 shadow-sm flex items-center justify-between gap-2.5 text-left">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#F5E6CC]/60 text-[#800020] border border-[#D4AF37]/35 shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-[#75675A] uppercase tracking-wider leading-tight">
                        Current Access Code
                      </p>
                      <p className="font-mono text-base sm:text-xl font-bold text-[#2B2118] tracking-[0.25em] leading-tight mt-0.5">
                        {showCurrentCode ? (currentAccessCode || '******') : '******'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {showCurrentCode && currentAccessCode && (
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1.5 sm:p-2 rounded-full text-[#75675A] hover:text-[#800020] hover:bg-[#F5E6CC]/60 border border-transparent hover:border-[#D4AF37]/30 transition-all"
                        title={isCopied ? "Copied to clipboard!" : "Copy code"}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCurrentCode(!showCurrentCode)}
                      className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium text-[#800020] hover:text-[#FFF9F0] bg-[#F5E6CC] hover:bg-[#800020] border border-[#D4AF37]/40 shadow-sm transition-all duration-200 active:scale-95"
                    >
                      {showCurrentCode ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Feedback toast for access code updates */}
                {codeFeedback && (
                  <div
                    className={`w-full mb-5 p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                      codeFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {codeFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{codeFeedback.message}</span>
                    </div>
                    <button onClick={() => setCodeFeedback(null)} className="opacity-60 hover:opacity-100 font-bold ml-3">✕</button>
                  </div>
                )}
              </div>

              <div className="w-full bg-[#FAF0E1]/50 p-6 rounded-2xl border border-[#D4AF37]/30 mt-4">
                <form onSubmit={handleSaveAccessCode} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-[#75675A] uppercase tracking-wider">
                        6-Digit Access Code
                      </label>
                      <button
                        type="button"
                        onClick={handleRegenerateRandomCode}
                        className="inline-flex items-center gap-1 text-[11px] text-[#800020] hover:text-[#A52A2A] font-medium transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Generate Random</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={newAccessCode}
                      onChange={(e) => setNewAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g. 123456"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#D4AF37]/50 text-[#2B2118] text-xl font-mono text-center tracking-[0.35em] font-semibold focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingCode || newAccessCode.length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#800020] hover:bg-[#A52A2A] text-[#FFF9F0] text-xs font-medium transition-all shadow-sm disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isSavingCode ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Saving Code to Firestore...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5 text-[#E8C878]" />
                        <span>Save New Access Code</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.section>
          )}

          {/* Change Admin Password - Side-by-side in Private mode, Centered in Public mode */}
          <section className="rounded-3xl bg-white border border-[#D4AF37]/30 p-6 sm:p-8 shadow-wedding flex flex-col items-center justify-between">
            <div className="w-full flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full border border-[#D4AF37]/50 bg-[#F5E6CC]/40 flex items-center justify-center text-[#800020] mb-3">
                <Lock className="w-6 h-6 stroke-[1.5]" />
              </div>

              <h3 className="text-xl font-serif text-[#2B2118] font-medium mb-1">
                Change Admin Password
              </h3>
              <p className="text-xs text-[#75675A] mb-6">
                Update the administrator password stored directly in your Firestore <code className="text-[#800020] font-mono">admin</code> collection.
              </p>

              {/* Feedback toast for password updates */}
              {passwordFeedback && (
                <div
                  className={`w-full mb-5 p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {passwordFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{passwordFeedback.message}</span>
                  </div>
                  <button onClick={() => setPasswordFeedback(null)} className="opacity-60 hover:opacity-100 font-bold ml-3">✕</button>
                </div>
              )}
            </div>

            <div className="w-full bg-[#FAF0E1]/50 p-6 rounded-2xl border border-[#D4AF37]/30 text-left mt-4">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#75675A] uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <input
                    type={showPasswordFields ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#D4AF37]/50 text-[#2B2118] text-xs focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#75675A] uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type={showPasswordFields ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#D4AF37]/50 text-[#2B2118] text-xs focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#75675A] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswordFields ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-[#D4AF37]/50 text-[#2B2118] text-xs focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    className="text-[11px] text-[#75675A] hover:text-[#2B2118] flex items-center gap-1.5 transition-colors"
                  >
                    {showPasswordFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPasswordFields ? 'Hide passwords' : 'Show passwords'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#800020] to-[#A52A2A] hover:from-[#A52A2A] hover:to-[#800020] text-[#FFF9F0] text-xs font-medium transition-all shadow-sm border border-[#D4AF37]/40 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5 text-[#E8C878]" />
                      <span>Save New Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#D4AF37]/20 py-8 text-center text-xs text-[#75675A] bg-[#F5E6CC]/30">
        <p className="font-serif text-sm text-[#2B2118] mb-1">
          {siteConfig.eventTitle}
        </p>
        <p>Administrator Control Panel</p>
      </footer>
    </div>
  );
}
