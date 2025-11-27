// src/services/authService.js
import axios from "axios";
import { auth, db } from "../config/firebase.js";
import dotenv from "dotenv";
dotenv.config();

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
if (!FIREBASE_API_KEY) {
    console.warn("FIREBASE_API_KEY not set — login via REST exchange will fail");
}

// Create a new user with email and password
export async function createUserService(email, password, name, preferredLang, avatarId) {
    if (!email || !password) throw new Error("cretaUserService: email and password are required");
    if (!name || !avatarId || !preferredLang) throw new Error("createUserService: name, preferredLang and avatarId are required");

    // check if email already exists
    const userRef = db.collection("users").where("email", "==", email);
    const userSnap = await userRef.get();
    if (!userSnap.empty) throw new Error("User already exists");

    // use Firebase Auth to create the user including the necessary information
    let userRecord;
    try {
        userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });
    } catch (err) {
        throw new Error(`createUserService: Failed to create user in Auth: ${err.message}`);
    }

    // populate user profile in custom flow so that querying is easier, avoiding complexity in security rules
    const now = new Date().toISOString();
    const userDoc = {
        uid: userRecord.uid,
        displayName: name,
        email,
        preferredLang: preferredLang,
        avatarId: avatarId,
        createdAt: now,
        lastSeen: now,
        //nativeLang: nativeLang,
    };
    console.log("Creating user profile: " + email + " - " + name);

    try {
        await db.collection("users").doc(userRecord.uid).set(userDoc, { merge: true });
        console.log("User profile inserted.");
    } catch (err) {
        // If writing the profile fails, delete the created Auth user to avoid orphaned accounts
        try {
            await auth.deleteUser(userRecord.uid);
        } catch (delErr) {
            // If deletion fails, include that info in the thrown error but don't mask the original
            throw new Error(`Failed to write user profile and failed to rollback Auth user: ${err.message}; rollback error: ${delErr.message}`);
        }
        throw new Error(`Failed to write user profile: ${err.message}`);
    }

    // create a default favourite list at user creation
    const listId = `default_favourite_${userRecord.uid}`;
    const listDoc = {
        listId: listId,
        listName: "favorite",
        description: " ",
        preferedLang: userDoc.preferedLang,
        //listLanguage: [userDoc.nativeLang, userDoc.preferredTargetLang],
        isDefault: true,
        visibility: "private",
        createdAt: now,
        updatedAt: now,
        wordCount: 0
    };
    console.log("Creating user word list: ", listId);
    await db.collection("users").doc(userRecord.uid).collection("lists").doc(listId).set(listDoc);
    console.log("User word list inserted.");

    return { createUser_ok: true, user: { uid: userDoc.uid, ...userDoc } };
}// end createUserService

// user login with email and password
export async function loginWithPasswordService(email, password) {
    if (!email || !password) throw new Error("loginWithPasswordService: email and password required");

    // Use Firebase Auth REST API to sign in with email and password
    if (!FIREBASE_API_KEY) throw new Error("FIREBASE_API_KEY not configured — cannot sign in with email/password on server");

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    const resp = await axios.post(url, {
        email,
        password,
        returnSecureToken: true,
    });

    // resp.data contains idToken, refreshToken, expiresIn, localId (uid)
    const { idToken, refreshToken, expiresIn, localId } = resp.data;

    // Fetch the user profile from Firestore (if exists)
    const userDocRef = db.collection("users").doc(localId);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) throw new Error("loginWithPasswordService: User profile not found");
    const userData = userSnap.data();
    const userName = userData.displayName;
    const userEmail = userData.email;
    const userAvatarId = userData.avatarId;
    const userPreferredLang = userData.preferredLang;

    // update lastSeen
    await userDocRef.set({ lastSeen: new Date().toISOString() }, { merge: true });

    return { login_ok: true, userId: localId, userName, userEmail, userAvatarId, userPreferredLang, idToken, refreshToken, expiresIn };
}// end loginWithPasswordService

