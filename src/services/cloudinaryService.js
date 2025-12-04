import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const CLOUD_NAME = process.env.CLOUD_NAME;
const CLOUD_API_KEY = process.env.CLOUD_API_KEY;
const CLOUD_API_SECRET = process.env.CLOUD_API_SECRET;

if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_API_SECRET) throw new Error("Cloudinary configuration variables are missing.");

cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_API_KEY,
    api_secret: CLOUD_API_SECRET,
    secure: true,
});

// Function to upload image buffer to Cloudinary
export async function uploadImageToCloudinary(fileBuffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(new Error(`Cloudinary upload error: ${error.message}`));
            resolve(result);
        });
        stream.end(fileBuffer);
    });
} // end uploadImageToCloudinary

// Function to delete image from Cloudinary by public_id
export async function deleteImageFromCloudinary(public_id) {
    if (!public_id) throw new Error("deleteImageFromCloudinary: public_id is required");
    
    const deleteResult = await cloudinary.uploader.destroy(public_id);
    if (deleteResult.result !== 'ok' && deleteResult.result !== 'not found') {
        throw new Error(`Cloudinary delete failed: ${deleteResult.result}`);
    }
    return deleteResult;
} // end deleteImageFromCloudinary

