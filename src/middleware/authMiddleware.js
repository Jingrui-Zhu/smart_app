import { verifyIdTokenService } from "../services/authService.js";
import { db } from "../config/firebase.js";

/**
 * Middleware to verify Firebase ID token.
 * Expects Authorization: Bearer <idToken>
 * Attaches: req.user = decodedToken
 *           req.profile = Firestore users/{uid} document (if exists)
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Authorization token missing" });
    }
    const idToken = authHeader.split(" ")[1].trim();
    // verifyIdToken should optionally check revocation - pass true if you implement that
    const decoded = await verifyIdTokenService(idToken /*, checkRevoked? true */);

    // attach decoded token
    req.user = decoded;

    // fetch Firestore profile (optional; do not fetch if you prefer lazy fetch in controllers)
    try {
      const snap = await db.collection("users").doc(decoded.uid).get();
      req.profile = snap.exists ? snap.data() : null;
    } catch (e) {
      // non-fatal: log and continue; controllers can still use req.user.uid
      console.error("Failed to load user profile:", e.message || e);
      req.profile = null;
    }

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err && err.message ? err.message : err);
    // If token was revoked verifyIdToken(..., true) throws with code 'auth/id-token-revoked' or similar.
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}