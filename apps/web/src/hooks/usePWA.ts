import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

export const usePWA = (): PWAState & PWAActions => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    installPrompt: null,
  });

  // Check if app is installed
  const checkInstallStatus = useCallback(() => {
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;
    
    setState(prev => ({ ...prev, isInstalled }));
  }, []);

  // Handle install prompt
  const handleBeforeInstallPrompt = useCallback((e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    setState(prev => ({
      ...prev,
      isInstallable: true,
      installPrompt: e,
    }));
  }, []);

  // Handle app installed
  const handleAppInstalled = useCallback(() => {
    setState(prev => ({
      ...prev,
      isInstallable: false,
      isInstalled: true,
      installPrompt: null,
    }));
  }, []);

  // Handle online/offline status
  const handleOnline = useCallback(() => {
    setState(prev => ({ ...prev, isOnline: true }));
  }, []);

  const handleOffline = useCallback(() => {
    setState(prev => ({ ...prev, isOnline: false }));
  }, []);

  // Install app
  const installApp = useCallback(async () => {
    if (!state.installPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      await state.installPrompt.prompt();
      const { outcome } = await state.installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null,
        }));
      }
    } catch (error) {
      console.error('Failed to install app:', error);
      throw error;
    }
  }, [state.installPrompt]);

  // Update app
  const updateApp = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to update app:', error);
        throw error;
      }
    }
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
        throw error;
      }
    }
  }, []);

  // Register service worker and set up event listeners
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, isUpdateAvailable: true }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_STATUS') {
          // Handle sync status updates
          console.log('Sync status:', event.data.payload);
        }
      });
    }

    // Set up event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial install status
    checkInstallStatus();

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleBeforeInstallPrompt, handleAppInstalled, handleOnline, handleOffline, checkInstallStatus]);

  return {
    ...state,
    installApp,
    updateApp,
    checkForUpdates,
  };
};

// Hook for managing PWA notifications
export const usePWANotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications not supported');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ): Promise<void> => {
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options,
        });
      }
    } else {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        ...options,
      });
    }
  }, [permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
};

// Hook for managing app shortcuts
export const usePWAShortcuts = () => {
  const addShortcut = useCallback(async (shortcut: {
    name: string;
    url: string;
    description?: string;
  }) => {
    if ('navigator' in window && 'shortcuts' in navigator) {
      try {
        // This is a proposed API, may not be available in all browsers
        await (navigator as any).shortcuts.add(shortcut);
      } catch (error) {
        console.warn('Shortcuts API not available:', error);
      }
    }
  }, []);

  return { addShortcut };
};