//setup Firestore
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

// Load service account credentials
function getServiceAccount() {
  if (process.env.SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  }
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), "serviceAccountKey.json");
  if (!filePath) throw new Error("No service account configured.");
  return JSON.parse(readFileSync(filePath, "utf8"));
}


// populate the firastore database with demo data
async function main() {
  const keyJson = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(keyJson),
    storageBucket: `${keyJson.project_id}.appspot.com`
  });
  const db = admin.firestore();

  // Create user profile with hashed password
  const userId = "uid_demo_1";
  const userDoc = {
    uid: userId,
    email: "demo.user@example.com",
    password: "password123",
    displayName: "Demo User",
    nativeLang: "en",
    preferredTargetLang: "it",
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  };

  console.log("Creating user profile: " + userDoc.email + " - " + userDoc.displayName);
  await db.collection("users").doc(userId).set(userDoc);
  console.log("User profile inserted.");

  // Create a demo word
  const wordId = "id_demo_table";
  const wordDoc = {
    wordId: wordId,
    originalWord: "table",
    translations: { en: "table", it: "tavolo" },
    pronunciations: { it: "'ta.vo.lo" },
    //createdAt: new Date().toISOString(),
    //curation: { createdBy: "seed-script", source: "demo", approved: true }
  };
  console.log("Creating word: ", wordDoc.originalWord);
  await db.collection("words").doc(wordId).set(wordDoc);
  console.log("Word inserted.");

  // Create captures 
  const captureId = uuidv4();
  const captureDoc = {
    captureId: captureId,
    createdAt: new Date().toISOString(),
    objectName: wordId,
    uid: userId,
    originalWord: "table",
    translatedWord: "tavolo",
    sourceLang: "en",
    targetLang: "it",
    pronunciation: "ˈta.vo.lo",
    //imagePath: `user-images/${userId}/${captureId}.jpg`,
    //imageDownloadUrl: "https://example.com/fake-download-url.jpg",
    confidence: 0.95,
    //modelInfo: { objModel: "demo-obj-v1", transModel: "demo-trans-v1" }
  };
  console.log("Creating capture.");
  await db.collection("users").doc(userId).collection("captures").doc(captureId).set(captureDoc);
  console.log("User capture inserted: ", captureId);

  // Create user word list under user
  const listId = "demo_favourite_list";
  const listDoc = {
    listId: listId,
    listName: "favorite",
    description: "My favorite words",
    listLanguage: ["en", "it"],
    isDefault: true,
    visibility: "private",
    imported: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 1
  };
  console.log("Creating user word list.");
  await db.collection("users").doc(userId).collection("lists").doc(listId).set(listDoc);
  console.log("User word list inserted: ", listId);

  // create list item under list and add word to list
  const itemDoc = {
    wordId: wordId,
    originalWord: wordDoc.originalWord,
    translatedWord: wordDoc.translations["it"],
    originalLang: captureDoc.sourceLang,
    translatedLang: captureDoc.targetLang,
    captureId: captureId,
    note: "Demo word added via seed script",
    addedAt: new Date().toISOString(),
  }
  console.log("Adding word to user list");
  await db.collection("users").doc(userId).collection("lists").doc(listId).collection("items").doc(wordId).set(itemDoc);
  console.log("Word added to list: ", wordId);

  // Create flashcard using the captureId as id (denormalized copy)
  const flashcardId = `fc_${captureId}`;
  const flashcardDoc = {
    flashcardId: flashcardId,
    createdAt: new Date().toISOString(),
    captureRef: `captures/${captureId}`,
    wordId: wordId,
    originalWord: captureDoc.originalWord,
    translatedWord: captureDoc.translatedWord,
    pronunciation: captureDoc.pronunciation,
    //imageDownloadUrl: captureDoc.imageDownloadUrl,
    //familiarity: 0,
    //tags: ["demo", "furniture"],
    description: "Seeded flashcard for demo"
  };
  console.log("Creating flashcard");
  await db.collection("users").doc(userId).collection("flashcards").doc(flashcardId).set(flashcardDoc);
  console.log("Flashcard inserted: ", flashcardId);

  console.log("Seeding complete.");
  process.exit(0);
}

main().catch(err => {
  console.error("Error seeding Firestore:", err);
  process.exit(1);
});
