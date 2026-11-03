import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC_PATH = ['settings', 'gallery'];
const LOCAL_STORAGE_FALLBACK_KEY = 'wedding_gallery_access_public';

/**
 * Subscribe to real-time changes to the gallery access mode (Public vs Private)
 * @param {Function} callback - Called with { isPublic: boolean, updatedAt: string, updatedBy: string }
 * @returns {Function} Unsubscribe function
 */
export function subscribeToGallerySettings(callback) {
  if (!db) {
    // If Firestore is not configured or in demo mode, use local storage fallback
    const isPublic = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) === 'true';
    callback({ isPublic, isFallback: true });
    
    // Listen to local storage events for cross-tab updates during fallback mode
    const storageHandler = (e) => {
      if (e.key === LOCAL_STORAGE_FALLBACK_KEY) {
        callback({ isPublic: e.newValue === 'true', isFallback: true });
      }
    };
    window.addEventListener('storage', storageHandler);
    return () => window.removeEventListener('storage', storageHandler);
  }

  const docRef = doc(db, ...SETTINGS_DOC_PATH);

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          isPublic: Boolean(data.isPublic),
          updatedAt: data.updatedAt || null,
          updatedBy: data.updatedBy || null,
          isFallback: false,
        });
      } else {
        // Document does not exist yet; default to Private mode
        callback({
          isPublic: false,
          isFallback: false,
        });
      }
    },
    (error) => {
      console.warn('Firestore settings subscription error (using fallback):', error);
      const isPublic = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) === 'true';
      callback({ isPublic, isFallback: true, error: error.message });
    }
  );

  return unsubscribe;
}

/**
 * Update the gallery access setting (Public vs Private) in Firestore
 * @param {boolean} isPublic
 * @param {string} adminEmail
 */
export async function updateGalleryAccessMode(isPublic, adminEmail = 'admin') {
  // Update local fallback as well
  try {
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, isPublic ? 'true' : 'false');
  } catch {}

  if (!db) {
    return { isPublic, isFallback: true };
  }

  const docRef = doc(db, ...SETTINGS_DOC_PATH);
  await setDoc(
    docRef,
    {
      isPublic: Boolean(isPublic),
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
    },
    { merge: true }
  );

  return { isPublic, isFallback: false };
}
