# Marathi (मराठी) i18n Module

Self-contained Marathi language support for Amrit Manage landing pages.

## Structure

```
frontend/src/i18n/marathi/
├── index.js           — Public API (re-exports everything)
├── translations.js    — All Marathi strings (Devanagari script)
├── translate.js       — t() and tPlural() helper functions
├── MarathiContext.jsx — React context + useMarathi() hook
├── LanguageToggle.jsx — Drop-in language switch button
└── README.md          — This file
```

## How to use

### 1. Wrap your app (or just landing pages) with the provider

```jsx
// In App.jsx or a landing layout:
import { MarathiProvider } from './i18n/marathi';

<MarathiProvider>
  <LandingPage />
</MarathiProvider>
```

### 2. Use translations in any component

```jsx
import { useMarathi } from '../i18n/marathi';

const MyComponent = () => {
  const { t, isMarathi, toggle } = useMarathi();

  return (
    <div>
      <h1>{t('hero.title', 'Manage Your Milk Business')}</h1>
      <button onClick={toggle}>
        {isMarathi ? 'English' : 'मराठी'}
      </button>
    </div>
  );
};
```

### 3. Add the language toggle button anywhere

```jsx
import LanguageToggle from '../i18n/marathi/LanguageToggle';

// In Navbar or footer:
<LanguageToggle />
```

## How to remove Marathi completely

1. Delete this entire folder: `frontend/src/i18n/marathi/`
2. Remove `<MarathiProvider>` wrapper from App.jsx (if added)
3. Remove `<LanguageToggle />` from Navbar/footer (if added)
4. Remove any `useMarathi()` calls from components (if added)

**No other files are affected.** The existing English codebase is untouched.

## How to add more translations

Edit `translations.js` and add new keys. Use dot-notation in `t()`:

```js
// translations.js
const mr = {
  mySection: {
    myKey: 'माझा मजकूर'
  }
};

// Component
t('mySection.myKey', 'My English fallback')
```

## Font recommendation

For best Devanagari rendering, add to your HTML `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Then in CSS:
```css
[lang="mr"], .marathi {
  font-family: 'Noto Sans Devanagari', sans-serif;
}
```
