import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import ar from './ar.json'

const savedLanguage = localStorage.getItem('ascend_lang') || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

// Update html dir and lang attribute
const applyDirection = (lang: string) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lang
}

applyDirection(savedLanguage)

i18n.on('languageChanged', (lang) => {
  localStorage.setItem('ascend_lang', lang)
  applyDirection(lang)
})

export default i18n
