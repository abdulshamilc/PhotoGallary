import React, { createContext, useContext, useState } from 'react';
import { isFirebaseConfigured } from '../services/firebase';
import {
  authenticateAdminWithUsername,
  getActiveAdminSession,
  clearAdminSession,
  updateAdminPasswordInFirestore,
} from '../services/adminAuthService';

const AuthContext = createContext(null);

const SESSION_TOKEN_KEY = 'wedding_gallery_oauth_token';
const SESSION_ADMIN_KEY = 'wedding_gallery_admin_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Rehydrate admin session from sessionStorage on page load
    return getActiveAdminSession() || null;
  });

  const [accessToken, setAccessToken] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Admin detection — role field set by adminAuthService
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    (user?.uid && user.uid.startsWith('admin_'))
  );

  /**
   * Admin Login with Username & Password
   * Credentials are verified directly against Firestore 'admin' collection.
   */
  const loginAdmin = async (username, password) => {
    setAuthError(null);
    try {
      setLoading(true);
      const res = await authenticateAdminWithUsername(username, password);
      setUser(res.user);
      return res.user;
    } catch (err) {
      const errorMsg = err.message || 'Invalid administrator username or password.';
      setAuthError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out — clear all session data
   */
  const logout = () => {
    clearAdminSession();
    setUser(null);
    setAccessToken(null);
    setAuthError(null);
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_ADMIN_KEY);
    } catch {}
  };

  /**
   * Update admin password in Firestore
   */
  const updateAdminPassword = async (newPassword, currentPassword) => {
    const adminUsername = user?.username || 'admin';
    return await updateAdminPasswordInFirestore(adminUsername, currentPassword, newPassword);
  };

  const clearAuthError = () => setAuthError(null);

  const value = {
    user,
    accessToken,
    loading,
    authError,
    isAdmin,
    isFirebaseConfigured,
    loginAdmin,
    updateAdminPassword,
    logout,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
