import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFeatures } from '../../hooks/useFeatures';
import { ShieldOff } from 'lucide-react';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Blocks rendering of children if the feature is disabled for the current tenant.
 * Shows a "feature unavailable" message and a back button.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ featureKey, children, fallback }) => {
  const { isFeatureEnabled, isLoading } = useFeatures();
  const navigate = useNavigate();

  if (isLoading) return null;

  if (!isFeatureEnabled(featureKey)) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldOff className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Bu özellik kullanılamıyor
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Bu özellik mevcut abonelik planınızda aktif değil. Erişim için yöneticinizle iletişime geçin.
        </p>
        <button
          onClick={() => navigate({ to: '/' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureGate;
