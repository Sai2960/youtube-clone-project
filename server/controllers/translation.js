// server/controllers/translation.js - FIXED WITH DATA MIGRATION
import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import axios from "axios";
import * as cheerio from "cheerio";

const detectLanguage = (text) => {
  if (!text || text.trim().length === 0) return 'en';
  const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  if (/[\u4e00-\u9fff]/.test(cleanText)) return 'zh-CN';
  if (/[\u0600-\u06FF]/.test(cleanText)) return 'ar';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(cleanText)) return 'ja';
  if (/[\uac00-\ud7af]/.test(cleanText)) return 'ko';
  if (/[\u0900-\u097f]/.test(cleanText)) return 'hi';
  if (/[а-яёА-ЯЁ]/.test(cleanText)) return 'ru';
  if (/[ğĞıİöÖüÜşŞçÇ]/.test(cleanText)) return 'tr';
  if (/[äöüÄÖÜß]/.test(cleanText)) return 'de';
  if (/[àâäæçéèêëïîôùûüÿœ]/i.test(cleanText)) return 'fr';
  if (/[áéíóúñü¿¡]/i.test(cleanText)) return 'es';
  if (/[ãõâêôç]/i.test(cleanText)) return 'pt';
  if (/[àèéìíòóùú]/i.test(cleanText)) return 'it';
  
  return 'en';
};

const normalizeLanguageCode = (code) => {
  if (!code) return 'en';
  const lowerCode = code.toLowerCase().trim();
  
  const map = {
    'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'chinese': 'zh-CN',
    'zh-tw': 'zh-TW', 'pt': 'pt', 'pt-br': 'pt', 'portuguese': 'pt',
    'en': 'en', 'english': 'en', 'es': 'es', 'spanish': 'es',
    'fr': 'fr', 'french': 'fr', 'de': 'de', 'german': 'de',
    'it': 'it', 'italian': 'it', 'ja': 'ja', 'japanese': 'ja',
    'ko': 'ko', 'korean': 'ko', 'ar': 'ar', 'arabic': 'ar',
    'hi': 'hi', 'hindi': 'hi', 'ru': 'ru', 'russian': 'ru',
    'nl': 'nl', 'dutch': 'nl', 'tr': 'tr', 'turkish': 'tr',
    'pl': 'pl', 'sv': 'sv', 'no': 'no', 'da': 'da',
    'fi': 'fi', 'el': 'el', 'he': 'he', 'th': 'th',
    'vi': 'vi', 'id': 'id', 'ro': 'ro', 'cs': 'cs',
    'uk': 'uk', 'bg': 'bg', 'hr': 'hr', 'sk': 'sk',
    'sl': 'sl', 'lt': 'lt', 'lv': 'lv', 'et': 'et',
    'fa': 'fa', 'ur': 'ur', 'bn': 'bn', 'ta': 'ta'
  };
  
  return map[lowerCode] || lowerCode;
};

const translateWithGoogleWebsite = async (text, sourceLang, targetLang) => {
  try {
    const sl = sourceLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    const tl = targetLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    
    const url = 'https://translate.google.com/m';
    const params = new URLSearchParams({
      sl: sl,
      tl: tl,
      q: text
    });
    
    const response = await axios.get(`${url}?${params.toString()}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://translate.google.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    let translation = $('.result-container').text().trim();
    
    if (!translation) {
      translation = $('div.t0').text().trim();
    }
    
    if (!translation) {
      translation = $('.translation').text().trim();
    }
    
    if (!translation) {
      const patterns = [
        /<div class="result-container"[^>]*>(.*?)<\/div>/is,
        /<div class="t0"[^>]*>(.*?)<\/div>/is,
        /class="result-container"[^>]*>(.*?)<\/div>/is
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          translation = match[1]
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
          
          if (translation) break;
        }
      }
    }
    
    if (translation && translation.length > 0 && translation !== text) {
      console.log(`   ✅ Google Website Scrape: "${translation}"`);
      return translation;
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ Google Website failed: ${error.message}`);
    return null;
  }
};

const translateWithGoogleAPIv1 = async (text, sourceLang, targetLang) => {
  try {
    const sl = sourceLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    const tl = targetLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    
    const url = 'https://translate.googleapis.com/translate_a/single';
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sl,
      tl: tl,
      dt: 't',
      dj: '1',
      source: 'input',
      q: text
    });
    
    const response = await axios.get(`${url}?${params.toString()}`, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });
    
    if (response.data?.sentences) {
      const translation = response.data.sentences
        .filter(s => s.trans)
        .map(s => s.trans)
        .join('')
        .trim();
      
      if (translation && translation !== text) {
        console.log(`   ✅ Google API v1: "${translation}"`);
        return translation;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ Google API v1 failed: ${error.message}`);
    return null;
  }
};

const translateWithGoogleAPIv2 = async (text, sourceLang, targetLang) => {
  try {
    const sl = sourceLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    const tl = targetLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    
    const url = 'https://translate.googleapis.com/translate_a/single';
    const params = {
      client: 'gtx',
      sl: sl,
      tl: tl,
      dt: 't',
      q: text
    };
    
    const response = await axios.get(url, {
      params,
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });
    
    if (response.data && Array.isArray(response.data) && response.data[0]) {
      const translations = response.data[0];
      
      if (Array.isArray(translations)) {
        const translation = translations
          .filter(item => item && item[0])
          .map(item => item[0])
          .join('')
          .trim();
        
        if (translation && translation !== text) {
          console.log(`   ✅ Google API v2: "${translation}"`);
          return translation;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ Google API v2 failed: ${error.message}`);
    return null;
  }
};

