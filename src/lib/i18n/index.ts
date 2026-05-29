import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translations
import enTranslations from "./locales/en.json";
import myTranslations from "./locales/my.json";
import enAdminTranslations from "./locales/en-admin.json";
import myAdminTranslations from "./locales/my-admin.json";
import koTranslations from "./locales/ko.json";
import zhCnTranslations from "./locales/zh-CN.json";

const resources = {
  en: {
    translation: {
      ...enTranslations,
      ...enAdminTranslations,
    },
  },
  ko: {
    translation: {
      ...enAdminTranslations,
      ...koTranslations,
    },
  },
  my: {
    translation: {
      ...enAdminTranslations,
      ...myTranslations,
      ...myAdminTranslations,
    },
  },
  "zh-CN": {
    translation: {
      ...enAdminTranslations,
      ...zhCnTranslations,
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ["en", "ko", "my", "zh-CN"],
    fallbackLng: "en",
    debug: false,

    // Language detection options
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Namespace and key separator
    keySeparator: ".",
    nsSeparator: ":",
  });

i18n.on("languageChanged", (language) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
});

export default i18n;

