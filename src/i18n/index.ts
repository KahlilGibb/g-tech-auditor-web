import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from '../locales/en.json';
import idTranslation from '../locales/id.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  id: {
    translation: idTranslation,
  },
};

// Check standard localStorage or persist layer for existing language preference
const savedLanguage = localStorage.getItem('gtech-language') || 'id';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
