/**
 * useOfflineSync — manages offline/online state and delivery sync for staff.
 *
 * Returns:
 *   isOnline        — current network status
 *   pendingCount    — number of deliveries queued offline
 *   syncStatus      — null | 'syncing' | 'done' | 'partial'
 *   lastSyncResult  — { synced, failed, total } from last sync
 *   requestSync     — manually trigger a sync attempt
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'done' | 'partial'
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const syncDoneTimerRef = useRef(null);

  // Ask SW for current pending count
  const refreshPendingCount = useCallback(() => {
    if (!navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'GET_PENDING_COUNT' });
  }, []);

  // Tell SW to sync now
  const requestSync = useCallback(() => {
    if (!navigator.serviceWorker?.controller) return;
    setSyncStatus('syncing');
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });

    // Also try Background Sync API if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.sync.register('sync-deliveries').catch(() => {});
      });
    }
  }, []);

  useEffect(() => {
    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when we come back online
      requestSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for messages from the service worker
    const handleSWMessage = (event) => {
      const { data } = event;
      if (!data) return;

      if (data.type === 'DELIVERY_QUEUED') {
        // A delivery was saved offline — increment pending count
        setPendingCount(prev => prev + 1);
      }

      if (data.type === 'SYNC_COMPLETE') {
        const { synced, failed, total } = data;
        setLastSyncResult({ synced, failed, total });
        setSyncStatus(failed > 0 ? 'partial' : 'done');
        setPendingCount(prev => Math.max(0, prev - synced));

        // Auto-clear the "done" status after 4 seconds
        clearTimeout(syncDoneTimerRef.current);
        syncDoneTimerRef.current = setTimeout(() => {
          setSyncStatus(null);
          setLastSyncResult(null);
        }, 4000);
      }

      if (data.type === 'PENDING_COUNT') {
        setPendingCount(data.count);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Get initial pending count
    if (navigator.serviceWorker?.controller) {
      refreshPendingCount();
    }

    // Also refresh count when SW becomes active
    navigator.serviceWorker?.ready.then(() => {
      refreshPendingCount();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      clearTimeout(syncDoneTimerRef.current);
    };
  }, [requestSync, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    syncStatus,
    lastSyncResult,
    requestSync,
    refreshPendingCount,
  };
};

export default useOfflineSync;
