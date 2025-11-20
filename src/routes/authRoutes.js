// src/routes/authRoutes.js
import express from "express";
import * as authService from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// signup - /POST /auth/signup
router.post("/signup", authService.signup);
// login - /POST /auth/login
router.post("/login", authService.login);
// verify token - /POST /auth/verify
router.post("/verify", authService.verify);
// reset password requiring authentication - /POST /auth/resetPassword
router.post("/resetPassword", requireAuth, authService.resetPassword);
// logout - /POST /auth/logout
router.post("/logout", requireAuth, authService.logout);

// get user profile - /GET /auth/profile
router.get("/profile", requireAuth, authService.getUserProfileHandler);


export default router;
