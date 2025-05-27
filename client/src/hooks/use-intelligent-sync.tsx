import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface SyncConfig {
  enabled: boolean;
  interval: number; // seconds
  priorityData: string[]; // High priority data types
  backgroundInterval: number; // Background sync interval
}

interface SyncStats {
  lastSync: Date | null;
  syncCount: number;
  avgSyncTime: number;
  failureCount: number;
  isBackground: boolean;
}

export function useIntelligentSync(config: SyncConfig) {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    lastSync: null,
    syncCount: 0,
    avgSyncTime: 0,
    failureCount: 0,
    isBackground: false
  });

  const [isActiveSync, setIsActiveSync] = useState(false);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());
  const syncTimesRef = useRef<number[]>([]);

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
  }, []);

  useEffect(() => {
    const handleActivity = () => updateActivity();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [updateActivity]);

  // Intelligent sync function
  const performSync = useCallback(async (isBackground = false) => {
    if (isActiveSync && !isBackground) return;
    
    const startTime = Date.now();
    setIsActiveSync(true);
    setSyncStats(prev => ({ ...prev, isBackground }));

    try {
      // Determine sync strategy based on activity and data priority
      const timeSinceActivity = Date.now() - lastActivityRef.current.getTime();
      const isUserActive = timeSinceActivity < 30000; // 30 seconds
      
      if (isBackground && isUserActive) {
        // Background sync during active use - only essential data
        await fetch('/api/ssh/sync-essential', { method: 'POST' });
      } else if (!isBackground || !isUserActive) {
        // Full sync when user is active or during foreground sync
        await Promise.all([
          fetch('/api/ssh/sync-essential', { method: 'POST' }),
          fetch('/api/ssh/sync-devices', { method: 'POST' }),
          fetch('/api/ssh/sync-advanced', { method: 'POST' })
        ]);
      }

      const syncTime = Date.now() - startTime;
      
      // Update sync statistics
      syncTimesRef.current.push(syncTime);
      if (syncTimesRef.current.length > 10) {
        syncTimesRef.current.shift(); // Keep only last 10 sync times
      }
      
      const avgTime = syncTimesRef.current.reduce((a, b) => a + b, 0) / syncTimesRef.current.length;
      
      setSyncStats(prev => ({
        ...prev,
        lastSync: new Date(),
        syncCount: prev.syncCount + 1,
        avgSyncTime: avgTime,
        isBackground: false
      }));

      // Invalidate queries to update UI
      queryClient.invalidateQueries();
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStats(prev => ({
        ...prev,
        failureCount: prev.failureCount + 1,
        isBackground: false
      }));
    } finally {
      setIsActiveSync(false);
    }
  }, [isActiveSync]);

  // Start intelligent sync system
  const startSync = useCallback(() => {
    if (!config.enabled) return;

    // Clear existing timers
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    if (backgroundTimerRef.current) clearInterval(backgroundTimerRef.current);

    // Regular sync interval
    syncTimerRef.current = setInterval(() => {
      performSync(false);
    }, config.interval * 1000);

    // Background sync interval (longer interval)
    backgroundTimerRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current.getTime();
      const isUserIdle = timeSinceActivity > 60000; // 1 minute idle
      
      if (isUserIdle) {
        performSync(true);
      }
    }, config.backgroundInterval * 1000);

    // Initial sync
    performSync(false);
  }, [config, performSync]);

  // Stop sync system
  const stopSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (backgroundTimerRef.current) {
      clearInterval(backgroundTimerRef.current);
      backgroundTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSync();
    };
  }, [stopSync]);

  // Auto-start/stop based on config
  useEffect(() => {
    if (config.enabled) {
      startSync();
    } else {
      stopSync();
    }
  }, [config.enabled, startSync, stopSync]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    return performSync(false);
  }, [performSync]);

  // Adaptive interval adjustment based on sync performance
  const getOptimalInterval = useCallback(() => {
    if (syncStats.avgSyncTime < 5000) {
      return Math.max(config.interval * 0.8, 3); // Faster if sync is quick
    } else if (syncStats.avgSyncTime > 15000) {
      return config.interval * 1.5; // Slower if sync is slow
    }
    return config.interval;
  }, [syncStats.avgSyncTime, config.interval]);

  return {
    syncStats,
    isActiveSync,
    startSync,
    stopSync,
    triggerSync,
    getOptimalInterval,
    updateActivity
  };
}