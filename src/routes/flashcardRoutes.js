// src/routes/flashcardRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import * as flashcardService from "../controllers/flashcardController.js";

const router = express.Router();

// Create a flashcard from a image (owner-only) - POST /flashcards
router.post("/", requireAuth, flashcardService.createFlashcardHandler);

// List user's flashcards - GET /flashcards/fcId
router.get("/:fcId", requireAuth, flashcardService.getUserFlashcardsHandler);
// List all user's flashcards - GET /flashcards
router.get("/", requireAuth, flashcardService.getAllUserFlashcardsHandler);

// Delete a user's flashcard - DELETE /flashcards/:fcId
router.delete("/:fcId", requireAuth, flashcardService.deleteUserFlashcardHandler);

export default router;
