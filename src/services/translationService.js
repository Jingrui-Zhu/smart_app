// src/services/translationService.js
import { db } from "../config/firebase.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Try to require the iamtraction library
let translate = null;
try {
  // prefer the packaged name; falls back to github name if needed
  translate = require('@iamtraction/google-translate');
} catch (err) {
  try {
    translate = require("google-translate");
  } catch (err2) {
    console.error("Translation library not found. Run: npm i @iamtraction/google-translate");
    throw err2;
  }
}

/**
 * Translate a single text using iamtraction/google-translate
 * @param {string} text
 * @param {string} sourceLang - e.g. 'auto' or 'en'
 * @param {string} targetLang - e.g. 'it'
 * @returns {Promise<{ translatedText: string, detectedSource?: string, raw?: any }>}
 */
export async function translateTextService(text, sourceLang = "auto", targetLang) {
  if (!text) throw new Error("translateTextService: text is required");
  if (!targetLang) throw new Error("translateTextService: targetLang is required");

  // the library expects options { from, to } where 'from' is optional
  const opts = {};
  if (sourceLang && sourceLang !== "auto") {
    opts.from = sourceLang;
  }
  opts.to = targetLang;
  text = text.toLowerCase();
  console.log(`Translating text "${text}" from "${opts.from || 'auto-detect'}" to "${opts.to}"`);

  // library returns a Promise
  const res = await translate(text, opts);
  // The response object: res.text contains translated text; it also returns res.from.language.iso for detected language
  const translatedText = res && (res.text ?? res.translation ?? res.translatedText) ? res.text ?? res.translation ?? res.translatedText : "";
  const detectedSource = res?.from?.language?.iso ?? null;
  const saveTranslatedText = translatedText.toLowerCase();
  console.log(`Translation result: "${saveTranslatedText}" (detected source: "${detectedSource}")`);

  // pronunciation is not always provided by this library; some fields may be in res.raw
  let pronunciation = null;
  if (res?.pronunciation) pronunciation = res.pronunciation;

  return { translated: true, originalWord: text, translatedWord: saveTranslatedText, detectedSource, pronunciation, raw: res };
} // end translateTextService


// create or update a word translation, by setting {merge: true} we can add new translations to existing words
export async function updateTranslationService(originalWord, translatedWord, targetLang) {
  if (!originalWord) throw new Error("updateTranslationService: originalWord is required");
  if (!translatedWord) throw new Error("updateTranslationService: translatedWord is required");
  if (!targetLang) throw new Error("updateTranslationService: targetLang is required");

  const wordId = `id_${originalWord}`;
  const wordDoc = {
    wordId: wordId,
    originalWord: originalWord,
    translations: { [targetLang]: translatedWord },
    //pronunciations: { [targetLang]: pronunciation },
    //curation: { createdBy: userId, source: "user", createdAt: new Date().toISOString(), approved: true }
  };
  console.log("Creating word: ", wordId, " - ", wordDoc.originalWord);
  await db.collection("words").doc(wordId).set(wordDoc, { merge: true });
  console.log("Word inserted.");

  return { updateTranslationService_ok: true, ...wordDoc };
}// end updateTranslationService


// checks if a word and its translation already exist
// function either return false or the existing translation in target language
export async function translationExistsService(originalText, targetLang = "auto") {
  if (!originalText) throw new Error("translationExistsService: originalText is required");

  let existing = null;
  const wordsCollection = db.collection("words");
  let query = await wordsCollection.where("originalText", "==", originalText).limit(1).get();
  if (!query.empty) {
    const doc = query.docs[0];
    const wordId = doc.id;
    const data = doc.data();
    existing = (data.translations && data.translations[targetLang]) ? data.translations[targetLang] : null;
    //const pronunciation = (data.pronunciations && data.pronunciations[targetLang]) ? data.pronunciations[targetLang] : null;
    if (existing !== null) {
      return { translatedWord: existing, wordId: wordId};
    }
  }
  return false;
}// end translationExistsService

