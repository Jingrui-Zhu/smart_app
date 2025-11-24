// src/controllers/listController.js
import * as listService from '../services/listService.js';

export const createUserListHandler = async (req, res) => {
    try {
        const uid = req.user?.uid;
        const { listName } = req.body;
        const list = await listService.createUserListService(uid, listName);
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
        const { wordId, captureId } = req.body;
        const result = await listService.addItemToListService(uid, listId, wordId, captureId);
        return res.json({ message: "Item added to list successfully", ...result });
    } catch (err) {
        console.error("addItemToList controller error:", err);
        return res.json({ error: err.message || "Failed to add item to list" });
    }
} // end addItemToListHandler

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
        const { listName } = req.body;
        const result = await listService.updateListService(uid, listId, listName);
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