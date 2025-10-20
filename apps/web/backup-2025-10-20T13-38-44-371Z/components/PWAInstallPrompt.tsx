import React, { useState } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { usePWA } from '../hooks/usePWA';

interface PWAInstallPromptProps {
  onClose?: () => void;
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onClose,
  className = '',
}) => {
  const { isInstallable, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  if (!isInstallable || !showPrompt) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      await installApp();
      setShowPrompt(false);
      onClose?.();
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    onClose?.();
  };

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Uygulamayı Yükle
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Daha iyi deneyim için
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="p-1 h-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2 mb-2">
            <Monitor className="h-4 w-4" />
            <span>Masaüstü kısayolu</span>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <Download className="h-4 w-4" />
            <span>Çevrimdışı erişim</span>
          </div>
          <div className="flex items-center space-x-2">
            <Smartphone className="h-4 w-4" />
            <span>Mobil optimizasyon</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            className="flex-1"
          >
            Şimdi Değil
          </Button>
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            size="sm"
            className="flex-1"
          >
            {isInstalling ? 'Yükleniyor...' : 'Yükle'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// PWA Update Prompt Component
interface PWAUpdatePromptProps {
  onClose?: () => void;
  className?: string;
}

export const PWAUpdatePrompt: React.FC<PWAUpdatePromptProps> = ({
  onClose,
  className = '',
}) => {
  const { isUpdateAvailable, updateApp } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  if (!isUpdateAvailable || !showPrompt) {
    return null;
  }

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      await updateApp();
      setShowPrompt(false);
      onClose?.();
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    onClose?.();
  };

  return (
    <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg p-4 z-50 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
            <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Güncelleme Mevcut
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Yeni özellikler ve iyileştirmeler
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="p-1 h-auto text-blue-600 hover:text-blue-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClose}
          className="flex-1"
        >
          Sonra
        </Button>
        <Button
          onClick={handleUpdate}
          disabled={isUpdating}
          size="sm"
          className="flex-1"
        >
          {isUpdating ? 'Güncelleniyor...' : 'Güncelle'}
        </Button>
      </div>
    </div>
  );
};