// src/services/flashcardService.js
import { db } from "../config/firebase.js";

export async function createFlashcardService(imageId, uid, description = null) {
    if (!imageId) throw new Error("createFlashcardService: imageId is required");
    if (!uid) throw new Error("createFlashcardService: uid is required");

    const fcId = `fc_${imageId}`;
    const flashcardRef = db.collection("users").doc(uid).collection("flashcards").doc(fcId);
    const existingSnap = await flashcardRef.get();
    // return the existing flashcard if already present
    if (existingSnap.exists) {
        return { createFlashcard_ok: false, ...existingSnap.data() };
    }

    const imageRef = db.collection("users").doc(uid).collection("images").doc(imageId);
    const imgSnap = await imageRef.get();
    if (!imgSnap.exists) throw new Error("createFlashcardService: image not found - " + imageId);
    const imageData = imgSnap.data();
    if (!imageData.wordId || !imageData.translatedWord) throw new Error("createFlashcardService: image not translated - " + imageId);

    const now = new Date().toISOString();
    const fcDoc = {
        fcId,
        imageId,
        wordId: imageData.wordId,
        originalWord: imageData.objectName,
        translatedWord: imageData.translatedWord,
        targetLang: imageData.targetLang,
        //pronunciation: imageData.pronunciation || "", // may be null if not present
        createdBy: uid,
        createdAt: now,
        description: description || " "
    };
    console.log("Creating flashcard for: ", fcDoc.wordId, " - ", fcId);
    await flashcardRef.set(fcDoc);
    console.log("Flashcard inserted.");

    return { createFlashcard_ok: true, ...fcDoc };
}// end createFlashcardService

export async function getUserFlashcardsService(uid, fcId) {
    if (!uid) throw new Error("getUserFlashcardsService: uid required");
    if (!fcId) throw new Error("getUserFlashcardsService: fcId required");

    const flashcardRef = db.collection("users").doc(uid).collection("flashcards").doc(fcId);
    const snap = await flashcardRef.get();
    return { getFlashcard_ok: true, ...snap.data() };
}// end getUserFlashcardsService

export async function getAllUserFlashcardsService(uid){
    if (!uid) { throw new Error("getAllUserFlashcardsService: uid required"); }

    const snap = await db.collection("users").doc(uid).collection("flashcards").get();
    const items = snap.docs.map(d => ({ ...d.data() }));
    console.log("Retrieved all flashcards for user: ", uid, " - count: ", items.length);
    return { getAllFlashcards_ok: true, itemCount: items.length, ...items };
} // end getAllUserFlashcardsService

export async function deleteUserFlashcardService(uid, fcId) {
    if (!uid) { throw new Error("deleteUserFlashcardService: uid required"); }
    if (!fcId) { throw new Error("deleteUserFlashcardService: fcId required"); }

    await db.collection("users").doc(uid).collection("flashcards").doc(fcId).delete();
    console.log("Flashcard deleted: ", fcId);
    return { deleteFlashcard_ok: true, fcId };
}// end deleteUserFlashcardService
