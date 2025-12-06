// src/components/ui/ShortTranslation.tsx - FIXED VERSION

import React, { useState } from 'react';
import { Languages, Globe, Loader2, RotateCcw, X } from 'lucide-react';
import axios from 'axios';

interface ShortTranslationProps {
  shortId: string;
  currentTitle: string;
  currentDescription: string;
  originalLanguage: string;
  onTranslated: (title: string, description: string, language: string) => void;
  onShowOriginal: () => void;
  currentTranslation: {
    language: string;
    title: string;
    description: string;
  } | null;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
];

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "https://youtube-clone-project-q3pd.onrender.com";

const ShortTranslation: React.FC<ShortTranslationProps> = ({
  shortId,
  currentTitle,
  currentDescription,
  originalLanguage,
  onTranslated,
  onShowOriginal,
  currentTranslation
}) => {
  const [showLanguages, setShowLanguages] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async (targetLanguage: string) => {
    console.log('\n🌐 ===== SHORT TRANSLATION REQUEST =====');
    console.log('Short ID:', shortId);
    console.log('Target Language:', targetLanguage);
    console.log('Original Language:', originalLanguage);

    if (targetLanguage === originalLanguage) {
      onShowOriginal();
      setShowLanguages(false);
      return;
    }

    setTranslating(true);
    setError('');
    setShowLanguages(false);

    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/api/shorts/translate/${shortId}`,
        { targetLanguage },
        {
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Translation response:', response.data);

      if (response.data.success) {
        onTranslated(
          response.data.translations.title,
          response.data.translations.description,
          targetLanguage
        );

        const cacheStatus = response.data.fromCache ? '⚡ from cache' : '🆕 newly translated';
        console.log(`✅ Translation successful (${cacheStatus})`);
      } else {
        throw new Error(response.data.message || 'Translation failed');
      }
    } catch (err: any) {
      console.error('❌ Translation error:', err);
      
      let errorMessage = 'Translation failed. ';
      
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage += 'Request timed out.';
      } else if (err.response?.status === 404) {
        errorMessage += 'Translation service not found.';
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
      setTimeout(() => setError(''), 3000);
    } finally {
      setTranslating(false);
    }
  };

  const getLanguageName = (code: string): string => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? lang.name : code.toUpperCase();
  };

  const getLanguageFlag = (code: string): string => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? lang.flag : '🌍';
  };

  return (
    <div className="relative inline-block">
      {/* Error Toast */}
      {error && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
          style={{ pointerEvents: 'auto' }}
        >
          {error}
        </div>
      )}

      {/* Current Translation Badge */}
      {currentTranslation && (
        <div 
          className="mb-2 flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-1.5"
          style={{ pointerEvents: 'auto' }}
        >
          <Globe size={14} className="text-blue-400" />
          <span className="text-xs text-blue-300">
            Translated to {getLanguageName(currentTranslation.language)} {getLanguageFlag(currentTranslation.language)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowOriginal();
            }}
            className="ml-2 text-blue-400 hover:text-blue-300 transition"
            title="Show original"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      )}

      {/* Translate Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowLanguages(!showLanguages);
        }}
        disabled={translating}
        className="flex items-center gap-2 bg-gray-800/90 hover:bg-gray-700/90 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm transition shadow-lg"
        style={{ pointerEvents: 'auto' }}
      >
        {translating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Translating...</span>
          </>
        ) : (
          <>
            <Languages size={16} />
            <span>Translate</span>
          </>
        )}
      </button>

      {/* Language Dropdown - FIXED POSITIONING */}
      {showLanguages && !translating && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowLanguages(false);
            }}
          />
          
          {/* Dropdown Menu */}
          <div 
            className="absolute bottom-full mb-2 left-0 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-[9999] min-w-[200px] max-h-[300px] overflow-y-auto"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 bg-gray-800 border-b border-gray-700 sticky top-0 z-10 flex items-center justify-between">
              <p className="text-xs text-gray-400 font-semibold">Translate to:</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLanguages(false);
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-1">
              {SUPPORTED_LANGUAGES
                .filter(lang => lang.code !== originalLanguage)
                .map((lang) => (
                  <button
                    key={lang.code}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTranslate(lang.code);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-800 rounded-lg transition flex items-center gap-2 text-white text-sm"
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShortTranslation;