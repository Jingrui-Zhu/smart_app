// config/firebase.js
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";
//detects and loads the .env file if present
dotenv.config();

function loadServiceAccount() {
  // if the service account is set as env variable
  if (process.env.SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  }
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), "serviceAccountKey.json");
  if (!existsSync(keyPath)) {
    throw new Error(`Service account file not found at ${keyPath}. Place serviceAccountKey.json in project root or set SERVICE_ACCOUNT_JSON.`);
  }
  return JSON.parse(readFileSync(keyPath, "utf8"));
}

const keyJson = loadServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(keyJson),
    storageBucket: `${keyJson.project_id}.appspot.com`
  });
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage ? admin.storage().bucket() : null;

export { admin, db, auth, bucket };
