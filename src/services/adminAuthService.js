import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const SESSION_ADMIN_KEY = 'wedding_gallery_admin_session';
const SESSION_ADMIN_USER_KEY = 'wedding_gallery_admin_user';

// Known admin document IDs from Firestore
const KNOWN_ADMIN_DOC_IDS = [
  'wtxHvT7IRrX9pDX20bfX',
  'credentials',
  'admin',
  'settings'
];

/**
 * Authenticate admin by checking credentials directly against Firestore 'admin' collection.
 * Matches documents with fields: username and password.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ success: boolean, user: Object }>}
 */
export async function authenticateAdminWithUsername(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    throw new Error('Please enter both your username and password.');
  }

  if (!db) {
    throw new Error('Database is not initialized. Please verify your environment configuration.');
  }

  let firestorePermissionError = null;

  // 1. Try querying the 'admin' collection where username matches
  try {
    const adminCol = collection(db, 'admin');
    const q = query(adminCol, where('username', '==', cleanUsername));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      for (const docSnap of querySnap.docs) {
        const data = docSnap.data();
        const storedPass = data.password ?? data.pass ?? data.adminPassword;
        if (storedPass && String(storedPass).trim() === cleanPassword) {
          const adminUser = {
            uid: `admin_${cleanUsername.toLowerCase()}`,
            username: cleanUsername,
            displayName: data.displayName || 'Gallery Administrator',
            role: 'admin',
          };
          persistAdminSession(adminUser);
          return { success: true, user: adminUser };
        }
      }
      throw new Error('Incorrect password. Please verify and try again.');
    }
  } catch (err) {
    console.error('Firestore admin query error:', err);
    if (err.code === 'permission-denied' || String(err.message).includes('permission')) {
      firestorePermissionError = err.message;
    }
    // If the error was our own 'Incorrect password', rethrow
    if (err.message === 'Incorrect password. Please verify and try again.') {
      throw err;
    }
  }

  // 2. Try known document IDs (including wtxHvT7IRrX9pDX20bfX from Firebase Console)
  const docCandidates = [
    cleanUsername.toLowerCase(),
    cleanUsername,
    ...KNOWN_ADMIN_DOC_IDS
  ];

  for (const candidateId of docCandidates) {
    try {
      const directRef = doc(db, 'admin', candidateId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        const data = directSnap.data();
        const storedUser = data.username ?? data.user ?? data.adminUser ?? data.name ?? directSnap.id;
        const storedPass = data.password ?? data.pass ?? data.adminPassword;

        if (
          String(storedUser).trim().toLowerCase() === cleanUsername.toLowerCase() &&
          storedPass &&
          String(storedPass).trim() === cleanPassword
        ) {
          const adminUser = {
            uid: `admin_${cleanUsername.toLowerCase()}`,
            username: cleanUsername,
            displayName: data.displayName || 'Gallery Administrator',
            role: 'admin',
          };
          persistAdminSession(adminUser);
          return { success: true, user: adminUser };
        }
      }
    } catch (err) {
      if (err.code === 'permission-denied' || String(err.message).includes('permission')) {
        firestorePermissionError = err.message;
      }
    }
  }

  // 3. Scan all documents in 'admin' collection (case-insensitive username check)
  try {
    const adminCol = collection(db, 'admin');
    const snap = await getDocs(adminCol);
    if (!snap.empty) {
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const storedUser = data.username ?? data.user ?? data.adminUser ?? data.name ?? docSnap.id;
        const storedPass = data.password ?? data.pass ?? data.adminPassword;

        if (
          storedUser &&
          String(storedUser).trim().toLowerCase() === cleanUsername.toLowerCase() &&
          storedPass &&
          String(storedPass).trim() === cleanPassword
        ) {
          const adminUser = {
            uid: `admin_${cleanUsername.toLowerCase()}`,
            username: cleanUsername,
            displayName: data.displayName || 'Gallery Administrator',
            role: 'admin',
          };
          persistAdminSession(adminUser);
          return { success: true, user: adminUser };
        }
      }
    }
  } catch (colErr) {
    console.error('Firestore admin collection scan error:', colErr);
    if (colErr.code === 'permission-denied' || String(colErr.message).includes('permission')) {
      firestorePermissionError = colErr.message;
    }
  }

  // If Firestore blocked the read, inform the user clearly
  if (firestorePermissionError) {
    throw new Error(
      'Firestore permission denied. Please update your Firestore Rules in Firebase Console to allow read access.'
    );
  }

  throw new Error('Invalid administrator username or password.');
}

