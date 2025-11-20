import multer from "multer";
import dotenv from "dotenv";
dotenv.config();

const MAX_BYTES = parseInt(process.env.MAX_IMAGE_BYTES || "900000", 10);

// memory storage (do not write to disk)
const storage = multer.memoryStorage();

// max file size enforced by multer
const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES }
});

export { upload, MAX_BYTES };
