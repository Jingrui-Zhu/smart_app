// src/routes/translationRoutes.js
import express from "express";
import { translateText } from "../controllers/translationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Translate a given text
// POST /translate
router.post("/", requireAuth, translateText);

export default router;