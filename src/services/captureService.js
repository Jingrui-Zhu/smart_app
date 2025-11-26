// src/services/captureService.js
import { db } from "../config/firebase.js";
import * as translationService from "./translationService.js";

// Helper: convert Buffer -> base64
function bufferToBase64(buf) {
    return buf.toString("base64");
}

// store partial capture info, capture metadata only
export async function createCaptureService(uid, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = 0, objectName, accuracy = null, targetLang) {
    if (!objectName) throw new Error("createCaptureService: objectName is required");
    if (!uid) throw new Error("createCaptureService: uid is required");
    if (!targetLang) throw new Error("createCaptureService: targetLang is required");

    // preliminary check to ensure user exists
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("createCaptureService: User not found");

    // If buffer provided, convert to base64
    let base64 = imageBase64;
    let mime = imageMimeType;
    let size = imageSizeBytes;

    if (fileBuffer) {
        base64 = bufferToBase64(fileBuffer);
        // caller should provide mime + size via req.file; but if not, leave mime null
        size = fileBuffer.length;
    }

    objectName = objectName.toLowerCase();
    const captureId = `cap_${objectName}_${targetLang}_${uid}`;
    const captureRef = userRef.collection("captures").doc(captureId);
    const captureSnap = await captureRef.get();
    if (captureSnap.exists) {
        return { createCapture_ok: false, ...captureSnap.data() };
    }

    // store the partial capture document
    const now = new Date().toISOString();
    const captureDoc = {
        captureId: captureId,
        uid,
        objectName,
        accuracy: accuracy !== null ? parseFloat(accuracy) : null,
        imageBase64: base64 || null,
        imageMimeType: mime || null,
        imageSizeBytes: size || 0,
        status: "pending_translation",
        createdAt: now,
    };
    console.log("Creating capture: ", objectName, " - ", captureId);
    await userRef.collection("captures").doc(captureId).set(captureDoc);
    console.log("Capture inserted.");

    // translate the objectName and update the capture document accordingly
    let wordId = null;
    let translatedWord = null;
    let pronunciation = null;
    // check if the translation of the objectName already exists
    const exists = await translationService.translationExistsService(objectName, targetLang);
    if (exists && typeof exists === 'object') {
        wordId = exists.wordId;
        translatedWord = exists.existing;
        pronunciation = exists.pronunciation || " ";
        console.log("Translation already exists: ", translatedWord);
    } else {
        // if the trasnlation does not exist, perform it now and store it
        const translationResult = await translationService.translateTextService(objectName, "auto", targetLang);
        translatedWord = translationResult.translatedWord;
        pronunciation = translationResult.raw?.pronunciation || " ";
        console.log("Performed new translation: ", translatedWord);
    }

    // update the related document in Words (even there is no update, run it anyway)
    const updateTranslation = await translationService.updateTranslationService(objectName, translatedWord, targetLang, pronunciation);
    
    wordId = updateTranslation.wordId;
    const captureUpdate = {
        wordId: wordId,
        translatedWord: translatedWord,
        targetLang,
        status: "translated",
        updatedAt: now,
    };
    console.log("Updating capture with translation info: ", translatedWord);
    await userRef.collection("captures").doc(captureId).set(captureUpdate, { merge: true });
    console.log("Capture updated with translation info.");

    // Return fresh capture data (merge the old + update payload)
    const updatedSnap = await userRef.collection("captures").doc(captureId).get();
    const updatedCapture = updatedSnap.data();

    return { createCapture_ok: true, ...updatedCapture};
}// end createCaptureService

export async function getCaptureService(captureId, uid) {
    if (!captureId) throw new Error("getCaptureService: captureId required");
    if (!uid) throw new Error("getCaptureService: uid required");

    const captureRef = db.collection("users").doc(uid).collection("captures").doc(captureId);
    const captureSnap = await captureRef.get();
    if (!captureSnap.exists) new Error("getCaptureService: Capture not found");
    const capture = captureSnap.data();
    console.log("Retrieved capture: ", captureId);

    return { getCapture_ok: true, ...capture };
}// end getCaptureService

export async function deleteCaptureService(captureId, uid) {
    if (!captureId) throw new Error("deleteCaptureService: captureId required");
    if (!uid) throw new Error("deleteCaptureService: uid required");

    // preliminary checks to ensure related documents exist
    const captureRef = db.collection("users").doc(uid).collection("captures").doc(captureId);
    const captureSnap = await captureRef.get();
    if (!captureSnap.exists) new Error("deleteCaptureService: Capture not found");
    await captureRef.delete();
    console.log("Capture deleted: ", captureId);

    return { deleteCapture_ok: true, captureId };
}// end deleteCaptureService

export async function listAllUserCaptureService(uid) {
    if (!uid) throw new Error("listAllUserCaptureService: uid required");

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("listAllUserCaptureService: User not found");

    const capturesCollection = userRef.collection("captures");
    const querySnap = await capturesCollection.orderBy("createdAt", "desc").get();
    const captures = [];
    querySnap.forEach(doc => {
        captures.push(doc.data());
    });
    console.log("Retrieved captures for user: ", uid, " - count: ", captures.length);

    return { listAllCaptures_ok: true, captures };
} // end listAllUserCaptureService