// src/controllers/translationController.js
import * as translationService from "../services/translationService.js";

// the translation controller will not be used outside of testing purposes
export const translateText = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { originalText, targetLang } = req.body;
    if (!originalText || !targetLang) {
      return res.json({ error: "originalText and targetLang are required" });
    }

    // if translation in target language exists, return it
    const exists = await translationService.translationExistsService(originalText, targetLang);
    if (exists) {
      console.log("Translation exists for target language:", originalText);
      return res.json({ exists: true, message: "Translation exists", wordId: exists.wordId, originalText: originalText, translatedWord: exists.translatedWord, targetLang: targetLang });
    }

    // otherwise, perform translation
    const translatedTargetLangResult = await translationService.translateTextService(originalText, "auto", targetLang);
    console.log("translated to target language:", translatedTargetLangResult);
    const translatedWord = translatedTargetLangResult.translatedWord;

    // save the translation
    const result = await translationService.updateTranslationService(originalText, translatedWord, targetLang);
    console.log("translation saved to database.");

    return res.json({ message: "Translation successful", ...result });

  } catch (error) {
    console.error("translateText error:", error);
    res.json({ ok: false, "translateText error": error.message });
  }
}
