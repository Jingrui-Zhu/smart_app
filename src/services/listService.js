// src/services/listService.js
import { db, admin } from "../config/firebase.js";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "./cloudinaryService.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

/*
function bufferToBase64(buf) {
  return buf.toString("base64");
}
*/
// Helper function to add cover image to a list
async function addCoverImage(uid, listId, listName, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = null) {

  let uploadResult = null;
  const options = {
    folder: `smart_app/image/${uid}`, // setup folder structure
    resource_type: "image",
    public_id: `cover_image_${listId}`, // set public_id to imageId for easier management
    // automatic image resizing and optimization
    transformation: [{
      quality: "auto",
      fetch_format: "auto"
    }]
  }

  // upload to Cloudinary
  if (fileBuffer) {
    uploadResult = await uploadImageToCloudinary(fileBuffer, options);
  } else if (imageBase64) {
    // convert base64 string to buffer
    const buffer = Buffer.from(imageBase64, "base64");
    uploadResult = await uploadImageToCloudinary(buffer, options);
  }

  // update list with cover image info if uploaded
  if (uploadResult !== null) {
    const listUpdate = {
      coverImage: {
        imageMimeType: imageMimeType,
        imageUrl: uploadResult ? uploadResult.secure_url : null,
        cloudinaryPublicId: uploadResult ? uploadResult.public_id : null, // this should be the same as imageId
        imageSizeBytes: uploadResult ? uploadResult.bytes : imageSizeBytes,
      }
    };
    console.log("Store list cover image: ", listName, " - ", listId, " - ", listUpdate.coverImage.imageUrl);
    await db.collection("users").doc(uid).collection("lists").doc(listId).set(listUpdate, { merge: true });
    console.log("User list cover images inserted.");
    return { message: "addCoverImage: Cover image added", ...listUpdate };
  } else {
    console.log("addCoverImage: something went wrong :( ");
    return { message: "addCoverImage: something went wrong :(" };
  }
} // end addCoverImage

export async function createUserListService(uid, listName, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = null) {
  if (!uid) throw new Error("createUserListService: uid is required");
  if (!listName) throw new Error("createUserListService: listName is required");

  // preliminary check to ensure user exists
  const userDocSnap = await db.collection("users").doc(uid).get();
  if (!userDocSnap.exists) throw new Error("createUserListService: User not found");

  // check if list with same name already exists
  const listId = `${listName.toLowerCase().replace(/\s+/g, "_")}_${uid}`;
  const listRef = db.collection("users").doc(uid).collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (listSnap.exists) throw new Error("createUserListService: List with same name already exists");

  const now = new Date().toISOString();
  const listDoc = {
    listId: listId,
    listName: listName,
    isDefault: false,
    visibility: "private",
    imported: false,
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
  };
  console.log("Store list data: ", listName, " - ", listId);
  await listRef.set(listDoc);
  console.log("User list inserted.");

  // add cover image if provided
  let listUpdate = null;
  if (fileBuffer || imageBase64) {
    listUpdate = await addCoverImage(uid, listId, listName, fileBuffer, imageBase64, imageMimeType, imageSizeBytes);
  }

  return { createUserList_ok: true, ...listDoc, coverImage: listUpdate ? listUpdate.coverImage : null };
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

  // Delete all items in the list
  const itemsSnap = await listRef.collection("items").get();
  const batch = db.batch();
  itemsSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log("Deleted items in list for user: ", uid, " - listId: ", listId);

  // Delete cover image from Cloudinary if exists
  const listData = listSnap.data();
  if (listData.coverImage && listData.coverImage.cloudinaryPublicId) {
    await deleteImageFromCloudinary(listData.coverImage.cloudinaryPublicId);
  }

  const sharedListRef = db.collection("sharedLists");
  const sharedListSnap = await sharedListRef.where("ownerId", "==", uid).where("listId", "==", listId).get();
  const sharedListData = sharedListSnap.docs.length > 0 ? sharedListSnap.docs[0] : null;
  if (sharedListData !== null) {
    await sharedListData.ref.update({ isDeleted: true });
    console.log("Marked shared lists as deleted for user: ", uid, " - listId: ", listId);
  }
  // Mark shared list as deleted

  // Delete the list itself
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
  const message = "Retrieved " + items.length + " items from list.";

  // Dynamically update wordCount in the list document
  await db.collection("users").doc(uid).collection("lists").doc(listId).update({ wordCount: items.length });
  console.log("Updated wordCount for list: ", listId, " to ", items.length);

  return { getAllItemsInList_ok: true, listId, message, items };
}// end getAllItemsInListService

/*
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
*/

