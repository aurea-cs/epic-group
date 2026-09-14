import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateDynamicText } from '../lib/geminiTranslator';

/**
 * A hook to dynamically translate content based on the current app language.
 * 
 * @param text The source text in Spanish to translate
 * @returns An object with the current text (translated if needed) and a loading state
 */
export function useDynamicTranslation(text: string | null | undefined) {
  const { i18n } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text || '');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // If there's no text, reset
    if (!text) {
      setTranslatedText('');
      return;
    }

    // Our base language in DB is assumed to be Spanish ('es')
    // If the app is in Spanish, no need to translate
    if (i18n.language.startsWith('es')) {
      setTranslatedText(text);
      setIsTranslating(false);
      return;
    }

    // Otherwise, we need to translate the text to the current language
    const currentLang = i18n.language.split('-')[0]; // e.g., 'en-US' -> 'en'
    
    let isMounted = true;
    setIsTranslating(true);

    translateDynamicText(text, currentLang)
      .then((result) => {
        if (isMounted) {
          setTranslatedText(result);
          setIsTranslating(false);
        }
      })
      .catch((error) => {
        console.error("Failed to translate dynamic text", error);
        if (isMounted) {
          setTranslatedText(text); // fallback to original
          setIsTranslating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [text, i18n.language]);

  return { text: translatedText, isTranslating };
}
