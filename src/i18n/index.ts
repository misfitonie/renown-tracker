import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

const LANG_KEY = 'renown-tracker-lang';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: localStorage.getItem(LANG_KEY) ?? 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_KEY, lng);
});

export default i18n;
