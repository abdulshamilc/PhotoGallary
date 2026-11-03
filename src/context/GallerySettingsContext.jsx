import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToGalleryAccess,
  isAccessCodeVerifiedInSession,
  setAccessCodeVerifiedInSession,
  clearAccessCodeSession,
  verifyGalleryAccessCode,
  saveAdminAccessSettings,
  getAdminAccessSettings,
  validateSixDigitCode,
  maskAccessCode
} from '../services/accessService';

const GallerySettingsContext = createContext(null);

export function GallerySettingsProvider({ children }) {
  const [mode, setMode] = useState('private'); // 'public' | 'private'
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isCodeVerified, setIsCodeVerified] = useState(() => isAccessCodeVerifiedInSession());
  const [settingsMetadata, setSettingsMetadata] = useState({
    updatedAt: null,
    isFallback: false,
  });

  // Track previous mode to detect transitions
  const prevModeRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToGalleryAccess((data) => {
      const newMode = data.mode === 'public' ? 'public' : 'private';
      
      // If mode switched from public to private, require the code again
      if (prevModeRef.current === 'public' && newMode === 'private') {
        clearAccessCodeSession();
        setIsCodeVerified(false);
      }
      
      // If mode switched from private to public, remove the access code requirement
      if (prevModeRef.current === 'private' && newMode === 'public') {
        // Public mode naturally grants full access
      }

      prevModeRef.current = newMode;
      setMode(newMode);
      setSettingsMetadata({
        updatedAt: data.updatedAt || null,
        isFallback: Boolean(data.isFallback),
      });
      setLoadingSettings(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Visitor: Verify submitted 6-digit access code
   */
  const verifyCode = useCallback(async (code) => {
    const result = await verifyGalleryAccessCode(code);
    if (result.success) {
      setIsCodeVerified(true);
    }
    return result;
  }, []);

  /**
   * Admin: Save gallery access settings (Mode and/or Access Code)
   */
  const updateAccessSettings = useCallback(async ({ mode: newMode, accessCode }) => {
    const result = await saveAdminAccessSettings({ mode: newMode, accessCode });
    if (newMode) {
      setMode(newMode);
    }
    return result;
  }, []);

  /**
   * Admin: Read settings including masked access code
   */
  const fetchAdminSettings = useCallback(async () => {
    return await getAdminAccessSettings();
  }, []);

  /**
   * Explicitly reset session verification
   */
  const resetVerification = useCallback(() => {
    clearAccessCodeSession();
    setIsCodeVerified(false);
  }, []);

  const isPublic = mode === 'public';
  // Accessible if either public mode is active, or visitor has verified code
  const isGalleryAccessible = isPublic || isCodeVerified;

  const value = {
    mode,
    isPublic,
    isCodeVerified,
    isGalleryAccessible,
    loadingSettings,
    settingsMetadata,
    verifyCode,
    updateAccessSettings,
    fetchAdminSettings,
    resetVerification,
    validateSixDigitCode,
    maskAccessCode,
  };

  return (
    <GallerySettingsContext.Provider value={value}>
      {children}
    </GallerySettingsContext.Provider>
  );
}

export function useGallerySettings() {
  const context = useContext(GallerySettingsContext);
  if (!context) {
    throw new Error('useGallerySettings must be used within a GallerySettingsProvider');
  }
  return context;
}