/**
 * Persist administrator session in sessionStorage
 */
export function persistAdminSession(user) {
  try {
    sessionStorage.setItem(SESSION_ADMIN_KEY, 'true');
    sessionStorage.setItem(SESSION_ADMIN_USER_KEY, JSON.stringify(user));
  } catch {}
}

/**
 * Check if the administrator is currently logged in this session
 */
export function getActiveAdminSession() {
  try {
    const isSession = sessionStorage.getItem(SESSION_ADMIN_KEY) === 'true';
    if (!isSession) return null;
    const userStr = sessionStorage.getItem(SESSION_ADMIN_USER_KEY);
    return userStr ? JSON.parse(userStr) : { username: 'admin', role: 'admin' };
  } catch {
    return null;
  }
}

/**
 * Clear the administrator session on logout
 */
export function clearAdminSession() {
  try {
    sessionStorage.removeItem(SESSION_ADMIN_KEY);
    sessionStorage.removeItem(SESSION_ADMIN_USER_KEY);
  } catch {}
}

/**
 * Update administrator password directly in Firestore
 * @param {string} username - Administrator username
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password to set
 */
export async function updateAdminPasswordInFirestore(username, currentPassword, newPassword) {
  const cleanUsername = String(username || '').trim();
  const cleanCurrentPass = String(currentPassword || '').trim();
  const cleanNewPass = String(newPassword || '').trim();

  if (!cleanCurrentPass) {
    throw new Error('Please enter your current password.');
  }

  if (!cleanNewPass || cleanNewPass.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  if (!db) {
    throw new Error('Database connection is not available.');
  }

  let targetDocRef = null;

  // 1. Check known doc IDs
  const docCandidates = [
    cleanUsername.toLowerCase(),
    cleanUsername,
    ...KNOWN_ADMIN_DOC_IDS
  ];

  for (const candidateId of docCandidates) {
    try {
      const dRef = doc(db, 'admin', candidateId);
      const snap = await getDoc(dRef);
      if (snap.exists()) {
        const data = snap.data();
        const storedUser = data.username ?? data.user ?? data.adminUser ?? data.name ?? snap.id;
        const storedPass = data.password ?? data.pass ?? data.adminPassword;

        if (String(storedUser).trim().toLowerCase() === cleanUsername.toLowerCase()) {
          if (String(storedPass).trim() !== cleanCurrentPass) {
            throw new Error('Current password does not match.');
          }
          targetDocRef = dRef;
          break;
        }
      }
    } catch (e) {
      if (e.message === 'Current password does not match.') throw e;
    }
  }

  // 2. Scan admin collection if not found by candidate ID
  if (!targetDocRef) {
    try {
      const snap = await getDocs(collection(db, 'admin'));
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const storedUser = data.username ?? data.user ?? data.adminUser ?? data.name ?? docSnap.id;
        const storedPass = data.password ?? data.pass ?? data.adminPassword;

        if (String(storedUser).trim().toLowerCase() === cleanUsername.toLowerCase()) {
          if (String(storedPass).trim() !== cleanCurrentPass) {
            throw new Error('Current password does not match.');
          }
          targetDocRef = docSnap.ref;
          break;
        }
      }
    } catch (e) {
      if (e.message === 'Current password does not match.') throw e;
      if (e.code === 'permission-denied') {
        throw new Error('Permission denied. Please verify your Firestore rules in Firebase Console.');
      }
    }
  }

  if (!targetDocRef) {
    throw new Error('Administrator account not found in database.');
  }

  // 3. Update password in Firestore
  try {
    await updateDoc(targetDocRef, {
      password: cleanNewPass,
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to update password in Firestore:', err);
    if (err.code === 'permission-denied') {
      throw new Error('Permission denied by Firestore rules. Please allow write on admin collection in Firebase Console.');
    }
    throw new Error(err.message || 'Failed to update administrator password.');
  }
}

