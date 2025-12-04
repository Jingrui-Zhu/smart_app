import multer from "multer";
import dotenv from "dotenv";
dotenv.config();

const MAX_BYTES = parseInt(process.env.MAX_IMAGE_BYTES || String(5 * 1024 * 1024), 10);

// max file size enforced by multer and memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES }
});

export { upload, MAX_BYTES };
