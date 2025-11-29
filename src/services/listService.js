// src/services/listService.js
import { db, admin } from "../config/firebase.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

function bufferToBase64(buf) {
  return buf.toString("base64");
}
export async function createUserListService(uid, listName, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = 0) {
  if (!uid) throw new Error("createUserListService: uid is required");
  if (!listName) throw new Error("createUserListService: listName is required");

  // If buffer provided, convert to base64
  let base64 = imageBase64;
  let mime = imageMimeType;
  let size = imageSizeBytes;

  if (fileBuffer) {
    base64 = bufferToBase64(fileBuffer);
    // caller should provide mime + size via req.file; but if not, leave mime null
    size = fileBuffer.length;
  }

  // preliminary check to ensure user exists
  const userDocSnap = await db.collection("users").doc(uid).get();
  if (!userDocSnap.exists) throw new Error("createUserListService: User not found");

  const listId = `${listName.toLowerCase().replace(/\s+/g, "_")}_${uid}`;
  const listRef = db.collection("users").doc(uid).collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (listSnap.exists) throw new Error("createUserListService: List with same name already exists");

  // create the list
  //const userData = userDocSnap.data();
  const now = new Date().toISOString();
  const listDoc = {
    listId: listId,
    listName: listName,
    description: " ",
    //listLanguage: [userData.nativeLang, userData.preferredTargetLang],
    isDefault: false,
    visibility: "private",
    imported: false,
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
    imageMimeType: mime || null,
    imageSizeBytes: size || 0,
    imageBase64: base64 || null,
  };
  console.log("Creating user list: ", listName, " - ", listId);
  await db.collection("users").doc(uid).collection("lists").doc(listId).set(listDoc);
  console.log("User list inserted.");

  return { createUserList_ok: true, ...listDoc };
}// end createUserListsService

// function create a language-specific list for the user, if not already existing
// such function will not be exposed via API, i.e. not called by the user directly
export async function createUserLangListService(uid, targetLang) {
  if (!uid) throw new Error("createUserLangListService: uid is required");
  if (!targetLang) throw new Error("createUserLangListService: targetLang is required");

  // check if the language list already exists for the user
  const listId = `lang_list_${targetLang}_${uid}`;
  const listRef = db.collection("users").doc(uid).collection("lists").doc(listId);
  const listSnap = await listRef.get();
  // if so, return the list
  if (listSnap.exists) {
    return { lang_list_created: false, message: "language list already exists", list: { id: listId, ...listSnap.data() } };
  }

  // create the language list
  const now = new Date().toISOString();
  const listDoc = {
    listId: listId,
    listName: `Language: ${targetLang}`,
    description: `Words translated to ${targetLang}`,
    listLanguage: targetLang,
    isDefault: false,
    visibility: "private",
    imported: false,
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
  }
  console.log("Creating user language list: ", listId);
  await listRef.set(listDoc);
  console.log("User language list inserted.");

  return { langListCreated_ok: true, ...listDoc };
}// end createUserLangListService

export async function getUserAllListsService(uid) {
  if (!uid) throw new Error("getUserAllListsService: uid is required");

  const listsSnap = await db.collection("users").doc(uid).collection("lists").get();
  const lists = listsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log("Retrieved lists for user: ", uid, " - count: ", lists.length);

  return { getUserAllLists_ok: true, lists };
}// end getUserAllListsService

export async function deleteUserListService(uid, listId) {
  if (!uid) throw new Error("deleteUserListService: uid is required");
  if (!listId) throw new Error("deleteUserListService: listId is required");

  const listRef = db.collection("users").doc(uid).collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (!listSnap.exists) throw new Error("deleteUserListService: List not found");
  await listRef.delete();
  console.log("Deleted list for user: ", uid, " - listId: ", listId);

  return { deleteUserList_ok: true, listId };
}// end deleteUserListService

export async function getAllItemsInListService(uid, listId) {
  if (!uid) throw new Error("getAllItemsInListService: uid is required");
  if (!listId) throw new Error("getAllItemsInListService: listId is required");

  const itemsSnap = await db.collection("users").doc(uid).collection("lists").doc(listId).collection("items").get();
  const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log("Retrieved items for user: ", uid, " - listId: ", listId, " - count: ", items.length);

  return { getAllItemsInList_ok: true, items };
}// end getAllItemsInListService

