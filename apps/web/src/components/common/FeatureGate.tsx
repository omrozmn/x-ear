import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFeatures } from '../../hooks/useFeatures';
import { ShieldOff } from 'lucide-react';
import { Button } from '@x-ear/ui-web';

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
        <ShieldOff className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Bu özellik kullanılamıyor
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Bu özellik mevcut abonelik planınızda aktif değil. Erişim için yöneticinizle iletişime geçin.
        </p>
        <Button
          onClick={() => navigate({ to: '/' })}
          className="px-4 py-2"
        >
          Ana Sayfaya Dön
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureGate;
