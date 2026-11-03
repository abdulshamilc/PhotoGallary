import { collection, doc, getDoc, getDocs, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const USER_ACCESS_COLLECTION = 'userAccess';

// Known userAccess document IDs
const KNOWN_USER_ACCESS_DOC_IDS = [
  'ABiDXegp9X6lVzzcIQUX',
  'settings',
  'publicStatus',
];

let cachedUserAccessDocId = 'ABiDXegp9X6lVzzcIQUX';

const SESSION_CODE_VERIFIED_KEY = 'wedding_gallery_code_verified';

/**
 * Check if the access code has been verified for the current browser session
 */
export function isAccessCodeVerifiedInSession() {
  try {
    return sessionStorage.getItem(SESSION_CODE_VERIFIED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark the current browser session as verified
 */
export function setAccessCodeVerifiedInSession(verified = true) {
  try {
    if (verified) {
      sessionStorage.setItem(SESSION_CODE_VERIFIED_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_CODE_VERIFIED_KEY);
    }
  } catch {}
}

/**
 * Clear the session verification
 */
export function clearAccessCodeSession() {
  try {
    sessionStorage.removeItem(SESSION_CODE_VERIFIED_KEY);
  } catch {}
}

/**
 * Mask access code for display in Admin Dashboard (e.g., '••••••')
 */
export function maskAccessCode(code) {
  if (!code) return '••••••';
  return '••••••';
}

/**
 * Validate that an access code consists of exactly 6 numeric digits
 */
export function validateSixDigitCode(code) {
  return /^\d{6}$/.test(String(code || '').trim());
}

/**
 * Subscribe in real-time to gallery access status ('public' | 'private')
 * Listens to the entire 'userAccess' collection so any document ID (like ABiDXegp9X6lVzzcIQUX) is supported.
 * @param {Function} callback - ({ mode: 'public' | 'private', updatedAt: string }) => void
 * @returns {Function} Unsubscribe function
 */
export function subscribeToGalleryAccess(callback) {
  if (!db) {
    callback({ mode: 'private' });
    return () => {};
  }

  try {
    const colRef = collection(db, USER_ACCESS_COLLECTION);

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          // Take the first available document
          const docSnap = snapshot.docs[0];
          cachedUserAccessDocId = docSnap.id;
          const data = docSnap.data();

          callback({
            mode: data.mode === 'public' ? 'public' : 'private',
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
          });
        } else {
          callback({ mode: 'private' });
        }
      },
      (err) => {
        console.warn('Realtime gallery access subscription notice:', err.message);
        // Fallback: try individual known document
        getDoc(doc(db, USER_ACCESS_COLLECTION, cachedUserAccessDocId))
          .then((snap) => {
            if (snap.exists()) {
              const data = snap.data();
              callback({
                mode: data.mode === 'public' ? 'public' : 'private',
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
              });
            } else {
              callback({ mode: 'private' });
            }
          })
          .catch(() => {
            callback({ mode: 'private' });
          });
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Subscribe error:', err.message);
    callback({ mode: 'private' });
    return () => {};
  }
}

/**
 * Admin: Retrieve the current userAccess document from Firestore
 */
export async function getAdminAccessSettings() {
  if (!db) {
    return { mode: 'private', accessCode: '', isConfigured: false };
  }

  try {
    // 1. Try querying the userAccess collection
    const snap = await getDocs(collection(db, USER_ACCESS_COLLECTION));
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      cachedUserAccessDocId = docSnap.id;
      const data = docSnap.data();
      return {
        mode: data.mode === 'public' ? 'public' : 'private',
        accessCode: data.accessCode || '',
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
        isConfigured: Boolean(data.accessCode),
      };
    }

    // 2. Try known document IDs
    for (const docId of KNOWN_USER_ACCESS_DOC_IDS) {
      const docRef = doc(db, USER_ACCESS_COLLECTION, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        cachedUserAccessDocId = docId;
        const data = docSnap.data();
        return {
          mode: data.mode === 'public' ? 'public' : 'private',
          accessCode: data.accessCode || '',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
          isConfigured: Boolean(data.accessCode),
        };
      }
    }
  } catch (err) {
    console.warn('Admin settings fetch notice:', err.message);
  }

  return { mode: 'private', accessCode: '', isConfigured: false };
}

/**
 * Admin: Save gallery access settings to Firestore
 * @param {Object} params
 * @param {'public'|'private'} params.mode
 * @param {string} [params.accessCode]
 */
export async function saveAdminAccessSettings({ mode, accessCode }) {
  const cleanMode = mode === 'public' ? 'public' : 'private';

  if (cleanMode === 'private' && accessCode) {
    if (!validateSixDigitCode(accessCode)) {
      throw new Error('Access code must be exactly 6 numeric digits (0-9).');
    }
  }

  if (!db) {
    throw new Error('Database connection is not available.');
  }

  try {
    const now = serverTimestamp();
    const docIdToUpdate = cachedUserAccessDocId || 'ABiDXegp9X6lVzzcIQUX';
    const settingsDocRef = doc(db, USER_ACCESS_COLLECTION, docIdToUpdate);

    const settingsData = { mode: cleanMode, updatedAt: now };
    if (accessCode) {
      settingsData.accessCode = String(accessCode).trim();
    }

    await setDoc(settingsDocRef, settingsData, { merge: true });

    return { success: true, mode: cleanMode };
  } catch (err) {
    console.error('Failed to save gallery settings:', err);
    throw err;
  }
}

/**
 * Verify a 6-digit access code submitted by a visitor.
 * Checks the stored accessCode in Firestore userAccess collection.
 * @param {string} submittedCode
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function verifyGalleryAccessCode(submittedCode) {
  const cleanCode = String(submittedCode || '').trim();

  if (!validateSixDigitCode(cleanCode)) {
    return { success: false, message: 'Please enter a valid 6-digit numeric access code.' };
  }

  if (db) {
    try {
      // 1. Check known doc ID first
      const docCandidateIds = [cachedUserAccessDocId, ...KNOWN_USER_ACCESS_DOC_IDS];
      for (const docId of docCandidateIds) {
        try {
          const snap = await getDoc(doc(db, USER_ACCESS_COLLECTION, docId));
          if (snap.exists()) {
            const data = snap.data();
            if (data.mode === 'public' || (data.accessCode && String(data.accessCode).trim() === cleanCode)) {
              setAccessCodeVerifiedInSession(true);
              return { success: true };
            }
          }
        } catch {}
      }

      // 2. Check all docs in collection
      const snap = await getDocs(collection(db, USER_ACCESS_COLLECTION));
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (data.mode === 'public' || (data.accessCode && String(data.accessCode).trim() === cleanCode)) {
            setAccessCodeVerifiedInSession(true);
            return { success: true };
          }
        }
        return { success: false, message: 'Incorrect access code. Please check your invitation.' };
      }
    } catch (dbErr) {
      console.warn('Firestore settings access notice:', dbErr.message);
      if (dbErr.code === 'permission-denied') {
        return {
          success: false,
          message: 'Database permission denied. Please verify Firestore rules in Firebase Console.',
        };
      }
    }
  }

  return { success: false, message: 'Unable to verify access code. Please try again.' };
}
