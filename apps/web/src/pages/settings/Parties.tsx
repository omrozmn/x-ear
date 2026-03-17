import React from 'react';
import { Users, Info } from 'lucide-react';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';
import { useIsMobile } from '@/hooks/useBreakpoint';

export default function PartiesSettings() {
  const isMobile = useIsMobile();

  return (
    <div className={`space-y-6 ${isMobile ? 'p-4' : ''}`}>
      {!isMobile && (
        <SettingsSectionHeader
          className="mb-6"
          title="Hasta Ayarları"
          description="Hasta yönetimi ve profil ayarları"
          icon={<Users className="w-6 h-6" />}
        />
      )}
      {isMobile && (
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hasta Ayarları</h2>
      )}

      <div className="bg-primary/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Hasta Ayarları</p>
            <p>
              Bu bölümde hasta profil ayarları, varsayılan değerler ve hasta yönetimi ile ilgili 
              yapılandırmalar yer alacaktır.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder for future settings */}
      <div className="bg-white dark:bg-gray-800 border border-border rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Genel Ayarlar
        </h3>
        <p className="text-sm text-muted-foreground">
          Hasta ayarları yakında eklenecektir.
        </p>
      </div>
    </div>
  );
}
