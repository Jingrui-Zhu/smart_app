//setup Firestore
import admin from "firebase-admin";
import dotenv from "dotenv";
import { loadServiceAccount } from "./src/services/loadServiceAccount.js";
dotenv.config();

// populate the firastore database with demo data
async function main() {
  const keyJson = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(keyJson),
    storageBucket: `${keyJson.project_id}.appspot.com`
  });
  const db = admin.firestore();

  const now = new Date().toISOString();
  // Create user profile with hashed password
  const userId = "uid_demo_1";
  const userDoc = {
    uid: userId,
    email: "demo.user@example.com",
    password: "password123",
    displayName: "Demo User",
    //nativeLang: "en",
    //preferredTargetLang: "it",
    avatarId: 1,
    createdAt: now,
    lastSeen: now
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
    //pronunciations: { it: "'ta.vo.lo" },
    //createdAt: new Date().toISOString(),
    //curation: { createdBy: "seed-script", source: "demo", approved: true }
  };
  console.log("Creating word: ", wordDoc.originalWord);
  await db.collection("words").doc(wordId).set(wordDoc);
  console.log("Word inserted.");

  // Create images 
  const imageId = `img_demo_table_it_${userId}`;
  const imageDoc = {
    imageId: imageId,
    objectName: wordId,
    uid: userId,
    //imagePath: `user-images/${userId}/${imageId}.jpg`,
    //imageDownloadUrl: "https://example.com/fake-download-url.jpg",
    accuracy: 0,
    imageBase64: null,
    imageMimeType: null,
    imageSizeBytes: 0,
    createdAt: now,
    wordId: wordId,
    translatedWord: "tavolo",
    targetLang: "it",
    status: "translated",
    updatedAt: now,
    //modelInfo: { objModel: "demo-obj-v1", transModel: "demo-trans-v1" }
  };
  console.log("Creating image.");
  await db.collection("users").doc(userId).collection("images").doc(imageId).set(imageDoc);
  console.log("User image inserted: ", imageId);

  // Create user word list under user
  const listId = `demo_list_${userId}`
  const listDoc = {
    listId: listId,
    listName: "favorite",
    description: "My favorite words",
    //listLanguage: ["en", "it"],
    isDefault: true,
    visibility: "private",
    imported: false,
    wordCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  console.log("Creating user word list.");
  await db.collection("users").doc(userId).collection("lists").doc(listId).set(listDoc);
  console.log("User word list inserted: ", listId);

  // create list item under list and add word to list
  const itemDoc = {
    wordId: wordId,
    originalWord: wordDoc.originalWord,
    translatedWord: wordDoc.translations["it"],
    translatedLang: imageDoc.targetLang,
    imageId: imageId,
    note: "Demo word added via seed script",
    addedAt: now,
  }
  console.log("Adding word to user list");
  await db.collection("users").doc(userId).collection("lists").doc(listId).collection("items").doc(wordId).set(itemDoc);
  console.log("Word added to list: ", wordId);

  // Create flashcard using the imageId as id (denormalized copy)
  const flashcardId = `fc_${imageId}`;
  const flashcardDoc = {
    fcId: flashcardId,
    imageRef: imageId,
    wordId: wordId,
    originalWord: imageDoc.objectName,
    translatedWord: imageDoc.translatedWord,
    //pronunciation: wordDoc.pronunciations["it"],
    targetLang: imageDoc.targetLang,
    //imageDownloadUrl: imageDoc.imageDownloadUrl,
    //familiarity: 0,
    //tags: ["demo", "furniture"],
    description: "Seeded flashcard for demo",
    createdBy: userId,
    createdAt: now,
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
