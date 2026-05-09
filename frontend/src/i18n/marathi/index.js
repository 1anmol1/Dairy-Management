/**
 * Marathi (मराठी) i18n module for Amrit Manage
 *
 * SELF-CONTAINED — this entire folder can be deleted to remove Marathi support.
 * No existing files are modified. Import from this module only in Marathi-specific components.
 *
 * Usage:
 *   import { t, useMarathi } from '../i18n/marathi';
 *   const { t, isMarathi, toggle } = useMarathi();
 *   <p>{t('hero.title')}</p>
 */

export { default as translations } from './translations';
export { t, tPlural } from './translate';
export { useMarathi, MarathiProvider } from './MarathiContext';
