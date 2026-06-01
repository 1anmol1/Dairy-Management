import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Register Service Worker & Inject Manifest dynamically for offline delivery queuing ──────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const h = window.location.hostname;
    const isAppSubdomain = h === 'amritmanage-app.eurekai.in' || h.startsWith('app.') || h === 'localhost';
    const isAppPath = window.location.pathname.startsWith('/app');
    
    // Only register SW & Inject Manifest if on app subdomain or active app routes
    if (isAppSubdomain && isAppPath) {
      // Dynamically add manifest link if not present
      if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }
      
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          console.log('[SW] Registered:', reg.scope);
        })
        .catch(err => {
          console.warn('[SW] Registration failed:', err);
        });
    } else {
      // Unregister service worker on public landing pages to prevent app install prompts
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister().then(success => {
            if (success) console.log('[SW] Unregistered active service worker for public page');
          });
        }
      }).catch(err => {
        console.warn('[SW] Unregistration failed:', err);
      });
      
      // Remove manifest link if exists on public pages
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.remove();
      }
    }
  });
}
