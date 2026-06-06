import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ShortcutContext = createContext(null);

const DEFAULT_SHORTCUTS = {
  closeModal: { key: 'c', label: 'Close Modal', labelMr: 'मोडल बंद करा' },
  addRecord: { key: '+', label: 'Add Farmer / Customer', labelMr: 'शेतकरी / ग्राहक जोडा' },
  nextPage: { key: 'ArrowDown', label: 'Next Page (Sidebar)', labelMr: 'पुढील पान (साइडबार)' },
  prevPage: { key: 'ArrowUp', label: 'Previous Page (Sidebar)', labelMr: 'मागील पान (साइडबार)' },
  toggleSidebar: { key: 'm', label: 'Minimize / Reopen Sidebar', labelMr: 'साइडबार लपवा / दाखवा' },
  focusInput: { key: 'Enter', label: 'Go to Input / Search Section', labelMr: 'शोध किंवा इनपुट क्षेत्रावर जा' }
};

export const ShortcutProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Load customized shortcuts or fallback to defaults
  const [shortcuts, setShortcuts] = useState(() => {
    const saved = localStorage.getItem('amrit_shortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge in case we added new defaults later
        return { ...DEFAULT_SHORTCUTS, ...parsed };
      } catch (e) {
        return DEFAULT_SHORTCUTS;
      }
    }
    return DEFAULT_SHORTCUTS;
  });

  const [sidebarMinimized, setSidebarMinimized] = useState(() => {
    return localStorage.getItem('amrit_sidebar_minimized') === 'true';
  });

  const [recordingAction, setRecordingAction] = useState(null);

  // Sync sidebar minimize to localStorage
  useEffect(() => {
    localStorage.setItem('amrit_sidebar_minimized', sidebarMinimized);
  }, [sidebarMinimized]);

  const updateShortcut = (actionName, newKey) => {
    const updated = {
      ...shortcuts,
      [actionName]: {
        ...shortcuts[actionName],
        key: newKey
      }
    };
    setShortcuts(updated);
    localStorage.setItem('amrit_shortcuts', JSON.stringify(updated));
  };

  const resetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.removeItem('amrit_shortcuts');
  };

  // Helper to determine active route items for pagination
  const getRoutes = () => {
    if (!user || user.role !== 'owner') return [];
    const isDairyOwner = user?.ownerRole === 'dairy_owner';
    const hasTemplates = user?.features?.whatsapp_alerts || user?.features?.custom_message_templates;
    const hasWhatsApp = user?.features?.whatsapp_alerts;

    return [
      '/app/owner',
      '/app/owner/customers',
      '/app/owner/delivery',
      '/app/owner/logs',
      '/app/owner/collection',
      ...(isDairyOwner ? ['/app/owner/farmers'] : []),
      '/app/owner/staff',
      '/app/owner/billing',
      '/app/owner/default-rate',
      ...(hasTemplates ? ['/app/owner/message-templates'] : []),
      ...(hasWhatsApp ? ['/app/owner/whatsapp'] : []),
      '/app/owner/feedback',
      '/app/owner/shortcuts'
    ];
  };

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. If currently recording a shortcut, intercept and bind it
      if (recordingAction) {
        e.preventDefault();
        e.stopPropagation();
        updateShortcut(recordingAction, e.key);
        setRecordingAction(null);
        return;
      }

      const activeEl = document.activeElement;
      const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      // Find matching action
      const matchedAction = Object.keys(shortcuts).find(
        (action) => shortcuts[action].key.toLowerCase() === e.key.toLowerCase()
      );

      if (!matchedAction) return;

      // 2. Ignore generic shortcuts when typing in inputs, EXCEPT focusInput/save actions
      if (isEditable && matchedAction !== 'focusInput' && matchedAction !== 'closeModal') {
        return;
      }

      // 3. Execute actions
      if (matchedAction === 'closeModal') {
        e.preventDefault();
        const buttons = Array.from(document.querySelectorAll('button'));
        const closeBtn = buttons.find(b => {
          const txt = b.textContent?.trim().toLowerCase();
          return txt === 'cancel' || txt === 'close' || txt === 'रद्द करा' || txt === 'बंद करा';
        }) || document.querySelector('.modal button:has(svg), .modal-overlay button, .modal button');
        if (closeBtn) closeBtn.click();
      }

      else if (matchedAction === 'addRecord') {
        e.preventDefault();
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const addBtn = buttons.find(b => {
          const txt = b.textContent?.trim().toLowerCase();
          return txt?.includes('add customer') || 
                 txt?.includes('add farmer') || 
                 txt?.includes('customer add') ||
                 txt?.includes('farmer add') ||
                 txt?.includes('ग्राहक जोडा') || 
                 txt?.includes('शेतकरी जोडा');
        });
        if (addBtn) addBtn.click();
      }

      else if (matchedAction === 'toggleSidebar') {
        e.preventDefault();
        setSidebarMinimized(prev => !prev);
      }

      else if (matchedAction === 'nextPage' || matchedAction === 'prevPage') {
        e.preventDefault();
        const routes = getRoutes();
        if (routes.length === 0) return;

        const currentPath = location.pathname;
        const currentIndex = routes.indexOf(currentPath);
        
        let nextIndex = currentIndex;
        if (matchedAction === 'nextPage') {
          nextIndex = (currentIndex + 1) % routes.length;
        } else {
          nextIndex = (currentIndex - 1 + routes.length) % routes.length;
        }

        if (nextIndex >= 0 && nextIndex < routes.length) {
          navigate(routes[nextIndex]);
        }
      }

      else if (matchedAction === 'focusInput') {
        // If Enter is pressed, check if we're already inside a collection/delivery/input.
        // If we are NOT in an input, focus the first one.
        if (!isEditable) {
          e.preventDefault();
          const primaryInput = 
            document.getElementById('farmer-code-search') || 
            document.getElementById('delivery-search') || 
            document.querySelector('input[type="text"]:not([readonly])') ||
            document.querySelector('input[type="number"]:not([readonly])') ||
            document.querySelector('input:not([readonly])');
          
          if (primaryInput) {
            primaryInput.focus();
            primaryInput.select?.();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, recordingAction, location.pathname, user]);

  return (
    <ShortcutContext.Provider value={{
      shortcuts,
      sidebarMinimized,
      setSidebarMinimized,
      updateShortcut,
      resetShortcuts,
      recordingAction,
      setRecordingAction
    }}>
      {children}
    </ShortcutContext.Provider>
  );
};

export const useShortcuts = () => {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutProvider');
  }
  return context;
};
