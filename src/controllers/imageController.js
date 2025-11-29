// src/controllers/imageController.js
import * as imageService from "../services/imageService.js";
import { MAX_BYTES } from "../middleware/multerMiddleware.js";

// Accepts either multipart file (req.file) or JSON base64 (req.body.imageBase64)
export const createImageHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { objectName, accuracy, targetLang } = req.body;

        // handle image
        let fileBuffer = null;
        let imageBase64 = null;
        let imageMimeType = null;
        let imageSizeBytes = 0;

        if (req.file) {
            fileBuffer = req.file.buffer;
            imageMimeType = req.file.mimetype;
            imageSizeBytes = req.file.size;
            if (imageSizeBytes > MAX_BYTES) {
                return res.json({ error: "Image too large" });
            }
        } else if (req.body.imageBase64) {
            imageBase64 = req.body.imageBase64;
            imageMimeType = req.body.imageMimeType || "image/jpeg";
            // approximate size
            const base64Length = imageBase64.length;
            imageSizeBytes = Math.floor((base64Length * 3) / 4);
            if (imageSizeBytes > MAX_BYTES) {
                return res.json({ error: "Image too large" });
            }
        } else {
            return res.json({ error: "No image provided (file or imageBase64)" });
        }

        const result = await imageService.createImageService(uid, fileBuffer, imageBase64, imageMimeType, imageSizeBytes, objectName, accuracy, targetLang);
        if (result.createImage_ok === false) {
            return res.json({ message: "image already exists", ...result });
        }
        return res.json({ message: "image creation successful", ...result });
    } catch (err) {
        console.error("createImage controller error:", err);
        return res.json({ error: err.message || "Failed to create image" });
    }
} // end createImageHandler

export const updateImageHander = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { imageId } = req.params;
        const updated = await imageService.updateImageService(uid, imageId);
        return res.json({ message: "Image updated successfully", ...updated });
    } catch (error) {
        console.error("updateImage controller error:", error);
        return res.json({ error: error.message || "Failed to update image" });
    }
}// end updateImageHander

export const getImageHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { imageId } = req.params;
        if (!imageId) return res.json({ error: "imageId required" });
        const image = await imageService.getImageService(imageId, uid);
        return res.json({ message: "Get image successful", ...image });
    } catch (error) {
        console.error("getImage controller error:", error);
        return res.json({ error: error.message || "Failed to get image" });
    }
}// end getImageHandler

export const deleteImageHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { imageId } = req.params;
        if (!imageId) return res.json({ error: "imageId required" });
        const deleted = await imageService.deleteImageService(imageId, uid);
        return res.json({ message: "image deleted", ...deleted });
    } catch (err) {
        console.error("deleteImage controller error:", err);
        return res.json({ error: err.message || "Failed to delete image" });
    }
} // end deleteImageHandler

export const listAllUserImageHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const images = await imageService.listAllUserImageService(uid);
        return res.json({ message: "List images successful", ...images });
    } catch (error) {
        console.error("listAllUserImage controller error:", error);
        return res.json({ error: error.message || "Failed to list images" });
    }
} // end listAllUserImageHandler