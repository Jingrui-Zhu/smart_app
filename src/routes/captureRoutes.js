// src/routes/captureRoutes.js
import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multerMiddleware.js";
import * as captureService from "../controllers/captureController.js";

const router = express.Router();

// Create a new capture - POST /captures
router.post("/", requireAuth, upload.single("image"), captureService.createCaptureHandler);

// get a capture - GET /captures/:captureId
router.get("/:captureId", requireAuth, captureService.getCaptureHandler);
// List all captures for user - GET /captures
router.get("/", requireAuth, captureService.listAllUserCaptureHandler);

// Delete a capture - DELETE /captures/:captureId
router.delete("/:captureId", requireAuth, captureService.deleteCaptureHandler);

export default router;