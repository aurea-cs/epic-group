import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API using the Vite environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// We use the flash model for faster response times in real-time translations
// In 2026, we use gemini-3.8-flash or gemini-1.5-flash. The script used 3.8-flash successfully.
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

const CACHE_PREFIX = 'gemini_trans_cache_';

/**
 * Translates a given text dynamically using Gemini and caches the result in localStorage.
 * 
 * @param text The text to translate
 * @param targetLang The language to translate to (e.g., 'en')
 * @returns The translated string, or the original string if translation fails
 */
export async function translateDynamicText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;

  // Define a cache key based on the text and target language
  const cacheKey = `${CACHE_PREFIX}${targetLang}_${btoa(encodeURIComponent(text)).slice(0, 50)}`;

  // 1. Check local cache first
  try {
    const cachedTranslation = localStorage.getItem(cacheKey);
    if (cachedTranslation) {
      return cachedTranslation;
    }
  } catch (e) {
    console.warn('Could not access localStorage', e);
  }

  // 2. Try Gemini API if key is available
  if (apiKey) {
    try {
      const prompt = `
You are an expert translator for an educational platform.
Translate the following short text to the language code '${targetLang}' (e.g. 'en' for English).
Keep the original tone and context. 
IMPORTANT: Return ONLY the translated text, with no quotes, no markdown, and no extra explanation.

Text to translate:
${text}
`;

      const result = await model.generateContent(prompt);
      let translated = result.response.text().trim();
      if (translated) {
        try {
          localStorage.setItem(cacheKey, translated);
        } catch (e) {
          console.warn('Could not save to localStorage', e);
        }
        return translated;
      }
    } catch (error) {
      console.warn('Gemini API translation error, falling back:', error);
    }
  }

  // 3. Fallback: Free Google Translate web API (client=gtx)
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.[0])) {
        const translated = data[0].map((chunk: any) => chunk[0]).join('');
        if (translated && translated.trim()) {
          const finalTranslation = translated.trim();
          try {
            localStorage.setItem(cacheKey, finalTranslation);
          } catch (e) {
            console.warn('Could not save to localStorage', e);
          }
          return finalTranslation;
        }
      }
    }
  } catch (error) {
    console.error('Fallback translation error:', error);
  }

  return text;
}
