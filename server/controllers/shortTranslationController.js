// server/controllers/shortTranslationController.js - ENHANCED ACCURACY VERSION
import Short from '../Modals/short.js';
import mongoose from 'mongoose';
import axios from 'axios';
import * as cheerio from 'cheerio';

// ==========================================
// LANGUAGE DETECTION (Enhanced)
// ==========================================
const detectLanguage = (text) => {
  if (!text || text.trim().length === 0) return 'en';
  
  // Remove emojis and special characters for better detection
  const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  
  // Count character types
  const charCounts = {
    chinese: (cleanText.match(/[\u4e00-\u9fff]/g) || []).length,
    arabic: (cleanText.match(/[\u0600-\u06FF]/g) || []).length,
    japanese: (cleanText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length,
    korean: (cleanText.match(/[\uac00-\ud7af]/g) || []).length,
    hindi: (cleanText.match(/[\u0900-\u097f]/g) || []).length,
    cyrillic: (cleanText.match(/[а-яёА-ЯЁ]/g) || []).length,
    thai: (cleanText.match(/[\u0E00-\u0E7F]/g) || []).length,
    hebrew: (cleanText.match(/[\u0590-\u05FF]/g) || []).length,
    greek: (cleanText.match(/[\u0370-\u03FF]/g) || []).length
  };
  
  // Use character frequency for better detection
  const totalChars = cleanText.length;
  if (charCounts.chinese / totalChars > 0.3) return 'zh-CN';
  if (charCounts.arabic / totalChars > 0.3) return 'ar';
  if (charCounts.japanese / totalChars > 0.3) return 'ja';
  if (charCounts.korean / totalChars > 0.3) return 'ko';
  if (charCounts.hindi / totalChars > 0.3) return 'hi';
  if (charCounts.cyrillic / totalChars > 0.3) return 'ru';
  if (charCounts.thai / totalChars > 0.2) return 'th';
  if (charCounts.hebrew / totalChars > 0.2) return 'he';
  if (charCounts.greek / totalChars > 0.2) return 'el';
  
  // European language detection based on special characters
  if (/[ğĞıİöÖüÜşŞçÇ]/.test(cleanText)) return 'tr';
  if (/[äöüÄÖÜß]/.test(cleanText) && !/[àâæçéèêëïîôùûüÿœ]/i.test(cleanText)) return 'de';
  if (/[àâäæçéèêëïîôùûüÿœ]/i.test(cleanText)) return 'fr';
  if (/[áéíóúñü¿¡]/i.test(cleanText)) return 'es';
  if (/[ãõâêôç]/i.test(cleanText)) return 'pt';
  if (/[àèéìíòóùú]/i.test(cleanText) && !/[âêô]/i.test(cleanText)) return 'it';
  
  return 'en';
};

// ==========================================
// NORMALIZE LANGUAGE CODES (Enhanced)
// ==========================================
const normalizeLanguageCode = (code) => {
  if (!code) return 'en';
  const lowerCode = code.toLowerCase().trim();
  
  const map = {
    'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'chinese': 'zh-CN', 'cn': 'zh-CN',
    'zh-tw': 'zh-TW', 'tw': 'zh-TW', 'traditional-chinese': 'zh-TW',
    'zh-hk': 'zh-TW', 'hk': 'zh-TW',
    'pt': 'pt', 'pt-br': 'pt', 'portuguese': 'pt', 'pt-pt': 'pt',
    'en': 'en', 'en-us': 'en', 'en-gb': 'en', 'english': 'en',
    'es': 'es', 'spanish': 'es', 'es-es': 'es', 'es-mx': 'es',
    'fr': 'fr', 'french': 'fr', 'fr-fr': 'fr', 'fr-ca': 'fr',
    'de': 'de', 'german': 'de', 'de-de': 'de',
    'it': 'it', 'italian': 'it', 'it-it': 'it',
    'ja': 'ja', 'japanese': 'ja', 'jp': 'ja',
    'ko': 'ko', 'korean': 'ko', 'kr': 'ko',
    'ar': 'ar', 'arabic': 'ar', 'ar-sa': 'ar',
    'hi': 'hi', 'hindi': 'hi', 'in': 'hi',
    'ru': 'ru', 'russian': 'ru', 'ru-ru': 'ru',
    'nl': 'nl', 'dutch': 'nl', 'nl-nl': 'nl',
    'tr': 'tr', 'turkish': 'tr', 'tr-tr': 'tr',
    'pl': 'pl', 'polish': 'pl', 'sv': 'sv', 'swedish': 'sv',
    'no': 'no', 'norwegian': 'no', 'da': 'da', 'danish': 'da',
    'fi': 'fi', 'finnish': 'fi', 'el': 'el', 'greek': 'el',
    'he': 'he', 'hebrew': 'he', 'iw': 'he',
    'th': 'th', 'thai': 'th', 'vi': 'vi', 'vietnamese': 'vi',
    'id': 'id', 'indonesian': 'id', 'ms': 'ms', 'malay': 'ms',
    'ro': 'ro', 'romanian': 'ro', 'cs': 'cs', 'czech': 'cs',
    'uk': 'uk', 'ukrainian': 'uk', 'bg': 'bg', 'bulgarian': 'bg',
    'hr': 'hr', 'croatian': 'hr', 'sk': 'sk', 'slovak': 'sk',
    'sl': 'sl', 'slovenian': 'sl', 'lt': 'lt', 'lithuanian': 'lt',
    'lv': 'lv', 'latvian': 'lv', 'et': 'et', 'estonian': 'et',
    'fa': 'fa', 'persian': 'fa', 'ur': 'ur', 'urdu': 'ur',
    'bn': 'bn', 'bengali': 'bn', 'ta': 'ta', 'tamil': 'ta'
  };
  
  return map[lowerCode] || lowerCode;
};

// ==========================================
// HTML ENTITY DECODER
// ==========================================
const decodeHTMLEntities = (text) => {
  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&cent;': '¢',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®'
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Decode numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return decoded;
};

// ==========================================
// TRANSLATION METHOD 1: Google Translate API (Most Reliable)
// ==========================================
const translateWithGoogleAPI = async (text, sourceLang, targetLang) => {
  try {
    const sl = sourceLang === 'zh-CN' || sourceLang === 'zh-TW' ? 'zh' : sourceLang;
    const tl = targetLang === 'zh-CN' || targetLang === 'zh-TW' ? 'zh' : targetLang;
    
    const url = 'https://translate.googleapis.com/translate_a/single';
    const params = {
      client: 'gtx',
      sl: sl,
      tl: tl,
      dt: 't',
      dj: '1',
      source: 'input',
      q: text
    };
    
    const response = await axios.get(url, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': `${tl},en;q=0.9`,
        'Referer': 'https://translate.google.com/',
        'Origin': 'https://translate.google.com'
      }
    });
    
    if (response.data?.sentences && Array.isArray(response.data.sentences)) {
      const translation = response.data.sentences
        .filter(s => s.trans)
        .map(s => s.trans)
        .join('')
        .trim();
      
      if (translation && translation !== text && translation.length > 0) {
        console.log(`   ✅ Google API: "${translation.substring(0, 50)}..."`);
        return translation;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ Google API failed: ${error.message}`);
    return null;
  }
};

// ==========================================
// TRANSLATION METHOD 2: Google Translate Mobile Web
// ==========================================
const translateWithGoogleMobile = async (text, sourceLang, targetLang) => {
  try {
    const sl = sourceLang === 'zh-CN' || sourceLang === 'zh-TW' ? 'zh' : sourceLang;
    const tl = targetLang === 'zh-CN' || targetLang === 'zh-TW' ? 'zh' : targetLang;
    
    const url = 'https://translate.google.com/m';
    const params = new URLSearchParams({
      sl: sl,
      tl: tl,
      q: text
    });
    
    const response = await axios.get(`${url}?${params.toString()}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': `${tl},en;q=0.9`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://translate.google.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      responseType: 'text',
      responseEncoding: 'utf8'
    });
    
    const html = response.data;
    const $ = cheerio.load(html, { decodeEntities: true });
    
    // Try multiple selectors
    let translation = $('.result-container').text().trim();
    if (!translation) translation = $('div.t0').text().trim();
    if (!translation) translation = $('.translation').text().trim();
    if (!translation) translation = $('div[class*="result"]').first().text().trim();
    
    // Regex fallback with better entity handling
    if (!translation) {
      const patterns = [
        /<div class="result-container"[^>]*>(.*?)<\/div>/is,
        /<div class="t0"[^>]*>(.*?)<\/div>/is,
        /class="result-container"[^>]*>(.*?)<\/div>/is,
        /<div[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)<\/div>/is
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          translation = match[1]
            .replace(/<[^>]*>/g, '')
            .trim();
          translation = decodeHTMLEntities(translation);
          if (translation && translation.length > 0) break;
        }
      }
    }
    
    if (translation && translation.length > 0 && translation !== text) {
      console.log(`   ✅ Google Mobile: "${translation.substring(0, 50)}..."`);
      return translation;
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ Google Mobile failed: ${error.message}`);
    return null;
  }
};

// ==========================================
// TRANSLATION METHOD 3: Alternative Google API Format
// ==========================================
const translateWithGoogleAPIAlt = async (text, sourceLang, targetLang) => {
  try {
    const sl = sourceLang === 'zh-CN' || sourceLang === 'zh-TW' ? 'zh' : sourceLang;
    const tl = targetLang === 'zh-CN' || targetLang === 'zh-TW' ? 'zh' : targetLang;
    
    const url = 'https://translate.googleapis.com/translate_a/single';
    const params = new URLSearchParams({
      client: 'webapp',
      sl: sl,
      tl: tl,
      dt: 't',
      dt: 'bd',
      dj: '1',
      q: text
    });
    
    const response = await axios.get(`${url}?${params.toString()}`, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
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
          console.log(`   ✅ Google API Alt: "${translation.substring(0, 50)}..."`);
          return translation;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ Google API Alt failed: ${error.message}`);
    return null;
  }
};

