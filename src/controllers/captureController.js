// src/controllers/captureController.js
import * as captureService from "../services/captureService.js";
import { MAX_BYTES } from "../middleware/multerMiddleware.js";

// Accepts either multipart file (req.file) or JSON base64 (req.body.imageBase64)
export const createCaptureHandler = async (req, res) => {
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

        const result = await captureService.createCaptureService(uid, fileBuffer, imageBase64, imageMimeType, imageSizeBytes, objectName, accuracy, targetLang);
        if(result.createCapture_ok === false) {
            return  res.json({ message: "Capture already exists", ...result });
        }
        return res.json({ message: "Capture creation successful", ...result });
    } catch (err) {
        console.error("createCapture controller error:", err);
        return res.json({ error: err.message || "Failed to create capture" });
    }
} // end createCaptureHandler

export const getCaptureHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { captureId } = req.params;
        if (!captureId) return res.json({ error: "captureId required" });
        const capture = await captureService.getCaptureService(captureId, uid);
        return res.json({ message: "Get capture successful", ...capture });
    } catch (error) {
        console.error("getCapture controller error:", error);
        return res.json({ error: error.message || "Failed to get capture" });
    }
}// end getCaptureHandler

export const deleteCaptureHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { captureId } = req.params;
        if (!captureId) return res.json({ error: "captureId required" });
        const deleted = await captureService.deleteCaptureService(captureId, uid);
        return res.json({ message: "Capture deleted", ...deleted });
    } catch (err) {
        console.error("deleteCapture controller error:", err);
        return res.json({ error: err.message || "Failed to delete capture" });
    }
} // end deleteCaptureHandler

export const listAllUserCaptureHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const captures = await captureService.listAllUserCaptureService(uid);
        return res.json({  message: "List captures successful", ...captures });
    } catch (error) {
        console.error("listAllUserCapture controller error:", error);
        return res.json({ error: error.message || "Failed to list captures" });
    }
} // end listAllUserCaptureHandler