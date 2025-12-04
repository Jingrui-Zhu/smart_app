// src/controllers/listController.js
import * as listService from '../services/listService.js';
import { MAX_BYTES } from "../middleware/multerMiddleware.js";

export const createUserListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { listName } = req.body;

        // handle image
        let fileBuffer = null;
        let imageBase64 = null;
        let imageMimeType = null;
        let imageSizeBytes = 0;

        if (req.file) {
            fileBuffer = req.file.buffer;
            imageMimeType = req.file.mimetype;
            imageSizeBytes = req.file.size;
            if (imageSizeBytes > MAX_BYTES) return res.json({ error: "Image too large" });
        } else if (req.body.imageBase64) {
            imageBase64 = req.body.imageBase64;
            imageMimeType = req.body.imageMimeType || "image/jpeg";
            // approximate size
            const base64Length = imageBase64.length;
            imageSizeBytes = Math.floor((base64Length * 3) / 4);
            if (imageSizeBytes > MAX_BYTES) return res.json({ error: "Image too large" });
        }

        const list = await listService.createUserListService(uid, listName, fileBuffer, imageBase64, imageMimeType, imageSizeBytes);
        return res.json({ message: "User list created successfully", ...list });
    } catch (err) {
        console.error("createUserList controller error:", err);
        return res.json({ error: err.message || "Failed to create user list" });
    }
} // end createUserListHandler

export const getUserListsHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const lists = await listService.getUserAllListsService(uid);
        return res.json({ message: "Get user lists successful", ...lists });
    } catch (err) {
        console.error("getUserLists controller error:", err);
        return res.json({ error: err.message || "Failed to get user lists" });
    }
} // end getUserLists

export const deleteUserListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { listId } = req.params;
        const result = await listService.deleteUserListService(uid, listId);
        return res.json({ message: "User list deleted successfully", ...result });
    } catch (err) {
        console.error("deleteUserList controller error:", err);
        return res.json({ error: err.message || "Failed to delete user list" });
    }
} // end deleteUserListHandler

export const getAllItemsInListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { listId } = req.params;
        const items = await listService.getAllItemsInListService(uid, listId);
        return res.json({ message: "Get all items in list successful", ...items });
    } catch (err) {
        console.error("getAllItemsInList controller error:", err);
        return res.json({ error: err.message || "Failed to get items in list" });
    }
} // end getAllItemsInListHandler

export const addItemToListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { listId } = req.params;
        const { wordId, imageId } = req.body;
        // Use the multi-list service with a single list
        const result = await listService.addItemToMultipleListsService(uid, [listId], wordId, imageId);
        if (!result.addItemToMultipleLists_ok || result.summary.successCount === 0) {
            const firstError = result.results[0]?.message || "Failed to add item to list";
            return res.json({ error: firstError });
        }
        return res.json({ message: "Item added to list successfully", addItemToList_ok: true, ...result.results[0] });
    } catch (err) {
        console.error("addItemToList controller error:", err);
        return res.json({ error: err.message || "Failed to add item to list" });
    }
} // end addItemToListHandler

export const addItemToMultipleListsHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        let { listIds, wordId, imageId } = req.body;

        // normalize incoming payload: accept comma-separated string or array
        if (!listIds && req.body.listId) {
            listIds = req.body.listId;
        }
        // normalize listIds to array
        if (!Array.isArray(listIds)) {
            if (typeof listIds === 'string') {
                // allow comma-separated
                listIds = listIds.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                listIds = [listIds];
            }
        }

        // enforce max 5 lists at controller level as well
        if (listIds.length === 0) return res.json({ error: "listIds is required" });
        if (listIds.length > 5) return res.json({ error: "Maximum 5 lists are supported" });

        const result = await listService.addItemToMultipleListsService(uid, listIds, wordId, imageId);
        return res.json({ message: "addItemToMultipleLists successful", ...result });
    } catch (err) {
        console.error("addItemToMultipleLists controller error:", err);
        return res.json({ error: err.message || "Failed to add item to lists" });
    }
} // end addItemToMultipleListsHandler

export const removeItemFromListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { listId, wordId } = req.params;
        const result = await listService.removeItemFromListService(uid, listId, wordId);
        return res.json({ message: "Item removed from list successfully", ...result });
    } catch (err) {
        console.error("removeItemFromList controller error:", err);
        return res.json({ error: err.message || "Failed to remove item from list" });
    }
} // end removeItemFromListHandler

export const updateListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid || null;
        const { listId } = req.params;
        const { listName, removeImage } = req.body;

        // handle image
        let fileBuffer = null;
        let imageBase64 = null;
        let imageMimeType = null;
        let imageSizeBytes = 0;
        let removeImageFlag = req.body.removeImage || false;

        if (req.file) {
            fileBuffer = req.file.buffer;
            imageMimeType = req.file.mimetype;
            imageSizeBytes = req.file.size;
            if (imageSizeBytes > MAX_BYTES) return res.json({ error: "Image too large" });
        } else if (req.body.imageBase64) {
            imageBase64 = req.body.imageBase64;
            imageMimeType = req.body.imageMimeType || "image/jpeg";
            // approximate size
            const base64Length = imageBase64.length;
            imageSizeBytes = Math.floor((base64Length * 3) / 4);
            if (imageSizeBytes > MAX_BYTES) return res.json({ error: "Image too large" });
        }

        const result = await listService.updateListService(uid, listId, listName, fileBuffer, imageBase64, imageMimeType, imageSizeBytes, removeImageFlag);
        return res.json({ message: "List updated successfully", ...result });
    } catch (error) {
        console.error("updateList controller error:", error);
        return res.json({ error: error.message || "Failed to update list" });
    }
} // end updateListHandler

export const createSharedListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { listId } = req.body;
        const result = await listService.createSharedListCodeService(uid, listId);
        return res.json({ message: "Shared list code created successfully", ...result });
    } catch (err) {
        console.error("createListShare error:", err);
        return res.json({ error: err.message || "Failed to create shared list code" });
    }
} // end createSharedListHandler

export const getSharedListHandler = async (req, res) => {
    try {
        const { sharedCode } = req.params;
        const sharedList = await listService.getSharedListService(sharedCode);
        return res.json({ message: "Shared list retrieved successfully", ...sharedList });
    } catch (error) {
        console.error("getSharedList error:", error);
        return res.json({ error: error.message || "Failed to get shared list" });
    }
} // end getSharedListHandler

// Public variant of the shared-list handler (no auth). Separate function to avoid reusing
// the same handler across multiple routes.
export const getSharedListPublicHandler = async (req, res) => {
    try {
        const { sharedCode } = req.params;
        if (!sharedCode) return res.status(400).json({ error: "sharedCode is required" });
        const sharedList = await listService.getSharedListService(sharedCode);
        return res.json({ message: "Shared list retrieved successfully", ...sharedList });
    } catch (error) {
        console.error("getSharedListPublic error:", error);
        return res.status(404).json({ error: error.message || "Failed to get shared list" });
    }
} // end getSharedListPublicHandler

export const importSharedListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid || null;
        const { sharedCode } = req.body;
        const result = await listService.importSharedListService(uid, sharedCode);
        return res.json({ message: "Shared list imported successfully", ...result });
    } catch (error) {
        console.error("importSharedList error:", error);
        return res.json({ error: error.message || "Failed to import shared list" });
    }
} // end importSharedListHandler
