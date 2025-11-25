// src/routes/listRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import * as listController from "../controllers/listController.js";

const router = express.Router();

// Create a new user list - POST /lists
router.post("/", requireAuth, listController.createUserListHandler);
// Add an item to a list - POST /lists/:listId
router.post("/:listId", requireAuth, listController.addItemToListHandler);
// Create a shared list - POST /lists/share
router.post("/share", requireAuth, listController.createSharedListHandler);
// Import a shared list - POST /lists/import
router.post("/import", requireAuth, listController.importSharedListHandler);

// Get all user lists - GET /lists
router.get("/", requireAuth, listController.getUserListsHandler);
// Get all items in a list - GET /lists/:listId
router.get("/:listId", requireAuth, listController.getAllItemsInListHandler);
// Get a shared list by shared code - GET /lists/shared/:sharedCode
router.get("/shared/:sharedCode", listController.getSharedListHandler);

// Delete a user list - DELETE /lists/:listId
router.delete("/:listId", requireAuth, listController.deleteUserListHandler);
// Remove an item from a list - DELETE /lists/:listId/:wordId
router.delete("/:listId/:wordId", requireAuth, listController.removeItemFromListHandler);

// Update list details - PUT /lists/:listId
router.put("/:listId", requireAuth, listController.updateListHandler);

export default router;