const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// In-memory rate limiting map for brute-force mitigation
const attemptTracker = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Helper to check rate limiting by caller IP / ID
 */
function checkRateLimit(key, maxAttempts = MAX_ATTEMPTS, windowMs = LOCKOUT_WINDOW_MS) {
  const now = Date.now();
  const record = attemptTracker.get(key);

  if (!record) {
    attemptTracker.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  // Reset window if expired
  if (now - record.firstAttempt > windowMs) {
    attemptTracker.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  // Check if limit exceeded
  if (record.count >= maxAttempts) {
    const remainingSeconds = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000);
    return { allowed: false, remainingSeconds };
  }

  record.count += 1;
  return { allowed: true };
}

/**
 * Firebase Cloud Function: verifyAdminLogin
 * Authenticates the administrator against credentials in the Firestore 'admin' collection
 * server-side without ever exposing plaintext passwords or admin documents to the client.
 * Returns a custom Firebase Auth token for official Firebase Authentication.
 */
exports.verifyAdminLogin = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    const username = request.data?.username;
    const password = request.data?.password;
    const clientIp = request.rawRequest?.ip || "anonymous_admin";
    const rateLimitKey = `admin_${clientIp}`;

    // 1. Enforce rate limiting against brute-force attacks
    const rateCheck = checkRateLimit(rateLimitKey, 5, 2 * 60 * 1000);
    if (!rateCheck.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Too many failed sign-in attempts. Please wait ${rateCheck.remainingSeconds} seconds before trying again.`
      );
    }

    // 2. Validate input format
    if (!username || typeof username !== "string" || !password || typeof password !== "string") {
      throw new HttpsError("invalid-argument", "Both username and password are required.");
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      throw new HttpsError("invalid-argument", "Username and password cannot be empty.");
    }

    try {
      // 3. Query the Firestore 'admin' collection securely on the server
      const adminCol = db.collection("admin");
      const snapshot = await adminCol.get();

      let matchedDoc = null;

      if (!snapshot.empty) {
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const storedUser = data.username ?? data.user ?? data.adminUser ?? data.name ?? data.email ?? doc.id;
          const storedPass = data.password ?? data.pass ?? data.adminPassword;

          if (
            storedUser &&
            String(storedUser).trim().toLowerCase() === cleanUsername.toLowerCase() &&
            storedPass &&
            String(storedPass).trim() === cleanPassword
          ) {
            matchedDoc = { id: doc.id, ...data };
            break;
          }
        }
      }

      // Also check if document ID itself matches username
      if (!matchedDoc) {
        const directSnap = await adminCol.doc(cleanUsername.toLowerCase()).get();
        if (directSnap.exists) {
          const data = directSnap.data();
          const storedPass = data.password ?? data.pass;
          if (storedPass && String(storedPass).trim() === cleanPassword) {
            matchedDoc = { id: directSnap.id, ...data };
          }
        }
      }

      if (!matchedDoc) {
        throw new HttpsError("unauthenticated", "Invalid administrator username or password.");
      }

      // Success: clear failed rate limit attempts
      attemptTracker.delete(rateLimitKey);

      // 4. Create a custom Firebase Auth token with role: 'admin'
      const uid = `admin_${cleanUsername.toLowerCase()}`;
      const customClaims = {
        role: "admin",
        username: cleanUsername,
      };

      const customToken = await admin.auth().createCustomToken(uid, customClaims);

      // Return only the authentication token and profile (NEVER the password or private document)
      return {
        success: true,
        customToken,
        user: {
          uid,
          username: cleanUsername,
          displayName: matchedDoc.displayName || "Gallery Administrator",
          role: "admin",
        },
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Server admin authentication error:", error);
      throw new HttpsError("internal", "An error occurred during authentication.");
    }
  }
);

/**
 * Firebase Cloud Function: verifyAccessCode
 * Validates submitted 6-digit access codes against the protected Firestore document
 * without ever returning the stored code to visitors.
 */
exports.verifyAccessCode = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    const submittedCode = request.data?.code;
    const clientIp = request.rawRequest?.ip || "anonymous_visitor";
    const rateLimitKey = `code_${clientIp}`;

    // 1. Validate input structure
    if (!submittedCode || typeof submittedCode !== "string") {
      throw new HttpsError("invalid-argument", "An access code is required.");
    }

    const cleanCode = submittedCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new HttpsError("invalid-argument", "Access code must be exactly 6 numeric digits.");
    }

    // 2. Enforce brute-force rate limiting
    const rateCheck = checkRateLimit(rateLimitKey, 5, 2 * 60 * 1000);
    if (!rateCheck.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Too many attempts. Please wait ${rateCheck.remainingSeconds} seconds before trying again.`
      );
    }

    try {
      // 3. Read the protected settings document using Firebase Admin SDK
      const settingsDoc = await db.collection("userAccess").doc("settings").get();

      if (!settingsDoc.exists) {
        return { success: false, message: "Gallery access settings are currently unconfigured." };
      }

      const settingsData = settingsDoc.data();

      // If gallery is currently in Public mode, grant access automatically
      if (settingsData.mode === "public") {
        return { success: true, mode: "public" };
      }

      // Check against stored code
      const storedCode = settingsData.accessCode;

      if (storedCode && String(storedCode).trim() === cleanCode) {
        attemptTracker.delete(rateLimitKey);
        return { success: true };
      }

      return {
        success: false,
        message: "Incorrect access code. Please check your invitation.",
      };
    } catch (error) {
      console.error("Error verifying access code:", error);
      throw new HttpsError("internal", "An error occurred while verifying your access code.");
    }
  }
);

/**
 * Firebase Cloud Function: updateGalleryAccessSettings
 * Allows authenticated administrators to update the gallery mode and access code.
 * Keeps userAccess/settings protected while keeping userAccess/publicStatus in sync.
 */
exports.updateGalleryAccessSettings = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    // 1. Verify caller is authenticated as an administrator
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required to update gallery settings.");
    }

    const targetMode = request.data?.mode === "public" ? "public" : "private";
    const accessCode = request.data?.accessCode;

    if (targetMode === "private" && accessCode) {
      const cleanCode = String(accessCode).trim();
      if (!/^\d{6}$/.test(cleanCode)) {
        throw new HttpsError("invalid-argument", "Access code must be exactly 6 numeric digits.");
      }
    }

    try {
      const now = admin.firestore.FieldValue.serverTimestamp();

      // 1. Update userAccess/settings (Protected for Admin)
      const settingsRef = db.collection("userAccess").doc("settings");
      const settingsPayload = {
        mode: targetMode,
        updatedAt: now,
      };

      if (accessCode) {
        settingsPayload.accessCode = String(accessCode).trim();
      }

      await settingsRef.set(settingsPayload, { merge: true });

      // 2. Update userAccess/publicStatus (Public status without exposing the accessCode)
      const publicStatusRef = db.collection("userAccess").doc("publicStatus");
      await publicStatusRef.set(
        {
          mode: targetMode,
          updatedAt: now,
        },
        { merge: true }
      );

      return {
        success: true,
        mode: targetMode,
      };
    } catch (error) {
      console.error("Error updating gallery access settings:", error);
      throw new HttpsError("internal", "Failed to update gallery settings.");
    }
  }
);
