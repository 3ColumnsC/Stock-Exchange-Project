// src/hooks/useTranslations.js
import { useState, useEffect, useMemo } from 'react';
import uiTranslations from '../i18n/translations.json';
import logTranslations from '../i18n/logs.json';
import helpTranslations from '../i18n/help.json';
import settingsControlTranslations from '../i18n/settingsControl.json';
import symbolTranslations from '../i18n/symbol.json';

// Combine all translations with namespaces dynamically for all locales present
const allLocales = Array.from(
  new Set([
    ...Object.keys(uiTranslations || {}),
    ...Object.keys(logTranslations || {}),
    ...Object.keys(helpTranslations || {}),
    ...Object.keys(settingsControlTranslations || {}),
    ...Object.keys(symbolTranslations || {})
  ])
);

const resources = allLocales.reduce((acc, lang) => {
  acc[lang] = {
    translation: (uiTranslations && uiTranslations[lang]) || {},
    logs: (logTranslations && (logTranslations[lang] || logTranslations['en'])) || {},
    help: (helpTranslations && (helpTranslations[lang] || helpTranslations['en'])) || {},
    settingsControl: (settingsControlTranslations && (settingsControlTranslations[lang] || settingsControlTranslations['en'])) || {},
    symbol: (symbolTranslations && (symbolTranslations[lang] || symbolTranslations['en'])) || {}
  };
  return acc;
}, {});

// Fallback to English if nothing else
if (!resources['en']) {
  resources['en'] = {
    translation: uiTranslations['en'] || {},
    logs: logTranslations['en'] || {},
    help: helpTranslations['en'] || {},
    settingsControl: settingsControlTranslations['en'] || {},
    symbol: symbolTranslations['en'] || {}
  };
}

export const useTranslation = (ns = 'translation') => {
  const [language, setLanguage] = useState('es');
  const [currentNs, setCurrentNs] = useState(ns);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load saved language from localStorage or use browser language
    const browserLang = (typeof navigator !== 'undefined' && navigator.language) || 'en';
    const savedLanguage = localStorage.getItem('language') || (browserLang.startsWith('es') ? 'es' : 'en');
    setLanguage(savedLanguage);
    setReady(true); // Mark translations as ready after initial load
  }, []);

  useEffect(() => {
    setCurrentNs(ns);
  }, [ns]);

  // Listen to global language change events so multiple hooks stay in sync
  useEffect(() => {
    const handler = (e) => {
      const lang = e?.detail;
      if (lang && lang !== language && resources[lang]) {
        setLanguage(lang);
      }
    };
    try {
      window.addEventListener?.('i18n:language-changed', handler);
    } catch {}
    return () => {
      try { window.removeEventListener?.('i18n:language-changed', handler); } catch {}
    };
  }, [language]);

  const changeLanguage = (lang) => {
    if (resources[lang]) {
      setLanguage(lang);
      localStorage.setItem('language', lang);
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('i18n:language-changed', { detail: lang }));
        }
      } catch {}
    }
  };

  const t = useMemo(() => {
    // Helper to get nested value by dot path
    const getByPath = (obj, path) => {
      if (!obj) return undefined;
      const parts = String(path).split('.');
      let cur = obj;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
          cur = cur[p];
        } else {
          return undefined;
        }
      }
      return cur;
    };

    return (key, options = {}) => {
      const ns = options.ns || currentNs;
      const returnObjects = !!options.returnObjects;
      const replacements = (() => {
        const { ns: _ns, returnObjects: _ro, replace, ...rest } = options || {};
        // Prefer explicit replace option; otherwise use remaining keys as replacements
        if (replace && typeof replace === 'object') return replace;
        return rest;
      })();

      // Try current language, then English fallback
      let translation = getByPath(resources[language]?.[ns], key);
      if (translation === undefined) {
        translation = getByPath(resources['en']?.[ns], key);
      }
      if (translation === undefined) {
        return key; // last resort
      }

      // Return objects/arrays when requested
      if (returnObjects && (typeof translation === 'object')) {
        return translation;
      }

      // If it's an array but returnObjects not true, pick first as string
      if (Array.isArray(translation)) {
        return translation[0] ?? key;
      }

      // Ensure string for replacements
      if (typeof translation !== 'string') {
        return translation;
      }

      // Simple mustache-style replacements
      if (replacements && typeof replacements === 'object') {
        Object.entries(replacements).forEach(([k, v]) => {
          translation = translation.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });
      }

      return translation;
    };
  }, [language, currentNs]);

  // Alias for log translations
  const tl = useMemo(() => {
    return (code, params = {}) => {
      const template = t(code, { ns: 'logs' });
      return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
    };
  }, [t]);

  return { 
    t, 
    tl, 
    language, 
    ready,
    changeLanguage, 
    i18n: { language, changeLanguage } // For compatibility with some i18n libraries
  };
};