// Best-effort: add the same word to multiple lists (up to a small limit)
// Returns per-list results and a summary. This will attempt each list independently
// and will not roll back partial successes.
export async function addItemToMultipleListsService(uid, listIds, wordId, imageId) {
  if (!uid) throw new Error("addItemToMultipleListsService: uid is required");
  if (!listIds) throw new Error("addItemToMultipleListsService: listIds is required");
  if (!wordId) throw new Error("addItemToMultipleListsService: wordId is required");
  if (!imageId) throw new Error("addItemToMultipleListsService: imageId is required");

  // normalize single value to array
  if (!Array.isArray(listIds)) listIds = [listIds];

  // protect from huge requests
  const MAX_LISTS = 5;
  if (listIds.length === 0) throw new Error("addItemToMultipleListsService: listIds must contain at least one id");
  if (listIds.length > MAX_LISTS) throw new Error(`addItemToMultipleListsService: too many lists (max ${MAX_LISTS})`);

  // validate user + image + word once
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error("addItemToMultipleListsService: User not found");

  const imageRef = userRef.collection("images").doc(imageId);
  const imageSnap = await imageRef.get();
  if (!imageSnap.exists) throw new Error("addItemToMultipleListsService: image not found - " + imageId);
  const imageData = imageSnap.data();
  const targetLang = imageData.targetLang;
  const imageUrl = imageData.imageUrl;
  const x = imageData.x || 0;
  const y = imageData.y || 0;
  const width = imageData.width || 0;
  const height = imageData.height || 0;

  const wordRef = db.collection("words").doc(wordId);
  const wordSnap = await wordRef.get();
  if (!wordSnap.exists) throw new Error("addItemToMultipleListsService: Word not found - " + wordId);
  const wordData = wordSnap.data();

  // ensure language list exists (create if missing)
  const langListId = `lang_list_${targetLang}_${uid}`;
  const LangListRef = userRef.collection("lists").doc(langListId);
  let LangListSnap = await LangListRef.get();
  if (!LangListSnap.exists) {
    await createUserLangListService(uid, targetLang);
    LangListSnap = await LangListRef.get();
  }

  const now = new Date().toISOString();
  // contains the per-list storage results
  const results = [];
  let langItemAdded = false;

  // Add language item once if missing
  const langItemRef = LangListRef.collection("items").doc(wordId);
  const langItemSnap = await langItemRef.get();
  if (!langItemSnap.exists) {
    try {
      await langItemRef.set({
        wordId,
        originalWord: wordData.originalWord,
        translatedWord: wordData.translations[targetLang],
        translatedLang: targetLang,
        imageId,
        imageUrl,
        x,
        y,
        width,
        height,
        addedAt: now,
      });
      const langListWordCount = LangListSnap.data().wordCount || 0;
      const updateWordCountLangList = langListWordCount + 1;
      await LangListRef.update({ wordCount: updateWordCountLangList, updatedAt: now });
      langItemAdded = true;
      console.log("Item added to language list.");
    } catch (err) {
      // record but continue; language list failure shouldn't block per-list attempts
      console.error("Failed to add item to language list:", err);
    }
  }

  // iterate target lists and attempt add
  for (const lid of listIds) {
    try {
      const listRef = userRef.collection("lists").doc(lid);
      const listSnap = await listRef.get();
      if (!listSnap.exists) {
        results.push({ listId: lid, ok: false, message: "List not found" });
        continue;
      }

      const itemRef = listRef.collection("items").doc(wordId);
      const itemSnap = await itemRef.get();
      if (itemSnap.exists) {
        results.push({ listId: lid, ok: false, message: "Item already exists" });
        continue;
      }

      // create the item in the list
      await itemRef.set({
        wordId,
        originalWord: wordData.originalWord,
        translatedWord: wordData.translations[targetLang],
        translatedLang: targetLang,
        imageId,
        imageUrl,
        addedAt: now,
      });

      // increment list counter
      const listWordCount = listSnap.data().wordCount || 0;
      const updateWordCountList = listWordCount + 1;
      await listRef.update({ wordCount: updateWordCountList, updatedAt: now });
      results.push({ listId: lid, ok: true });
    } catch (err) {
      console.error(`Failed to add item to list ${lid}:`, err);
      results.push({ listId: lid, ok: false, message: err.message || "Failed to add item" });
    }
  }

  const successCount = results.filter(r => r.ok).length;
  return { addItemToMultipleLists_ok: true, results, summary: { successCount, failedCount: results.length - successCount, langItemAdded } };
} // end addItemToMultipleListsService


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

  return { removeItemFromList_ok: true, listId, wordId };
}// end removeItemFromListService

