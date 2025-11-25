import { readFileSync, existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";
//detects and loads the .env file if present
dotenv.config();

function loadServiceAccount() {
  // if the service account is set as env variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), "serviceAccountKey.json");
  if (!existsSync(keyPath)) {
    throw new Error(`Service account file not found at ${keyPath}. Place serviceAccountKey.json in project root or set FIREBASE_SERVICE_ACCOUNT.`);
  }
  return JSON.parse(readFileSync(keyPath, "utf8"));
}

export default loadServiceAccount;