import { useTranslation } from 'react-i18next'

export const useLanguageToggle = () => {
  const { i18n } = useTranslation()
  const isSpanish = (i18n.language || 'es').startsWith('es')

  const toggleLanguage = () => {
    const next = isSpanish ? 'en' : 'es'
    i18n.changeLanguage(next)

    // Keep the Google Translate widget in sync
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null
    if (select) {
      select.value = next
      select.dispatchEvent(new Event('change'))
    }
  }

  return { isSpanish, toggleLanguage }
}