import React from 'react';
import { Users, Info } from 'lucide-react';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';

export default function PartiesSettings() {
  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        className="mb-6"
        title="Hasta Ayarları"
        description="Hasta yönetimi ve profil ayarları"
        icon={<Users className="w-6 h-6" />}
      />

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Genel Ayarlar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Hasta ayarları yakında eklenecektir.
        </p>
      </div>
    </div>
  );
}
