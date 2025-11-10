import React from 'react';
import { PatientDevice } from '../../types/patient';
import { Edit, Trash2, RefreshCw } from 'lucide-react';

interface PatientDeviceCardProps {
  device: PatientDevice;
  onEdit?: (device: PatientDevice) => void;
  onReplace?: (device: PatientDevice) => void;
  onCancel?: (device: PatientDevice) => void;
  isCancelled?: boolean;
}

export const PatientDeviceCard: React.FC<PatientDeviceCardProps> = ({
  device,
  onEdit,
  onReplace,
  onCancel,
  isCancelled = false
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `₺${amount.toLocaleString('tr-TR')}`;
  };

  const getReasonText = (reason?: string) => {
    const reasons: Record<string, string> = {
      'sale': 'Satış',
      'service': 'Servis',
      'repair': 'Tamir',
      'trial': 'Deneme',
      'replacement': 'Değişim',
      'proposal': 'Teklif',
      'other': 'Diğer'
    };
    return reasons[reason || ''] || reason || '-';
  };

  const getPaymentMethodText = (method?: string) => {
    const methods: Record<string, string> = {
      'cash': 'Nakit',
      'card': 'Kredi Kartı',
      'transfer': 'Havale/EFT',
      'installment': 'Taksit'
    };
    return methods[method || ''] || method || '-';
  };

  const getSgkSupportText = (sgkType?: string) => {
    const sgkTypes: Record<string, string> = {
      'no_coverage': 'SGK Desteği Yok',
      'under4_parent_working': '4 Yaş Altı (Veli Çalışan)',
      'under4_parent_retired': '4 Yaş Altı (Veli Emekli)',
      'age5_12_parent_working': '5-12 Yaş (Veli Çalışan)',
      'age5_12_parent_retired': '5-12 Yaş (Veli Emekli)',
      'age13_18_parent_working': '13-18 Yaş (Veli Çalışan)',
      'age13_18_parent_retired': '13-18 Yaş (Veli Emekli)',
      'over18_working': '18+ Yaş (Çalışan)',
      'over18_retired': '18+ Yaş (Emekli)'
    };
    return sgkTypes[sgkType || ''] || sgkType || '-';
  };

  // Audiological view: Right=Red, Left=Blue
  const getEarStyle = (ear: string) => {
    switch (ear?.toLowerCase()) {
      case 'left':
      case 'l':
      case 'sol':
        return {
          border: 'border-l-4 border-l-blue-500',
          bg: 'bg-blue-50',
          badge: 'bg-blue-100 text-blue-700 border-blue-300'
        };
      case 'right':
      case 'r':
      case 'sağ':
        return {
          border: 'border-l-4 border-l-red-500',
          bg: 'bg-red-50',
          badge: 'bg-red-100 text-red-700 border-red-300'
        };
      case 'both':
      case 'b':
      case 'bilateral':
        // Bilateral should not be shown as green - each ear should have its own color
        // This case should not be reached as bilateral is split into left/right cards
        return {
          border: 'border-l-4 border-l-gray-400',
          bg: 'bg-gray-50',
          badge: 'bg-gray-100 text-gray-700 border-gray-300'
        };
      default:
        return {
          border: 'border-l-4 border-l-gray-400',
          bg: 'bg-gray-50',
          badge: 'bg-gray-100 text-gray-700 border-gray-300'
        };
    }
  };

  const earStyle = getEarStyle((device as any).earSide || device.ear || device.side || '');

  return (
    <div className={`relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ${earStyle.border} ${isCancelled ? 'opacity-50' : ''}`}>
      {/* Cancelled Overlay */}
      {isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-full h-1 bg-red-500 transform rotate-12"></div>
          <div className="absolute text-red-600 font-bold text-2xl bg-white px-4 py-1 rounded border-2 border-red-500">
            İPTAL EDİLDİ
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 ${earStyle.bg} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">
              {(device as any).deviceName || `${device.brand || ''} ${device.model || ''}`.trim() || 'Bilinmeyen Cihaz'}
            </h4>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium border ${earStyle.badge}`}>
            {(device as any).earSide === 'LEFT' || device.ear === 'left' ? 'Sol' :
              (device as any).earSide === 'RIGHT' || device.ear === 'right' ? 'Sağ' : 'Bilateral'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <span className="text-gray-500">Barkod No:</span>
            <p className="font-medium text-gray-900 font-mono">{(device as any).barcode || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Seri No:</span>
            <p className="font-medium text-gray-900 font-mono">
              {/* For bilateral cards, show the correct serial based on ear side */}
              {((device as any).earSide === 'RIGHT' || device.ear === 'right') && (device as any).serialNumberRight ? (device as any).serialNumberRight :
                ((device as any).earSide === 'RIGHT' || device.ear === 'right') && (device as any).serial_number_right ? (device as any).serial_number_right :
                  ((device as any).earSide === 'LEFT' || device.ear === 'left') && (device as any).serialNumberLeft ? (device as any).serialNumberLeft :
                    ((device as any).earSide === 'LEFT' || device.ear === 'left') && (device as any).serial_number_left ? (device as any).serial_number_left :
                      device.serialNumber ||
                      (device as any).serial_number ||
                      (device as any).serialNumberLeft ||
                      (device as any).serial_number_left ||
                      (device as any).serialNumberRight ||
                      (device as any).serial_number_right ||
                      '-'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">SGK Destek Türü:</span>
            <p className="font-medium text-gray-900">{getSgkSupportText((device as any).sgkScheme || (device as any).sgkSupportType)}</p>
          </div>
          <div>
            <span className="text-gray-500">Atama Nedeni:</span>
            <p className="font-medium text-gray-900">{getReasonText(device.reason)}</p>
          </div>
          <div>
            <span className="text-gray-500">Atama Tarihi:</span>
            <p className="font-medium text-gray-900">{formatDate(device.assignedDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Liste Fiyatı:</span>
            <p className="font-medium text-gray-900">{formatCurrency(device.listPrice)}</p>
          </div>
          <div>
            <span className="text-gray-500">Satış Fiyatı:</span>
            <p className="font-medium text-gray-900">{formatCurrency(device.salePrice)}</p>
          </div>
          {device.sgkReduction && (
            <div>
              <span className="text-gray-500">SGK Desteği:</span>
              <p className="font-medium text-green-600">{formatCurrency(device.sgkReduction)}</p>
            </div>
          )}
          {device.patientPayment && (
            <div>
              <span className="text-gray-500">Hasta Ödemesi:</span>
              <p className="font-medium text-blue-600">{formatCurrency(device.patientPayment)}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Ödeme Yöntemi:</span>
            <p className="font-medium text-gray-900">{getPaymentMethodText(device.paymentMethod)}</p>
          </div>
          {device.assignedBy && (
            <div>
              <span className="text-gray-500">Atayan:</span>
              <p className="font-medium text-gray-900">{device.assignedBy}</p>
            </div>
          )}
        </div>

        {device.notes && (
          <div className="pt-2 border-t">
            <span className="text-gray-500">Notlar:</span>
            <p className="text-gray-700 text-xs mt-1">{device.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit?.(device)}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
          title="Düzenle"
        >
          <Edit className="w-4 h-4" />
          Düzenle
        </button>
        <button
          onClick={() => onReplace?.(device)}
          className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
          title="Değiştir"
        >
          <RefreshCw className="w-4 h-4" />
          Değiştir
        </button>
        <button
          onClick={() => onCancel?.(device)}
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
          title="İptal Et"
          disabled={isCancelled}
        >
          <Trash2 className="w-4 h-4" />
          {isCancelled ? 'İptal Edildi' : 'İptal'}
        </button>
      </div>
    </div>
  );
};
