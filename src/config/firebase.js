// config/firebase.js
import admin from "firebase-admin";
import dotenv from "dotenv";
import { loadServiceAccount } from "../services/loadServiceAccount.js";
//detects and loads the .env file if present
dotenv.config();

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
