// src/controllers/flashcardController.js
import * as flashcardService from "../services/flashcardService.js";

export const createFlashcardHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { captureId, description } = req.body;
        const result = await flashcardService.createFlashcardService(captureId, uid, description);
        if (!result.createFlashcard_ok) {
            return res.json({ ok: true, message: "Flashcard already exists", flashcard: result });
        }
        return res.json({ ok: true, message: "Flashcard created", flashcard: result });
    } catch (err) {
        console.error("createFlashcard controller error:", err);
        return res.json({ error: err.message || "Failed to create flashcard" });
    }
} // end createFlashcardHandler

export const getUserFlashcardsHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { fcId } = req.params;
        const items = await flashcardService.getUserFlashcardsService(uid, fcId);
        return res.json({ message: "User flashcards retrieved", ...items });
    } catch (err) {
        console.error("listUserFlashcards error:", err);
        return res.json({ error: err.message || "Failed to list flashcards" });
    }
} // end getUserFlashcardsHandler

export const getAllUserFlashcardsHandler = async(req, res) =>{
    try {
        const uid = req.user?.uid;
        const items = await flashcardService.getAllUserFlashcardsService(uid);
        return res.json({ message: "All user flashcards retrieved", ...items });
    } catch (err) {
        console.error("getAllUserFlashcards error:", err);
        return res.json({ error: err.message || "Failed to get all flashcards" });
    }
}// end getAllUserFlashcardsHandler

export const deleteUserFlashcardHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { fcId } = req.params;
        const deleted = await flashcardService.deleteUserFlashcardService(uid, fcId);
        return res.json({ message: "Flashcard deleted", ...deleted });
    } catch (err) {
        console.error("deleteUserFlashcard controller error:", err);
        return res.json({ error: err.message || "Failed to delete flashcard" });
    }
} // end deleteUserFlashcardHandler