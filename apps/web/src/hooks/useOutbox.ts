import { useState, useEffect, useCallback } from 'react';
import { outbox, OutboxStats, OutboxEvent, OutboxOperation } from '../utils/outbox';

export interface UseOutboxReturn {
  stats: OutboxStats | null;
  isOnline: boolean;
  isSyncing: boolean;
  addOperation: (operation: OutboxOperation) => Promise<OutboxOperation>;
  syncNow: () => Promise<void>;
  clearFailedOperations: () => Promise<number>;
  getPendingOperations: () => Promise<OutboxOperation[]>;
}

export function useOutbox(): UseOutboxReturn {
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update stats
  const updateStats = useCallback(async () => {
    try {
      const newStats = await outbox.getStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to get outbox stats:', error);
    }
  }, []);

  // Handle outbox events
  useEffect(() => {
    const handleOutboxEvent = (event: CustomEvent<OutboxEvent>) => {
      const { type } = event.detail;
      
      switch (type) {
        case 'sync-started':
          setIsSyncing(true);
          break;
        case 'sync-completed':
        case 'sync-failed':
          setIsSyncing(false);
          updateStats();
          break;
        case 'operation-added':
        case 'operation-updated':
        case 'operation-removed':
        case 'failed-operations-cleared':
          updateStats();
          break;
      }
    };

    window.addEventListener('outbox-event', handleOutboxEvent as EventListener);
    return () => {
      window.removeEventListener('outbox-event', handleOutboxEvent as EventListener);
    };
  }, [updateStats]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial stats load
  useEffect(() => {
    updateStats();
  }, [updateStats]);

  const addOperation = useCallback(async (operation: OutboxOperation): Promise<OutboxOperation> => {
    return await outbox.addOperation(operation);
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    await outbox.syncPendingOperations();
  }, []);

  const clearFailedOperations = useCallback(async (): Promise<number> => {
    return await outbox.clearFailedOperations();
  }, []);

  const getPendingOperations = useCallback(async (): Promise<OutboxOperation[]> => {
    return await outbox.getPendingOperations();
  }, []);

  return {
    stats,
    isOnline,
    isSyncing,
    addOperation,
    syncNow,
    clearFailedOperations,
    getPendingOperations
  };
}