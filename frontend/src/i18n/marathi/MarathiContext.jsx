/**
 * MarathiContext — React context for language switching.
 *
 * Wrap your app (or just the landing section) with <MarathiProvider>.
 * Use useMarathi() in any component to get the current language state.
 *
 * This file is SELF-CONTAINED. Deleting the entire i18n/marathi/ folder
 * removes Marathi support without touching any other file.
 *
 * Usage:
 *   // In a page component:
 *   import { useMarathi } from '../i18n/marathi';
 *   const { isMarathi, toggle, t } = useMarathi();
 *   <button onClick={toggle}>{isMarathi ? 'English' : 'मराठी'}</button>
 *   <h1>{t('hero.title')}</h1>
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { t as translateFn } from './translate';

const MarathiContext = createContext(null);

export const MarathiProvider = ({ children }) => {
  // Persist language preference in localStorage
  const [isMarathi, setIsMarathi] = useState(() => {
    try {
      return localStorage.getItem('amrit_lang') === 'mr';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setIsMarathi(prev => {
      const next = !prev;
      try { localStorage.setItem('amrit_lang', next ? 'mr' : 'en'); } catch {}
      return next;
    });
  }, []);

  const setEnglish = useCallback(() => {
    setIsMarathi(false);
    try { localStorage.setItem('amrit_lang', 'en'); } catch {}
  }, []);

  const setMarathi = useCallback(() => {
    setIsMarathi(true);
    try { localStorage.setItem('amrit_lang', 'mr'); } catch {}
  }, []);

  /**
   * t(key, englishFallback) — returns Marathi if active, else englishFallback.
   * If englishFallback is omitted, returns the key itself as fallback.
   */
  const t = useCallback((key, englishFallback = key) => {
    if (!isMarathi) return englishFallback;
    return translateFn(key, englishFallback);
  }, [isMarathi]);

  return (
    <MarathiContext.Provider value={{ isMarathi, toggle, setEnglish, setMarathi, t }}>
      {children}
    </MarathiContext.Provider>
  );
};

export const useMarathi = () => {
  const ctx = useContext(MarathiContext);
  if (!ctx) {
    // Graceful fallback when used outside provider — always returns English
    return {
      isMarathi: false,
      toggle: () => {},
      setEnglish: () => {},
      setMarathi: () => {},
      t: (key, fallback = key) => fallback,
    };
  }
  return ctx;
};
