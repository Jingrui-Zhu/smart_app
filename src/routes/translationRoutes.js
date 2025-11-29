/*
Routes for translation-related endpoints
testing purposes only
*/

// src/routes/translationRoutes.js
import express from "express";
import { translateText } from "../controllers/translationController.js";
//import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Translate a given text
// POST /api/translation
router.post("/", translateText);

export default router;
