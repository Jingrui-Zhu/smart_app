// src/routes/listRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import * as listController from "../controllers/listController.js";

const router = express.Router();

// Create a new user list - POST /lists
router.post("/", requireAuth, listController.createUserListHandler);
// Create a shared list - POST /lists/share
router.post("/share", requireAuth, listController.createSharedListHandler);
// Import a shared list - POST /lists/import
router.post("/import", requireAuth, listController.importSharedListHandler);
// Add an item to a list - POST /lists/:listId/items
router.post("/:listId/items", requireAuth, listController.addItemToListHandler);

// Get all user lists - GET /lists
router.get("/", requireAuth, listController.getUserListsHandler);
// Get all items in a list - GET /lists/:listId/items
router.get("/:listId/items", requireAuth, listController.getAllItemsInListHandler);
// Get a shared list by shared code - GET /lists/shared/:sharedCode
router.get("/shared/:sharedCode", requireAuth, listController.getSharedListHandler);

// Delete a user list - DELETE /lists/:listId
router.delete("/:listId", requireAuth, listController.deleteUserListHandler);
// Remove an item from a list - DELETE /lists/:listId/items/:wordId
router.delete("/:listId/items/:wordId", requireAuth, listController.removeItemFromListHandler);

// Update list details - PUT /lists/:listId
router.put("/:listId", requireAuth, listController.updateListHandler);

export default router;