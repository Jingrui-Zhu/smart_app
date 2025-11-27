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

    // if translation already exists, return it
    const exists = await translationService.translationExistsService(originalText, targetLang);
    console.log("Translation exists for target language:", exists);

    // if translation in target language exists, return it
    if (exists) {
      return res.json({ ok: true, existed: true, message: "Translation exists", wordId: exists.wordId, originalText: originalText, translatedText: exists.existing, targetLang: targetLang });
    }

    // otherwise, perform translation
    const translatedTargetLangResult = await translationService.translateTextService(originalText, "auto", targetLang);
    console.log("translated to target language:", translatedTargetLangResult);

    // save the translation
    await translationService.updateTranslationService(originalText, translatedTargetLangResult.translatedText, targetLang);
    console.log("translation saved to database.");

    return res.json({ ok: true, originalText: originalText, translatedText: translatedTargetLangResult.translatedText, targetLang: targetLang });

  } catch (error) {
    console.error("translateText error:", error);
    res.json({ ok: false, "translateText error": error.message });
  }
}
