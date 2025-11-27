// src/services/imageService.js
import { db } from "../config/firebase.js";
import * as translationService from "./translationService.js";

// Helper: convert Buffer -> base64
function bufferToBase64(buf) {
    return buf.toString("base64");
}

// store partial image info, image metadata only
export async function createImageService(uid, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = 0, objectName, accuracy = null, targetLang) {
    if (!objectName) throw new Error("createImageService: objectName is required");
    if (!uid) throw new Error("createImageService: uid is required");
    if (!targetLang) throw new Error("createImageService: targetLang is required");

    // preliminary check to ensure user exists
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("createImageService: User not found");

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
    const imageId = `img_${objectName}_${targetLang}_${uid}`;
    const imageRef = userRef.collection("images").doc(imageId);
    const imageSnap = await imageRef.get();
    if (imageSnap.exists && imageSnap.data().targetLang === targetLang) {
        return { createImage_ok: false, ...imageSnap.data() };
    }

    // store the partial image document
    const now = new Date().toISOString();
    const imageDoc = {
        imageId: imageId,
        uid,
        objectName,
        accuracy: accuracy !== null ? parseFloat(accuracy) : null,
        imageMimeType: mime || null,
        imageSizeBytes: size || 0,
        status: "pending_translation",
        createdAt: now,
        imageBase64: base64 || null,
    };
    console.log("Creating image: ", objectName, " - ", imageId);
    await userRef.collection("images").doc(imageId).set(imageDoc);
    console.log("image inserted.");

    // translate the objectName and update the image document accordingly
    let wordId = null;
    let translatedWord = null;
    //let pronunciation = null;
    // check if the translation of the objectName already exists
    const exists = await translationService.translationExistsService(objectName, targetLang);
    if (exists && typeof exists === 'object') {
        wordId = exists.wordId;
        translatedWord = exists.existing;
        //pronunciation = exists.pronunciation || " ";
        console.log("Translation already exists: ", translatedWord);
    } else {
        // if the trasnlation does not exist, perform it now and store it
        const translationResult = await translationService.translateTextService(objectName, "auto", targetLang);
        translatedWord = translationResult.translatedWord;
        //pronunciation = translationResult.raw?.pronunciation || " ";
        console.log("Performed new translation: ", translatedWord);
    }

    // update the related document in Words (even there is no update, run it anyway)
    const updateTranslation = await translationService.updateTranslationService(objectName, translatedWord, targetLang);

    wordId = updateTranslation.wordId;
    const imageUpdate = {
        wordId: wordId,
        translatedWord: translatedWord,
        targetLang,
        status: "translated",
        updatedAt: now,
    };
    console.log("Updating image with translation info: ", translatedWord);
    await userRef.collection("images").doc(imageId).set(imageUpdate, { merge: true });
    console.log("image updated with translation info.");

    // Return fresh image data (merge the old + update payload)
    const updatedSnap = await userRef.collection("images").doc(imageId).get();
    const updatedimage = updatedSnap.data();

    return { createimage_ok: true, ...updatedimage };
}// end createImageService

export async function getImageService(imageId, uid) {
    if (!imageId) throw new Error("getImageService: imageId required");
    if (!uid) throw new Error("getImageService: uid required");

    const imageRef = db.collection("users").doc(uid).collection("images").doc(imageId);
    const imageSnap = await imageRef.get();
    if (!imageSnap.exists) new Error("getImageService: image not found");
    const image = imageSnap.data();
    console.log("Retrieved image: ", imageId);

    return { getImage_ok: true, ...image };
}// end getImageService

export async function deleteImageService(imageId, uid) {
    if (!imageId) throw new Error("deleteImageService: imageId required");
    if (!uid) throw new Error("deleteImageService: uid required");
    // preliminary checks to ensure related documents exist
    const imageRef = db.collection("users").doc(uid).collection("images").doc(imageId);
    const imageSnap = await imageRef.get();
    if (!imageSnap.exists) new Error("deleteImageService: image not found");
    await imageRef.delete();
    console.log("image deleted: ", imageId);

    return { deleteImage_ok: true, imageId };
}// end deleteImageService

export async function listAllUserImageService(uid) {
    if (!uid) throw new Error("listAllUserImageService: uid required");

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("listAllUserImageService: User not found");   
    const imagesCollection = userRef.collection("images");
    const querySnap = await imagesCollection.orderBy("createdAt", "desc").get();
    const images = [];
    querySnap.forEach(doc => {
        images.push(doc.data());
    });
    console.log("Retrieved images for user: ", uid, " - count: ", images.length);

    return { listAllimages_ok: true, images };
} // end listAllUserimageService