// ==========================================
// TRANSLATION METHOD 4: MyMemory Translation
// ==========================================
const translateWithMyMemory = async (text, sourceLang, targetLang) => {
  try {
    // MyMemory has different codes
    const sl = sourceLang === 'zh-CN' ? 'zh-CN' : sourceLang === 'zh-TW' ? 'zh-TW' : sourceLang;
    const tl = targetLang === 'zh-CN' ? 'zh-CN' : targetLang === 'zh-TW' ? 'zh-TW' : targetLang;
    
    const url = 'https://api.mymemory.translated.net/get';
    const params = {
      q: text,
      langpair: `${sl}|${tl}`
    };
    
    const response = await axios.get(url, {
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.responseData?.translatedText) {
      const translation = response.data.responseData.translatedText.trim();
      if (translation && translation !== text && !translation.includes('MYMEMORY WARNING')) {
        console.log(`   ✅ MyMemory: "${translation.substring(0, 50)}..."`);
        return translation;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️ MyMemory failed: ${error.message}`);
    return null;
  }
};

// ==========================================
// TRANSLATION METHOD 5: LibreTranslate
// ==========================================
const translateWithLibreTranslate = async (text, sourceLang, targetLang) => {
  const instances = [
    'https://translate.argosopentech.com',
    'https://libretranslate.com',
    'https://translate.terraprint.co'
  ];
  
  const sl = sourceLang === 'zh-CN' || sourceLang === 'zh-TW' ? 'zh' : sourceLang;
  const tl = targetLang === 'zh-CN' || targetLang === 'zh-TW' ? 'zh' : targetLang;
  
  for (const instance of instances) {
    try {
      const response = await axios.post(`${instance}/translate`, {
        q: text,
        source: sl,
        target: tl,
        format: 'text'
      }, {
        timeout: 12000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (response.data?.translatedText) {
        const translation = response.data.translatedText.trim();
        if (translation && translation !== text) {
          console.log(`   ✅ LibreTranslate: "${translation.substring(0, 50)}..."`);
          return translation;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
};

// ==========================================
// MAIN TRANSLATION FUNCTION WITH RETRIES
// ==========================================
const translateText = async (text, sourceLang, targetLang, retryCount = 0) => {
  try {
    if (!text || text.trim().length === 0) return text;

    const normalizedSource = normalizeLanguageCode(sourceLang);
    const normalizedTarget = normalizeLanguageCode(targetLang);

    if (retryCount === 0) {
      console.log(`\n🔤 Translation:`);
      console.log(`   Input: "${text.substring(0, 100)}..."`);
      console.log(`   ${normalizedSource} → ${normalizedTarget}`);
    }

    if (normalizedSource === normalizedTarget) {
      console.log(`   ⚠️ Same language detected`);
      return text;
    }

    let translation = null;
    
    // Method 1: Primary Google API (most reliable)
    if (!translation) {
      console.log(`   🔄 [1/5] Google Translate API...`);
      translation = await translateWithGoogleAPI(text, normalizedSource, normalizedTarget);
      if (translation) return translation;
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    }

    // Method 2: Google Mobile Web
    if (!translation) {
      console.log(`   🔄 [2/5] Google Mobile Web...`);
      translation = await translateWithGoogleMobile(text, normalizedSource, normalizedTarget);
      if (translation) return translation;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Method 3: Alternative Google API
    if (!translation) {
      console.log(`   🔄 [3/5] Google API Alternative...`);
      translation = await translateWithGoogleAPIAlt(text, normalizedSource, normalizedTarget);
      if (translation) return translation;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Method 4: MyMemory
    if (!translation) {
      console.log(`   🔄 [4/5] MyMemory Translation...`);
      translation = await translateWithMyMemory(text, normalizedSource, normalizedTarget);
      if (translation) return translation;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Method 5: LibreTranslate
    if (!translation) {
      console.log(`   🔄 [5/5] LibreTranslate...`);
      translation = await translateWithLibreTranslate(text, normalizedSource, normalizedTarget);
      if (translation) return translation;
    }

    // Retry logic (max 2 retries)
    if (!translation && retryCount < 2) {
      console.log(`   🔄 Retry ${retryCount + 1}/2...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
      return translateText(text, sourceLang, targetLang, retryCount + 1);
    }

    if (!translation) {
      console.log(`   ❌ All translation methods failed after ${retryCount + 1} attempts`);
      return text; // Return original if all fail
    }

    return translation;

  } catch (error) {
    console.error(`   ❌ Translation error: ${error.message}`);
    return text;
  }
};

// ==========================================
// TRANSLATE SINGLE SHORT
// ==========================================
export const translateShort = async (req, res) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎬 SHORT TRANSLATION REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Short ID: ${req.params.id}`);
  console.log(`🎯 Target: ${req.body.targetLanguage}`);

  try {
    const { id: shortId } = req.params;
    const { targetLanguage } = req.body;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(shortId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid short ID" 
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        success: false, 
        message: "Target language required" 
      });
    }

    const normalizedTarget = normalizeLanguageCode(targetLanguage);
    
    // Find the short
    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({ 
        success: false, 
        message: "Short not found" 
      });
    }

    console.log(`📄 Title: "${short.title}"`);
    console.log(`📝 Description: "${(short.description || '').substring(0, 50)}..."`);

    // Initialize translations Map if doesn't exist
    if (!short.translations) {
      short.translations = new Map();
    }

    // Check cache
    const cachedTranslation = short.translations.get(normalizedTarget);
    if (cachedTranslation && cachedTranslation.title) {
      console.log('⚡ CACHE HIT');
      console.log(`📝 Cached Title: "${cachedTranslation.title}"`);
      console.log(`📝 Cached Description: "${(cachedTranslation.description || '').substring(0, 50)}..."`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return res.status(200).json({
        success: true,
        translations: {
          title: cachedTranslation.title,
          description: cachedTranslation.description || ''
        },
        sourceLanguage: short.originalLanguage || 'en',
        targetLanguage: normalizedTarget,
        fromCache: true,
        provider: 'cache'
      });
    }

    console.log('💾 Cache miss - translating...');

    // Detect source language
    const sourceText = short.originalTitle || short.title;
    const sourceLang = short.originalLanguage || detectLanguage(sourceText);
    const normalizedSource = normalizeLanguageCode(sourceLang);
    
    console.log(`🔍 Detected Source: ${normalizedSource}`);

    // Check if same language
    if (normalizedSource === normalizedTarget) {
      console.log('⚠️ Source and target are the same language');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return res.status(200).json({
        success: true,
        translations: {
          title: short.title,
          description: short.description || ''
        },
        sourceLanguage: normalizedSource,
        targetLanguage: normalizedTarget,
        fromCache: false,
        provider: 'none'
      });
    }

    // Translate title
    console.log('🔄 Translating title...');
    const translatedTitle = await translateText(
      short.originalTitle || short.title, 
      normalizedSource, 
      normalizedTarget
    );

    // Translate description if exists
    let translatedDescription = '';
    if (short.description && short.description.trim().length > 0) {
      console.log('🔄 Translating description...');
      translatedDescription = await translateText(
        short.originalDescription || short.description,
        normalizedSource,
        normalizedTarget
      );
    }

    console.log(`✅ Translated Title: "${translatedTitle}"`);
    if (translatedDescription) {
      console.log(`✅ Translated Description: "${translatedDescription.substring(0, 50)}..."`);
    }

    // Save to cache
    short.translations.set(normalizedTarget, {
      title: translatedTitle,
      description: translatedDescription,
      translatedAt: new Date()
    });

    // Preserve originals (first time only)
    if (!short.originalTitle) {
      short.originalTitle = short.title;
      short.originalDescription = short.description;
      short.originalLanguage = normalizedSource;
    }

    await short.save();
    console.log('💾 Translation cached successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return res.status(200).json({
      success: true,
      translations: {
        title: translatedTitle,
        description: translatedDescription
      },
      sourceLanguage: normalizedSource,
      targetLanguage: normalizedTarget,
      fromCache: false,
      provider: 'google-translate'
    });

  } catch (error) {
    console.error('❌ TRANSLATION ERROR:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(500).json({
      success: false,
      message: "Translation failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// BATCH TRANSLATE MULTIPLE SHORTS
// ==========================================
export const batchTranslateShorts = async (req, res) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 BATCH SHORT TRANSLATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const { shortIds, targetLanguage } = req.body;
    
    // Validate inputs
    if (!shortIds || !Array.isArray(shortIds) || shortIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Short IDs array required" 
      });
    }
    
    if (shortIds.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: "Maximum 50 shorts per batch" 
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({ 
        success: false, 
        message: "Target language required" 
      });
    }

    const normalizedTarget = normalizeLanguageCode(targetLanguage);
    console.log(`📦 Processing ${shortIds.length} shorts → ${normalizedTarget}`);

    // Process with delay to avoid rate limiting
    const results = [];
    for (let i = 0; i < shortIds.length; i++) {
      const id = shortIds[i];
      
      try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          results.push({
            shortId: id,
            error: 'Invalid ID format',
            success: false
          });
          continue;
        }

        const short = await Short.findById(id);
        if (!short) {
          results.push({
            shortId: id,
            error: 'Short not found',
            success: false
          });
          continue;
        }
        
        const sourceText = short.originalTitle || short.title;
        const sourceLang = short.originalLanguage || detectLanguage(sourceText);
        const normalizedSource = normalizeLanguageCode(sourceLang);

        // Initialize translations Map
        if (!short.translations) {
          short.translations = new Map();
        }

        // Check cache first
        const cached = short.translations.get(normalizedTarget);
        if (cached && cached.title) {
          results.push({
            shortId: id,
            translations: {
              title: cached.title,
              description: cached.description || ''
            },
            fromCache: true,
            success: true
          });
          console.log(`   ⚡ [${i + 1}/${shortIds.length}] Cache hit: ${id}`);
          continue;
        }

        // Skip if same language
        if (normalizedSource === normalizedTarget) {
          results.push({
            shortId: id,
            translations: {
              title: short.title,
              description: short.description || ''
            },
            skipped: true,
            reason: 'Same language',
            success: true
          });
          console.log(`   ⚠️ [${i + 1}/${shortIds.length}] Skipped (same language): ${id}`);
          continue;
        }

        console.log(`   🔄 [${i + 1}/${shortIds.length}] Translating: ${id}`);

        // Translate title
        const translatedTitle = await translateText(
          short.originalTitle || short.title, 
          normalizedSource, 
          normalizedTarget
        );
        
        // Translate description
        let translatedDescription = '';
        if (short.description && short.description.trim().length > 0) {
          translatedDescription = await translateText(
            short.originalDescription || short.description,
            normalizedSource,
            normalizedTarget
          );
        }
        
        // Save to cache
        short.translations.set(normalizedTarget, {
          title: translatedTitle,
          description: translatedDescription,
          translatedAt: new Date()
        });

        // Preserve originals
        if (!short.originalTitle) {
          short.originalTitle = short.title;
          short.originalDescription = short.description;
          short.originalLanguage = normalizedSource;
        }
        
        await short.save();
        
        results.push({
          shortId: id,
          translations: { 
            title: translatedTitle, 
            description: translatedDescription 
          },
          fromCache: false,
          success: true
        });

        console.log(`   ✅ [${i + 1}/${shortIds.length}] Completed: ${id}`);
        
        // Add delay between translations to avoid rate limiting
        if (i < shortIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (err) {
        console.error(`   ❌ [${i + 1}/${shortIds.length}] Failed: ${id} - ${err.message}`);
        results.push({ 
          shortId: id, 
          error: err.message, 
          success: false 
        });
      }
    }

    // Separate successful and failed results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Batch complete: ${successful.length}/${shortIds.length} successful`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return res.status(200).json({
      success: true,
      results: successful,
      failed,
      totalProcessed: shortIds.length,
      successfulCount: successful.length,
      failedCount: failed.length,
      targetLanguage: normalizedTarget
    });

  } catch (error) {
    console.error('❌ Batch translation error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(500).json({ 
      success: false, 
      message: "Batch translation failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// DETECT LANGUAGE FOR SHORT
// ==========================================
export const detectShortLanguage = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Text required for language detection" 
      });
    }
    
    const detectedLang = detectLanguage(text);
    const normalizedLang = normalizeLanguageCode(detectedLang);
    
    console.log(`🔍 Language Detection:`);
    console.log(`   Text: "${text.substring(0, 50)}..."`);
    console.log(`   Detected: ${detectedLang} → Normalized: ${normalizedLang}`);
    
    return res.status(200).json({ 
      success: true, 
      detectedLanguage: detectedLang,
      normalizedLanguage: normalizedLang,
      text: text.substring(0, 100),
      confidence: 'high'
    });
  } catch (error) {
    console.error('❌ Language detection error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Language detection failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// GET SUPPORTED LANGUAGES
// ==========================================
export const getSupportedLanguages = async (req, res) => {
  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands' },
    { code: 'pl', name: 'Polish', native: 'Polski' },
    { code: 'sv', name: 'Swedish', native: 'Svenska' },
    { code: 'no', name: 'Norwegian', native: 'Norsk' },
    { code: 'da', name: 'Danish', native: 'Dansk' },
    { code: 'fi', name: 'Finnish', native: 'Suomi' },
    { code: 'el', name: 'Greek', native: 'Ελληνικά' },
    { code: 'he', name: 'Hebrew', native: 'עברית' },
    { code: 'th', name: 'Thai', native: 'ไทย' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'ro', name: 'Romanian', native: 'Română' },
    { code: 'cs', name: 'Czech', native: 'Čeština' },
    { code: 'uk', name: 'Ukrainian', native: 'Українська' },
    { code: 'bg', name: 'Bulgarian', native: 'Български' },
    { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
    { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
    { code: 'fa', name: 'Persian', native: 'فارسی' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' }
  ];

  return res.status(200).json({
    success: true,
    languages,
    totalLanguages: languages.length
  });
};

// ==========================================
// CLEAR TRANSLATION CACHE FOR A SHORT
// ==========================================
export const clearTranslationCache = async (req, res) => {
  try {
    const { id: shortId } = req.params;
    const { language } = req.body; // Optional: clear specific language only

    if (!mongoose.Types.ObjectId.isValid(shortId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid short ID" 
      });
    }

    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({ 
        success: false, 
        message: "Short not found" 
      });
    }

    if (language) {
      // Clear specific language
      const normalizedLang = normalizeLanguageCode(language);
      if (short.translations && short.translations.has(normalizedLang)) {
        short.translations.delete(normalizedLang);
        await short.save();
        console.log(`🗑️ Cleared ${normalizedLang} translation cache for short ${shortId}`);
      }
    } else {
      // Clear all translations
      short.translations = new Map();
      await short.save();
      console.log(`🗑️ Cleared all translation cache for short ${shortId}`);
    }

    return res.status(200).json({
      success: true,
      message: language 
        ? `Translation cache cleared for ${language}` 
        : "All translation cache cleared"
    });

  } catch (error) {
    console.error('❌ Clear cache error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear translation cache",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};