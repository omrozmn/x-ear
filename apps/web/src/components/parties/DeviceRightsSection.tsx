import React from 'react';
import { Shield } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DeviceRights {
  deviceRight: boolean;
  batteryRight: boolean;
  lastUpdate: string;
  validUntil: string | null;
}

interface DeviceRightsSectionProps {
  deviceRights: DeviceRights | null;
  deviceRightsLoading: boolean;
}

export const DeviceRightsSection: React.FC<DeviceRightsSectionProps> = ({
  deviceRights,
  deviceRightsLoading
}) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Cihaz Hakları</h3>

      {deviceRightsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : deviceRights ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cihaz Hakkı:</span>
                <StatusBadge status={deviceRights.deviceRight ? 'approved' : 'rejected'} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pil Hakkı:</span>
                <StatusBadge status={deviceRights.batteryRight ? 'approved' : 'rejected'} />
              </div>
            </div>
          </div>
          {deviceRights.validUntil && (
            <div className="text-sm text-gray-600">
              Geçerlilik Tarihi: {new Date(deviceRights.validUntil).toLocaleDateString('tr-TR')}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Cihaz hakları bilgisi bulunmuyor.</p>
        </div>
      )}
    </div>
  );
};