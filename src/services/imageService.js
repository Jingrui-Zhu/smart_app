// src/services/imageService.js
import { db } from "../config/firebase.js";
import * as translationService from "./translationService.js";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "./cloudinaryService.js";

// Helper: convert Buffer -> base64
/*
function bufferToBase64(buf) {
    return buf.toString("base64");
}
*/

// store partial image info, image metadata only
export async function createImageService(uid, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = null, objectName, accuracy = null, targetLang, x = 0, y = 0, width = 0, height = 0) {
    if (!objectName) throw new Error("createImageService: objectName is required");
    if (!uid) throw new Error("createImageService: uid is required");
    if (!targetLang) throw new Error("createImageService: targetLang is required");
    if (x == 0 && y == 0 && width == 0 && height == 0) throw new Error("createImageService: x, y, width, height are required - no object selected");

    // preliminary check to ensure user exists
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("createImageService: User not found");

    // check if image with same objectName and targetLang already exists
    objectName = objectName.toLowerCase().replace(/\s+/g, "_");
    const imageId = `img_${objectName}_${targetLang}_${uid}`;
    const imageRef = userRef.collection("images").doc(imageId);
    const imageSnap = await imageRef.get();
    if (imageSnap.exists && imageSnap.data().targetLang === targetLang) {
        return { createImage_ok: false, ...imageSnap.data() };
    }

    let uploadResult = null;
    let options = {
        folder: `smart_app/image/${uid}`, // setup folder structure
        resource_type: "image",
        public_id: `${imageId}`, // set public_id to imageId for easier management
        // automatic image resizing and optimization
        transformation: [
            {
                quality: "auto",
                fetch_format: "auto"
            }
        ]
    };

    // upload to Cloudinary
    if (fileBuffer) {
        uploadResult = await uploadImageToCloudinary(fileBuffer, options);
    } else if (imageBase64) {
        // convert base64 string to buffer
        const buffer = Buffer.from(imageBase64, "base64");
        uploadResult = await uploadImageToCloudinary(buffer, options);
    }

    // store the partial image document
    const now = new Date().toISOString();
    const imageDoc = {
        imageId: imageId,
        uid: uid,
        objectName: objectName,
        targetLang: targetLang,
        accuracy: accuracy !== null ? parseFloat(accuracy) : null,
        imageMimeType: imageMimeType,
        imageUrl: uploadResult ? uploadResult.secure_url : null,
        cloudinaryPublicId: uploadResult ? uploadResult.public_id : null, // this should be the same as imageId
        imageSizeBytes: uploadResult ? uploadResult.bytes : imageSizeBytes,
        x: x,
        y: y,
        width: width,
        height: height,
        status: "uploaded",
        createdAt: now,
    };
    console.log("Creating image: ", objectName, " - ", imageId);
    await userRef.collection("images").doc(imageId).set(imageDoc);
    console.log("image inserted.");

    // deprecated translation logic moved to updateImageService
    /*
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
    */

    return { createImage_ok: true, ...imageDoc };
}// end createImageService

export async function updateImageService(uid, imageId) {
    if (!imageId) throw new Error("updateImageService: imageId required");
    if (!uid) throw new Error("updateImageService: uid required");

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("updateImageService: User not found");

    const imageRef = userRef.collection("images").doc(imageId);
    const imageSnap = await imageRef.get();
    if (!imageSnap.exists) throw new Error("updateImageService: image not found");
    const imageData = imageSnap.data();

    const objectName = imageData.objectName;
    const targetLang = imageData.targetLang;
    const exists = await translationService.translationExistsService(objectName, targetLang);
    console.log("Translation exists check for updateImageService: ", exists);

    const now = new Date().toISOString();
    const updateDoc = {
        wordId: exists ? exists.wordId : null,
        translatedWord: exists ? exists.translatedWord : null,
        status: exists ? "translated" : "translation_not_found",
        updatedAt: now,
    }
    console.log("Updating image: ", imageData.objectName, " with translation info.");
    await userRef.collection("images").doc(imageId).set(updateDoc, { merge: true });
    console.log("image updated: ", imageId);

    return { updateImage_ok: true, imageId, ...updateDoc };
}// end updateImageService

export async function getImageService(imageId, uid) {
    if (!imageId) throw new Error("getImageService: imageId required");
    if (!uid) throw new Error("getImageService: uid required");

    const imageRef = db.collection("users").doc(uid).collection("images").doc(imageId);
    const imageSnap = await imageRef.get();
    if (!imageSnap.exists) throw new Error("getImageService: image not found");
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
    if (!imageSnap.exists) throw new Error("deleteImageService: image not found");
    const imageData = imageSnap.data();

    // delete from cloudinary
    if (imageData.cloudinaryPublicId) {
        await deleteImageFromCloudinary(imageData.cloudinaryPublicId);
        console.log("Deleted image from Cloudinary: ", imageData.cloudinaryPublicId);
    }
    // delete from firestore
    await imageRef.delete();
    console.log("Deleted image document from Firestore: ", imageId);

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