const translateWithIamtraction = async (text, sourceLang, targetLang) => {
  try {
    const googleTranslate = await import('@iamtraction/google-translate');
    const translate = googleTranslate.default;
    
    const sl = sourceLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    const tl = targetLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
    
    const result = await translate(text, { from: sl, to: tl });
    
    if (result && result.text && result.text !== text) {
      console.log(`   ✅ @iamtraction/google-translate: "${result.text}"`);
      return result.text;
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ @iamtraction failed: ${error.message}`);
    return null;
  }
};

const translateWithLingva = async (text, sourceLang, targetLang) => {
  const instances = [
    'https://lingva.ml',
    'https://translate.igna.rocks',
    'https://lingva.garudalinux.org'
  ];
  
  const sl = sourceLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
  const tl = targetLang.replace('zh-CN', 'zh').replace('zh-TW', 'zh');
  
  for (const instance of instances) {
    try {
      const url = `${instance}/api/v1/${sl}/${tl}/${encodeURIComponent(text)}`;
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });
      
      if (response.data?.translation && response.data.translation !== text) {
        console.log(`   ✅ Lingva: "${response.data.translation}"`);
        return response.data.translation;
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
};

const translateText = async (text, sourceLang, targetLang) => {
  try {
    if (!text || text.trim().length === 0) return text;

    const normalizedSource = normalizeLanguageCode(sourceLang);
    const normalizedTarget = normalizeLanguageCode(targetLang);

    console.log(`\n🔤 Translation:`);
    console.log(`   Input: "${text}"`);
    console.log(`   ${normalizedSource} → ${normalizedTarget}`);

    if (normalizedSource === normalizedTarget) {
      console.log(`   ⚠️ Same language`);
      return text;
    }

    let translation = null;
    
    console.log(`   🔄 [1/5] Google Website Scraper...`);
    translation = await translateWithGoogleWebsite(text, normalizedSource, normalizedTarget);
    if (translation) return translation;

    console.log(`   🔄 [2/5] Google API v1...`);
    translation = await translateWithGoogleAPIv1(text, normalizedSource, normalizedTarget);
    if (translation) return translation;

    console.log(`   🔄 [3/5] Google API v2...`);
    translation = await translateWithGoogleAPIv2(text, normalizedSource, normalizedTarget);
    if (translation) return translation;

    console.log(`   🔄 [4/5] @iamtraction/google-translate...`);
    translation = await translateWithIamtraction(text, normalizedSource, normalizedTarget);
    if (translation) return translation;

    console.log(`   🔄 [5/5] Lingva...`);
    translation = await translateWithLingva(text, normalizedSource, normalizedTarget);
    if (translation) return translation;

    console.log(`   ❌ All methods failed`);
    return text;

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return text;
  }
};

/**
 * 🔥 FIXED: Ensures translations field is always an array before updating
 */
export const translateComment = async (req, res) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 TRANSLATION REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Comment ID: ${req.params.id}`);
  console.log(`🎯 Target: ${req.body.targetLanguage}`);

  try {
    const { id: commentId } = req.params;
    const { targetLanguage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid comment ID" 
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        success: false, 
        message: "Target language required" 
      });
    }

    const normalizedTarget = normalizeLanguageCode(targetLanguage);
    
    // Get the raw document to check translations field type
    const commentDoc = await comment.findById(commentId).lean();

    if (!commentDoc) {
      return res.status(404).json({ 
        success: false, 
        message: "Comment not found" 
      });
    }

    // 🔥 FIX: Ensure translations is an array before proceeding
    if (commentDoc.translations && !Array.isArray(commentDoc.translations)) {
      console.log('⚠️ Fixing translations field - converting object to array');
      await comment.updateOne(
        { _id: commentId },
        { $set: { translations: [] } }
      );
      commentDoc.translations = [];
    }

    // Ensure translations exists as an array
    if (!commentDoc.translations) {
      commentDoc.translations = [];
    }

    const sourceText = commentDoc.originalText || commentDoc.commentbody || commentDoc.text;
    const sourceLang = commentDoc.originalLanguage || detectLanguage(sourceText) || 'en';
    const normalizedSource = normalizeLanguageCode(sourceLang);
    
    console.log(`📄 Text: "${sourceText}"`);
    console.log(`🔍 From: ${normalizedSource}`);

    // Check cache
    const cachedTranslation = commentDoc.translations.find(
      t => t && normalizeLanguageCode(t.language) === normalizedTarget
    );

    if (cachedTranslation) {
      console.log('⚡ CACHE HIT');
      console.log(`📝 "${cachedTranslation.text}"`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return res.status(200).json({
        success: true,
        translatedText: cachedTranslation.text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLanguage,
        fromCache: true,
        provider: 'cache'
      });
    }

    console.log('💾 Cache miss');

    if (normalizedSource === normalizedTarget) {
      console.log('⚠️ Same language');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return res.status(200).json({
        success: true,
        translatedText: sourceText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLanguage,
        fromCache: false,
        provider: 'none'
      });
    }

    // Translate
    console.log('🔄 Translating...');
    const translatedText = await translateText(sourceText, normalizedSource, normalizedTarget);
    console.log(`✅ Result: "${translatedText}"`);

    // Save translation using $push
    await comment.updateOne(
      { _id: commentId },
      { 
        $push: { 
          translations: {
            language: targetLanguage,
            text: translatedText,
            translatedAt: new Date()
          }
        },
        $set: {
          originalText: sourceText,
          originalLanguage: sourceLang
        }
      }
    );
    
    console.log('💾 Cached');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return res.status(200).json({
      success: true,
      translatedText: translatedText,
      sourceLanguage: sourceLang,
      targetLanguage: targetLanguage,
      fromCache: false,
      provider: 'google-translate'
    });

  } catch (error) {
    console.error('❌ ERROR:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(500).json({
      success: false,
      message: "Translation failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const detectCommentLanguage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Text required" });
    }
    
    const detectedLang = detectLanguage(text);
    const normalizedLang = normalizeLanguageCode(detectedLang);
    
    return res.status(200).json({ 
      success: true, 
      detectedLanguage: detectedLang,
      normalizedLanguage: normalizedLang,
      text: text
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Detection failed" });
  }
};

