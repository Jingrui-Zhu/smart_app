// src/routes/imageRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multerMiddleware.js";
import * as imageService from "../controllers/imageController.js";

const router = express.Router();

// Create a new image - POST /images
router.post("/", requireAuth, upload.single("image"), imageService.createImageHandler);

// get a image - GET /images/:imageId
router.get("/:imageId", requireAuth, imageService.getImageHandler);
// List all images for user - GET /images
router.get("/", requireAuth, imageService.listAllUserImageHandler);

// Delete a image - DELETE /images/:imageId
router.delete("/:imageId", requireAuth, imageService.deleteImageHandler);

export default router;