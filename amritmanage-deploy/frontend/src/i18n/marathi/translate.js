/**
 * Translation helper functions.
 * Resolves dot-notation keys against the translations object.
 *
 * Example:
 *   t('hero.title')          → 'दुधाचा व्यवसाय सहज व्यवस्थापित करा'
 *   t('footer.links.faq')    → 'FAQ'
 *   t('missing.key', 'Fallback') → 'Fallback'
 */
import mr from './translations';

/**
 * Resolve a dot-notation key from the translations object.
 * Returns the fallback string if the key is not found.
 */
export const t = (key, fallback = key) => {
  const parts = key.split('.');
  let current = mr;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[part];
  }
  return typeof current === 'string' ? current : fallback;
};

/**
 * Plural helper — Marathi uses the same form for most plurals,
 * but this allows future expansion.
 * count === 1 → singular, else → plural
 */
export const tPlural = (singularKey, pluralKey, count, fallback = '') => {
  return count === 1 ? t(singularKey, fallback) : t(pluralKey, fallback);
};