export async function addItemToListService(uid, listId, wordId, imageId) {
  if (!uid) throw new Error("addItemToListService: uid is required");
  if (!listId) throw new Error("addItemToListService: listId is required");
  if (!wordId) throw new Error("addItemToListService: wordId is required");
  if (!imageId) throw new Error("addItemToListService: imageId is required");

  // preliminary check to ensure user exists
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error("addItemToListService: User not found");

  const imageRef = userRef.collection("images").doc(imageId);
  const imageSnap = await imageRef.get();
  if (!imageSnap.exists) throw new Error("addItemToListService: image not found - " + imageId);
  const imageData = imageSnap.data();
  const targetLang = imageData.targetLang;

  const wordRef = db.collection("words").doc(wordId);
  const wordSnap = await wordRef.get();
  if (!wordSnap.exists) throw new Error("addItemToListService: Word not found - " + wordId);
  const wordData = wordSnap.data();

  const listRef = userRef.collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (!listSnap.exists) throw new Error("addItemToListService: List not found - " + listId);

  const langListId = `lang_list_${targetLang}_${uid}`;
  const LangListRef = userRef.collection("lists").doc(langListId);
  let LangListSnap = await LangListRef.get();
  // If the language list doesn't exist, create it and re-read the ref
  if (!LangListSnap.exists) {
    await createUserLangListService(uid, targetLang);
    LangListSnap = await LangListRef.get();
  }

  // check if the item already exists in the list
  const itemRef = listRef.collection("items").doc(wordId);
  const itemSnap = await itemRef.get();
  const langItemRef = LangListRef.collection("items").doc(wordId);
  const langItemSnap = await langItemRef.get();
  if (itemSnap.exists && langItemSnap.exists) return { addItemToList_ok: false, message: "Item already exists in the list" };

  // create the item
  const now = new Date().toISOString();
  const itemDoc = {
    wordId: wordId,
    originalWord: wordData.originalWord,
    translatedWord: wordData.translations[targetLang],
    translatedLang: targetLang,
    imageId: imageId,
    note: " ",
    addedAt: now,
  };

  // add to the user-defined list
  console.log("Adding item to list: ", wordId, " - listId: ", listId);
  await itemRef.set(itemDoc);
  console.log("Item added to list.");
  const listWordCount = listSnap.data().wordCount || 0;
  const updateWordCountList = listWordCount + 1;
  console.log("list word count: ", listWordCount, " - updated: ", updateWordCountList);
  // update wordCount in list
  await listRef.update({
    wordCount: updateWordCountList,
    updatedAt: now
  });
  console.log("List wordCount updated.");

  // also add to the user language list
  console.log("Adding item to language list: ", wordId, " - listId: ", langListId);
  await langItemRef.set(itemDoc);
  console.log("Item added to language list.");
  const langListWordCount = LangListSnap.data().wordCount || 0;
  const updateWordCountLangList = langListWordCount + 1;
  console.log("language list word count: ", langListWordCount, " - updated: ", updateWordCountLangList);
  // update wordCount in language list
  await LangListRef.update({
    wordCount: updateWordCountLangList,
    updatedAt: now
  });
  console.log("Language list wordCount updated.");

  return { addItemToList_ok: true, ...itemDoc };
}// end addItemToListService

export async function removeItemFromListService(uid, listId, wordId) {
  if (!uid) throw new Error("removeItemFromListService: uid is required");
  if (!listId) throw new Error("removeItemFromListService: listId is required");
  if (!wordId) throw new Error("removeItemFromListService: wordId is required");

  // preliminary check to ensure user exists
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error("removeItemFromListService: User not found");

  const wordRef = db.collection("words").doc(wordId);
  const wordSnap = await wordRef.get();
  if (!wordSnap.exists) throw new Error("removeItemFromListService: Word not found - " + wordId);
  const wordData = wordSnap.data();

  const listRef = userRef.collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (!listSnap.exists) throw new Error("removeItemFromListService: List not found - " + listId);

  const itemRef = userRef.collection("lists").doc(listId).collection("items").doc(wordId);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) throw new Error("removeItemFromListService: Item not found in list");

  await itemRef.delete();
  console.log("Removed item from list: ", wordId, " - listId: ", listId);

  // update wordCount in list
  const now = new Date().toISOString();
  await listRef.update({
    wordCount: admin.firestore.FieldValue.increment(-1),
    updatedAt: now
  });
  console.log("List wordCount updated.");

  return { removeItemFromList_ok: true };
}// end removeItemFromListService

