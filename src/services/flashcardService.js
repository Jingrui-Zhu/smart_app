// src/services/flashcardService.js
import { db } from "../config/firebase.js";

export async function createFlashcardService(captureId, uid, description = null) {
    if (!captureId) throw new Error("createFlashcardService: captureId is required");
    if (!uid) throw new Error("createFlashcardService: uid is required");

    const fcId = `fc_${captureId}`;
    const flashcardRef = db.collection("users").doc(uid).collection("flashcards").doc(fcId);
    const existingSnap = await flashcardRef.get();
    // return the existing flashcard if already present
    if (existingSnap.exists) {
        return { createFlashcard_ok: false, ...existingSnap.data() };
    }

    const captureRef = db.collection("users").doc(uid).collection("captures").doc(captureId);
    const capSnap = await captureRef.get();
    if (!capSnap.exists) throw new Error("createFlashcardService: Capture not found - " + captureId);
    const captureData = capSnap.data();
    if (!captureData.wordId || !captureData.translatedWord) throw new Error("createFlashcardService: Capture not translated - " + captureId);

    const now = new Date().toISOString();
    const fcDoc = {
        fcId,
        captureId,
        wordId: captureData.wordId,
        originalWord: captureData.objectName,
        translatedWord: captureData.translatedWord,
        targetLang: captureData.targetLang,
        //pronunciation: captureData.pronunciation || "", // may be null if not present
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
