import React from 'react';
import { PatientDevice } from '../../types/patient';
import {
  Smartphone,
  Settings,
  Calendar,
  Shield,
  Battery,
  DollarSign,
  CreditCard,
  Clock,
  MapPin,
  User,
  FileText
} from 'lucide-react';

interface PatientDeviceCardProps {
  device: PatientDevice;
  onDeviceClick?: (device: PatientDevice) => void;
}

export const PatientDeviceCard: React.FC<PatientDeviceCardProps> = ({
  device,
  onDeviceClick
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Belirtilmemiş';
    return `${amount.toLocaleString('tr-TR')} ₺`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'assigned':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'returned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'defective':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
      case 'assigned':
        return 'Aktif';
      case 'trial':
        return 'Deneme';
      case 'returned':
        return 'İade';
      case 'defective':
        return 'Arızalı';
      default:
        return status;
    }
  };

  const getEarColor = (ear: string) => {
    switch (ear?.toLowerCase()) {
      case 'left':
      case 'sol':
        return {
          border: 'border-l-4 border-l-blue-500',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          label: 'Sol Kulak'
        };
      case 'right':
      case 'sağ':
        return {
          border: 'border-l-4 border-l-red-500',
          bg: 'bg-red-50',
          text: 'text-red-700',
          label: 'Sağ Kulak'
        };
      case 'both':
      case 'bilateral':
        return {
          border: 'border-l-4 border-l-purple-500',
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          label: 'Bilateral'
        };
      default:
        return {
          border: 'border-l-4 border-l-gray-400',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          label: ear || 'Belirtilmemiş'
        };
    }
  };

  const earStyle = getEarColor(device.side || device.ear);

  return (
    <div
      className={`bg-white rounded-lg p-4 border hover:shadow-md transition-shadow cursor-pointer ${earStyle.border} ${earStyle.bg}`}
      onClick={() => onDeviceClick?.(device)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDeviceClick?.(device);
        }
      }}
      aria-label={`${device.brand} ${device.model} cihazı`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header with device info and status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {device.brand} {device.model}
                </h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${earStyle.text} ${earStyle.bg}`}>
                    <MapPin className="w-3 h-3 mr-1" />
                    {earStyle.label}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(device.status)}`}>
                    {getStatusText(device.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Device Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500 flex items-center">
                <Settings className="w-3 h-3 mr-1" />
                Seri No:
              </span>
              <p className="font-medium text-gray-900">{device.serialNumber || 'Belirtilmemiş'}</p>
            </div>
            <div>
              <span className="text-gray-500">Tip:</span>
              <p className="font-medium text-gray-900">{device.type || 'Standart'}</p>
            </div>
            <div>
              <span className="text-gray-500 flex items-center">
                <DollarSign className="w-3 h-3 mr-1" />
                Liste Fiyatı:
              </span>
              <p className="font-medium text-gray-900">{formatCurrency(device.listPrice || device.price)}</p>
            </div>
            <div>
              <span className="text-gray-500 flex items-center">
                <CreditCard className="w-3 h-3 mr-1" />
                Satış Fiyatı:
              </span>
              <p className="font-medium text-gray-900">{formatCurrency(device.salePrice || device.price)}</p>
            </div>
          </div>

          {/* Pricing and Payment Info */}
          {(device.sgkReduction || device.patientPayment || device.paymentMethod) && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Ödeme Bilgileri</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {device.sgkReduction && (
                  <div>
                    <span className="text-gray-500">SGK Katkısı:</span>
                    <p className="font-medium text-green-600">{formatCurrency(device.sgkReduction)}</p>
                  </div>
                )}
                {device.patientPayment && (
                  <div>
                    <span className="text-gray-500">Hasta Ödemesi:</span>
                    <p className="font-medium text-blue-600">{formatCurrency(device.patientPayment)}</p>
                  </div>
                )}
                {device.paymentMethod && (
                  <div>
                    <span className="text-gray-500">Ödeme Yöntemi:</span>
                    <p className="font-medium text-gray-900 capitalize">{device.paymentMethod}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates and Warranty */}
          <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
            {(device.assignedDate || device.purchaseDate) && (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" aria-hidden="true" />
                <span>Atama: {formatDate(device.assignedDate || device.purchaseDate)}</span>
              </div>
            )}
            {device.warrantyExpiry && (
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1" aria-hidden="true" />
                <span>Garanti: {formatDate(device.warrantyExpiry)}</span>
              </div>
            )}
            {device.batteryType && (
              <div className="flex items-center">
                <Battery className="w-4 h-4 mr-1" aria-hidden="true" />
                <span>Pil: {device.batteryType}</span>
              </div>
            )}
          </div>

          {/* Trial Information */}
          {device.status === 'trial' && device.trialEndDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-center text-blue-700">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">
                  Deneme Süresi: {formatDate(device.trialEndDate)} tarihine kadar
                </span>
              </div>
            </div>
          )}

          {/* Assignment Details */}
          {(device.assignedBy || device.reason) && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {device.assignedBy && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    <span>Atan: {device.assignedBy}</span>
                  </div>
                )}
                {device.reason && (
                  <div>
                    <span>Sebep: </span>
                    <span className="capitalize">{device.reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {device.notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-start text-gray-600">
                <FileText className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Notlar:</span>
                  <p className="text-sm mt-1">{device.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Settings indicator */}
          {device.settings && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center text-gray-600">
                <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
                <span className="text-sm">Cihaz ayarları mevcut</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};