export async function updateListService(uid, listId, listName, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = 0) {
  if (!uid) throw new Error("updateListService: uid is required");
  if (!listId) throw new Error("updateListService: listId is required");
  if (!listName) throw new Error("updateListService: listName is required");

  const listRef = db.collection("users").doc(uid).collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (!listSnap.exists) throw new Error("updateListService: List not found - " + listId);

  // If buffer provided, convert to base64
  let base64 = imageBase64;
  let mime = imageMimeType;
  let size = imageSizeBytes;

  if (fileBuffer) {
    base64 = bufferToBase64(fileBuffer);
    // caller should provide mime + size via req.file; but if not, leave mime null
    size = fileBuffer.length;
  }

  const update = {};
  // If listName is provided (even empty string), set it; otherwise leave unchanged
  if (typeof listName !== "undefined") {
    update.listName = listName;
  }

  // Always update image fields: if neither fileBuffer nor imageBase64 provided, clear image fields
  if (fileBuffer || imageBase64) {
    update.imageBase64 = base64 || null;
    update.imageMimeType = mime || null;
    update.imageSizeBytes = size || 0;
  }

  const now = new Date().toISOString();
  await listRef.set({ ...update, updatedAt: now }, { merge: true });
  return { updateList_ok: true, updatedAt: now, listId };
} // end updateListService

export async function createSharedListCodeService(uid, listId) {
  if (!uid) throw new Error("createSharedListCodeService: uid is required");
  if (!listId) throw new Error("createSharedListCodeService: listId is required");
  // ensure list exists
  const listRef = db.collection("users").doc(uid).collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (!listSnap.exists) throw new Error("createSharedListCodeService: List not found");

  // Generate a short random token (base64url) to use as shared code
  const token = crypto.randomBytes(6).toString("base64url");

  if (!token) throw new Error("createSharedListCodeService: Unable to generate unique shared token");

  // Build share URL 
  const baseUrl = process.env.APP_BASE_URL || null;
  const sharePath = `/shared/list/${token}`;
  const shareUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}${sharePath}` : sharePath;

  const now = new Date().toISOString();
  // Mark list as public and persist shared code
  const sharedId = `share_${token}_${listId}`;
  const sharedDoc = {
    sharedId: sharedId,
    sharedCode: token,
    shareURL: shareUrl,
    ownerId: uid,
    listId: listId,
    createdAt: now,
  }
  console.log("Creating shared list code: ", sharedId);
  await db.collection("sharedLists").doc(sharedId).set(sharedDoc);
  console.log("Shared list code created.");
  await listRef.update({ visibility: "public", updatedAt: now });
  console.log("List visibility updated to public.");

  return { createSharedListCode_ok: true, ...sharedDoc };
} // end createSharedListCodeService

export async function getSharedListService(sharedCode) {
  if (!sharedCode) throw new Error("getSharedListService: sharedCode is required");

  let uid = null;
  let listId = null;
  let listSnap = null;
  let listRef = null;

  const shared = await db.collection("sharedLists").where("sharedCode", "==", sharedCode).limit(1).get();
  if (shared.empty) throw new Error("getSharedListService: Shared list not found");
  const sharedData = shared.docs[0].data();
  listSnap = shared.docs[0];
  listId = sharedData.listId;
  uid = sharedData.ownerId;
  // derive uid from path users/{uid}/lists/{listId}
  const parts = shared.docs[0].ref.path.split("/");
  uid = parts.length >= 2 ? parts[1] : null;
  listRef = db.collection("users").doc(uid).collection("lists").doc(listId);

  if (!listSnap.exists) throw new Error("getSharedListService: List not found");

  const listData = listSnap.data();
  // enforce public visibility
  /*
    if (!listData || listData.visibility !== "public") {
      throw new Error("getSharedListService: List is not public");
    }
  */

  const itemsSnap = await listRef.collection("items").get();
  const items = itemsSnap.docs.map(d => ({ itemId: d.id, ...d.data() }));

  return { getSharedList_ok: true, ownerId: uid, listId, list: { id: listId, ...listData }, items };
} // end getSharedListService

export async function importSharedListService(uid, sharedCode) {
  if (!uid) throw new Error("importSharedListService: uid is required");
  if (!sharedCode) throw new Error("importSharedListService: code is required");
  const shared = await getSharedListService(sharedCode);
  const { list, items, listId, ownerId } = shared;

  const newListId = `import_${listId}`;
  const newListRef = db.collection("users").doc(uid).collection("lists").doc(newListId);

  // create the new list
  const now = new Date().toISOString();
  await newListRef.set({
    listId: newListId,
    listName: (list.listName || "Imported List") + " (Imported)",
    description: list.description || " ",
    listLanguage: list.listLanguage || [],
    isDefault: false,
    visibility: list.visibility || "private",
    importedFrom: ownerId,
    imported: true,
    importedAt: now,
    updatedAt: now,
    wordCount: items.length
  });

  // copy items
  const batch = db.batch();
  items.forEach(item => {
    const newItemRef = newListRef.collection("items").doc(item.wordId);
    batch.set(newItemRef, item);
  });
  await batch.commit();

  return { importList_ok: true, importedListId: newListId, count: items.length };
}// end importSharedListService