export const batchTranslateComments = async (req, res) => {
  try {
    const { commentIds, targetLanguage } = req.body;
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ success: false, message: "Comment IDs required" });
    }
    
    if (!targetLanguage) {
      return res.status(400).json({ success: false, message: "Target language required" });
    }

    if (commentIds.length > 50) {
      return res.status(400).json({ success: false, message: "Max 50 per batch" });
    }

    console.log(`\n📦 BATCH: ${commentIds.length} → ${targetLanguage}`);

    const results = await Promise.allSettled(
      commentIds.map(async (id) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid ID');
          
          const doc = await comment.findById(id).lean();
          if (!doc) throw new Error('Not found');
          
          // Fix translations field if needed
          if (doc.translations && !Array.isArray(doc.translations)) {
            await comment.updateOne(
              { _id: id },
              { $set: { translations: [] } }
            );
            doc.translations = [];
          }
          
          const text = doc.originalText || doc.commentbody || doc.text;
          const lang = doc.originalLanguage || detectLanguage(text) || 'en';
          const translatedText = await translateText(text, lang, targetLanguage);
          
          // Use updateOne with $push
          await comment.updateOne(
            { _id: id },
            {
              $push: {
                translations: {
                  language: targetLanguage,
                  text: translatedText,
                  translatedAt: new Date()
                }
              },
              $set: {
                originalText: text,
                originalLanguage: lang
              }
            }
          );
          
          return {
            commentId: id,
            originalText: text,
            translatedText: translatedText,
            sourceLanguage: lang,
            success: true
          };
        } catch (err) {
          return { commentId: id, error: err.message, success: false };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).map(r => r.value || { error: 'Unknown' });

    console.log(`✅ ${successful.length}/${commentIds.length} done`);

    return res.status(200).json({
      success: true,
      results: successful,
      failed: failed,
      totalProcessed: commentIds.length,
      successfulCount: successful.length,
      failedCount: failed.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Batch failed" });
  }
};

/**
 * 🔧 UTILITY: Fix all comments with invalid translations field
 * Call this once to migrate existing data
 */
export const fixAllTranslationsFields = async (req, res) => {
  try {
    console.log('🔧 Starting translations field migration...');
    
    // Find all comments where translations is not an array
    const commentsToFix = await comment.find({
      translations: { $exists: true, $not: { $type: 'array' } }
    });
    
    console.log(`📊 Found ${commentsToFix.length} comments to fix`);
    
    let fixed = 0;
    for (const doc of commentsToFix) {
      await comment.updateOne(
        { _id: doc._id },
        { $set: { translations: [] } }
      );
      fixed++;
    }
    
    console.log(`✅ Fixed ${fixed} comments`);
    
    return res.status(200).json({
      success: true,
      message: `Fixed ${fixed} comments`,
      totalProcessed: commentsToFix.length
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
};