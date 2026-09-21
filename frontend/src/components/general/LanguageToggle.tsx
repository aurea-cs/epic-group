import React, { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import './LanguageToggle.css';

const LanguageToggle: React.FC = () => {
  const [currentLang, setCurrentLang] = useState('es');
  const isLoaded = useRef(false);

  useEffect(() => {
    // Check initial language from cookie if page was refreshed
    if (document.cookie.includes('googtrans=/es/en')) {
      setCurrentLang('en');
    }

    if (isLoaded.current) return;
    isLoaded.current = true;

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: 'es', includedLanguages: 'en,es' },
        'google_translate_element'
      );
    };

    if (document.getElementById('google-translate-script')) {
      if ((window as any).google && (window as any).google.translate) {
        (window as any).googleTranslateElementInit();
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const toggleLanguage = () => {
    const newLang = currentLang === 'es' ? 'en' : 'es';
    
    // Find the hidden Google Translate select element and change its value
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = newLang;
      // Google translate listens for the 'change' event to trigger translation
      select.dispatchEvent(new Event('change'));
      setCurrentLang(newLang);
    }
  };

  return (
    <div className="language-toggle-container">
      {/* Hidden google translate widget */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>
      
      {/* Custom beautiful button */}
      <button 
        className="language-toggle-btn" 
        onClick={toggleLanguage}
        title={currentLang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        <Globe size={20} />
        <span>{currentLang === 'es' ? 'ES' : 'EN'}</span>
      </button>
    </div>
  );
};

export default LanguageToggle;
