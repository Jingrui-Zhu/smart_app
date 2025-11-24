// src/controllers/authController.js
import * as authService from "../services/authService.js";

export const signup = async (req, res) => {
  try {
    const { email, password, name, avatarId } = req.body;
    const user = await authService.createUserService(email, password, name, avatarId);
    return res.json({ message: "User signup successful", ...user.user });
  } catch (err) {
    console.error("signup error", err.message || err);
    return res.json({ error: err.message || "Signup failed" });
  }
} // end signup

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginWithPasswordService(email, password);
    return res.json({ message: "Login successful", ...result });
  } catch (err) {
    console.error("login error", err && err.response ? err.response.data || err.message : err.message || err);
    return res.json({ error: err?.response?.data?.error?.message || err.message || "Authentication service unavailable" });
  }
} // end login

export const verify = async (req, res) => {
  try {
    const { idToken } = req.body;
    const decoded = await authService.verifyIdTokenService(idToken);
    return res.json({ message: "Verify successful", verify_ok: true, decoded });
  } catch (err) {
    console.error("verify error", err.message || err);
    return res.json({ error: err.message || "Invalid token" });
  }
} // end verify

export const resetPassword = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const { oldPassword, newPassword } = req.body;
    if (!uid) return res.json({ ok: false, error: "Unauthorized" });
    if (!oldPassword || !newPassword) return res.json({ ok: false, error: "oldPassword and newPassword are required" });
    const result = await authService.resetPasswordService(uid, oldPassword, newPassword);
    return res.json({ message: "Password reset successful", ...result });
  } catch (err) {
    console.error("changePassword error", err.message || err);
    return res.json({ error: err.message || "Failed to change password" });
  }
} // end changePassword

export const logout = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.json({ ok: false, error: "Unauthorized" });
    const result = await authService.logoutService(uid);
    return res.json({ message: "Logout successful", ...result });
  } catch (error) {
    console.error("logout error", error.message || error);
    return res.json({ error: error.message || "Logout failed" });
  }
}// end logout

export const getUserProfileHandler = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.json({ error: "Unauthorized" });
    const profile = await authService.getUserProfileService(uid);
    return res.json({ message: "User profile retrieved successfully", ...profile });
  } catch (error) {
    console.error("getUserProfileHandler error", error.message || error);
    return res.json({ error: error.message || "Failed to get user profile" });
  }
} // end getUserProfileHandler