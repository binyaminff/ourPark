import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import he from './locales/he.json';

const resources = {
    en: { translation: en },
    he: { translation: he },
};

// Try to get default device language, fallback to 'en'
const deviceLanguage = getLocales()[0]?.languageCode || 'en';
// We only support 'en' and 'he', default to 'he'
const defaultLang = ['en', 'he'].includes(deviceLanguage) ? deviceLanguage : 'he';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'he', // Force Hebrew for now as requested
        fallbackLng: 'he',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        compatibilityJSON: 'v4', // Required for React Native compatibility
    });

export default i18n;
