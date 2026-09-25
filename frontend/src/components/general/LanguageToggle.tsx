import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import './LanguageToggle.css';

const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('es') ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <button 
      className="language-toggle-btn" 
      onClick={toggleLanguage}
      title={i18n.language.startsWith('es') ? 'Switch to English' : 'Cambiar a Español'}
    >
      <Globe size={20} />
      <span>{i18n.language.startsWith('es') ? 'ES' : 'EN'}</span>
    </button>
  );
};

export default LanguageToggle;