export async function updateListService(uid, listId, listName, fileBuffer = null, imageBase64 = null, imageMimeType = null, imageSizeBytes = 0, removeImageFlag = false) {
  if (!uid) throw new Error("updateListService: uid is required");
  if (!listId) throw new Error("updateListService: listId is required");
  //if (!listName) throw new Error("updateListService: listName is required");

  const listRef = db.collection("users").doc(uid).collection("lists").doc(listId);
  const listSnap = await listRef.get();
  if (!listSnap.exists) throw new Error("updateListService: List not found - " + listId);
  const listData = listSnap.data();

  const update = {};
  let listUpdate = null;

  // If listName is provided (even empty string), set it; otherwise leave unchanged
  if (typeof listName !== "undefined") {
    update.listName = listName;
  }

  if (removeImageFlag) {
    console.log("updateListService: removeImageFlag is set to true, removing cover image.");
    if (listData.coverImage && listData.coverImage.cloudinaryPublicId) {
      await deleteImageFromCloudinary(listData.coverImage.cloudinaryPublicId);
    }
    update.coverImage = null;
  } else if (fileBuffer || imageBase64) {
    listUpdate = await addCoverImage(uid, listId, listName, fileBuffer, imageBase64, imageMimeType, imageSizeBytes);
    update.coverImage = listUpdate.coverImage ? listUpdate.coverImage : listData.coverImage;
    console.log("updateListService: cover image updated.");
    if (listData.coverImage && listData.coverImage.cloudinaryPublicId) {
      await deleteImageFromCloudinary(listData.coverImage.cloudinaryPublicId);
      console.log("updateListService: removed old cover image.");
    }
  }

  const now = new Date().toISOString();
  await listRef.set({ ...update, updatedAt: now }, { merge: true });
  return { updateList_ok: true, updatedAt: now, listId, update };
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
  const sharedId = `share_${token}_${listId}`;
  const sharedDoc = {
    sharedId: sharedId,
    sharedCode: token,
    shareURL: shareUrl,
    ownerId: uid,
    listId: listId,
    isDeleted: false,
    createdAt: now,
  }
  console.log("Creating shared list code: ", sharedId);
  await db.collection("sharedLists").doc(sharedId).set(sharedDoc);
  console.log("Shared list code created.");
  // Mark list as public and persist shared code
  await listRef.update({ visibility: "public", updatedAt: now });
  console.log("List visibility updated to public.");

  return { createSharedListCode_ok: true, ...sharedDoc };
} // end createSharedListCodeService

export async function getSharedListService(sharedCode) {
  if (!sharedCode) throw new Error("getSharedListService: sharedCode is required");

  // don't know how to decypher ownerId and listId from sharedCode alone without querying the whole collection
  /*
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
  //
  //  if (!listData || listData.visibility !== "public") {
  //    throw new Error("getSharedListService: List is not public");
  //  }
  //

  // get items in the list
  const itemsSnap = await listRef.collection("items").get();
  const items = itemsSnap.docs.map(d => ({ ...d.data() }));
  */

  // temporarily workaround by querying sharedLists collection
  const shared = await db.collection("sharedLists").where("sharedCode", "==", sharedCode).limit(1).get();
  if (shared.empty) throw new Error("getSharedListService: Shared list not found");
  const sharedData = shared.docs[0].data();
  if (sharedData.isDeleted) {
    return { getSharedList_ok: false, message: "getSharedListService: Shared list has been deleted", ...sharedData };
  }
  const uid = sharedData.ownerId;
  const listId = sharedData.listId;
  const listSnap = await db.collection("users").doc(uid).collection("lists").doc(listId).get();
  const listData = listSnap.data();
  const itemsSnap = await db.collection("users").doc(uid).collection("lists").doc(listId).collection("items").get();
  const items = itemsSnap.docs.map(d => ({ ...d.data() }));

  return { getSharedList_ok: true, sharedList: { ...sharedData }, list: { ...listData }, items: items };
} // end getSharedListService

export async function importSharedListService(uid, sharedCode) {
  if (!uid) throw new Error("importSharedListService: uid is required");
  if (!sharedCode) throw new Error("importSharedListService: code is required");
  const shared = await getSharedListService(sharedCode);
  const { sharedList, list, items } = shared;
  const ownerId = sharedList.ownerId;
  const listId = sharedList.listId;

  const newListId = `import_${listId}`;

  // create the new list
  const now = new Date().toISOString();
  const importedData = {
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
  };
  console.log("Creating imported list: ", newListId);
  await db.collection("users").doc(uid).collection("lists").doc(newListId).set(importedData);
  console.log("Imported list created.");

  // add items to the new list
  for (const item of items) {
    const itemRef = db.collection("users").doc(uid).collection("lists").doc(newListId).collection("items").doc(item.wordId);
    console.log("Adding item to imported list: ", item.wordId);
    await itemRef.set(item);
    console.log("Item added to imported list.");
  }

  return { importList_ok: true, importedList: { ...importedData } };
}// end importSharedListService