// verify ID token and return decoded token
export async function verifyIdTokenService(idToken) {
    if (!idToken) throw new Error("idToken required");
    const decoded = await auth.verifyIdToken(idToken);
    return decoded;
}// end verifyIdTokenService

export async function resetPasswordService(uid, oldPassword, newPassword) {
    if (!uid || !oldPassword || !newPassword) throw new Error("resetPasswordService: uid, oldPassword and newPassword are required");

    // Preliminary check to ensure user exists
    const userDocRef = db.collection("users").doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) throw new Error("User not found");

    const userData = userSnap.data();
    const email = userData.email;

    // Try to re-authenticate the user with the old password
    try {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
        const res = await axios.post(url, {
            email: email,
            password: oldPassword,
            returnSecureToken: true
        });
        // resp.data.localId should equal uid
        if (String(res.data.localId) !== String(uid)) throw new Error("resetPasswordService: Re-authentication failed: UID mismatch");
    } catch (err) {
        const message = err.response?.data?.error?.message || err.message;
        const e = new Error(message.includes("INVALID_PASSWORD") ? "Current password is incorrect" : "Failed to re-authenticate");
        throw e;
    }

    // Update the password
    const updateSuccess = await auth.updateUser(uid, { password: newPassword });
    if (!updateSuccess) {
        console.log("resetPasswordService: Failed to update password for user " + uid);
        throw new Error("resetPasswordService: Failed to update password");
    }
    // Revoke refresh tokens so existing sessions are invalid
    await auth.revokeRefreshTokens(uid);
    // verifyIdToken should fail after revocation
    const revoke = await auth.verifyIdToken(uid, true).then(() => false).catch(() => true);
    if (revoke) {
        console.log(`resetPasswordService: Successfully logged out user ${uid}`);
        return { resetPassword_ok: true, userId: uid, email: email };
    } else {
        console.log("resetPasswordService: Password update successful, but Failed to revoke tokens for user " + uid);
        throw new Error("resetPasswordService: Password update successful, but Failed to revoke tokens");
    }
}// end resetPasswordService

export async function logoutService(uid) {
    if (!uid) throw new Error("logoutService: uid required");

    await auth.revokeRefreshTokens(uid);
    // verifyIdToken should fail after revocation
    const revoke = await auth.verifyIdToken(uid, true).then(() => false).catch(() => true);
    if (revoke) {
        console.log(`logoutService: Successfully logged out user ${uid}`);
        return { logout_ok: true, revoke };
    } else {
        console.log("logoutService: Failed to revoke tokens for user " + uid);
        throw new Error("logoutService: Failed to revoke tokens");
    }
} // end logoutService

export async function getUserProfileService(uid) {
    if (!uid) throw new Error("getUserProfileService: uid required");

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("getUserProfileService: User not found");

    const userData = userSnap.data();
    const userName = userData.displayName;
    const userEmail = userData.email;
    const userAvatarId = userData.avatarId;
    const userPreferredLang = userData.preferredLang;

    const listRef = userRef.collection("lists");
    const listSnap = await listRef.get();
    const listCount = listSnap.size;

    const imageRef = userRef.collection("images");
    const imageSnap = await imageRef.get();
    const imageCount = imageSnap.size;

    return { getUserProfile_ok: true, userName, userEmail, userAvatarId, userPreferredLang, listCount, imageCount };
} // end getUserProfileService

export async function updateUserProfileService(uid, displayName = null, preferredLang = null, avatarId = 0) {
    if (!uid) throw new Error("updateUserProfileService: uid required");

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("updateUserProfileService: User not found");

    const updates = {};
    if (displayName !== null) updates.displayName = displayName;
    if (preferredLang !== null) updates.preferredLang = preferredLang;
    if (avatarId && (avatarId >= 1 && avatarId <= 8)) updates.avatarId = avatarId;

    if (Object.keys(updates).length === 0) {
        return { updateUserProfileService_ok: false, message: "updateUserProfileService: No valid fields to update" };
    }

    await userRef.set(updates, { merge: true });
    console.log("User profile updated for uid: " + uid);   
    return { updateUserProfile_ok: true, uid, updates }; 
} // end updateUserProfileService