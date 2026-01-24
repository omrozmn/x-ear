import React from 'react';
import { PartyDevice } from '../../types/party';
import { Edit, Trash2, RefreshCw } from 'lucide-react';

interface PartyDeviceCardProps {
  device: PartyDevice;
  displaySide?: 'left' | 'right';
  onEdit?: (device: PartyDevice) => void;
  onReplace?: (device: PartyDevice) => void;
  onCancel?: (device: PartyDevice) => void;
  onReturnLoaner?: (device: PartyDevice) => void;
  isCancelled?: boolean;
}

export const PartyDeviceCard: React.FC<PartyDeviceCardProps> = ({
  device,
  displaySide,
  onEdit,
  onReplace,
  onCancel,
  onReturnLoaner,
  isCancelled = false
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
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

  const _getSgkSupportText = (sgkType?: string) => {
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
    const earLower = ear?.toLowerCase();
    switch (earLower) {
      case 'left':
      case 'l':
      case 'sol':
        return {
          border: 'border-l-4 border-l-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          badge: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700'
        };
      case 'right':
      case 'r':
      case 'sağ':
        return {
          border: 'border-l-4 border-l-red-500',
          bg: 'bg-red-50 dark:bg-red-900/20',
          badge: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700'
        };
      case 'both':
      case 'b':
      case 'bilateral':
        // Bilateral should not be shown as green - each ear should have its own color
        // This case should not be reached as bilateral is split into left/right cards
        return {
          border: 'border-l-4 border-l-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-800',
          badge: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
        };
      default:
        return {
          border: 'border-l-4 border-l-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-800',
          badge: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
        };
    }
  };

  const earStyle = getEarStyle(displaySide || device.earSide || device.ear || device.side || '');

  // Normalization logic for status fields (handling backend variations)
  const deliveryStatus = (device.deliveryStatus || device.delivery_status || 'pending').toLowerCase();
  const reportStatus = (device.reportStatus || device.report_status || 'none').toLowerCase();
  const isLoaner = device.isLoaner || device.is_loaner;



  return (
    <div className={`relative bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow ${earStyle.border} ${isCancelled ? 'opacity-50' : ''}`}>
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
      <div className={`px-4 py-3 ${earStyle.bg} border-b dark:border-slate-700`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {device.deviceName || `${device.brand || ''} ${device.model || ''}`.trim() || 'Bilinmeyen Cihaz'}
            </h4>
            {/* Delivery & Loaner Badges */}
            <div className="flex flex-wrap gap-2 mt-1">
              {/* Delivery Status */}
              {deliveryStatus === 'pending' && !isCancelled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800">
                  Teslim Bekliyor
                </span>
              )}
              {deliveryStatus === 'delivered' && !isCancelled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">
                  Teslim Edildi
                </span>
              )}

              {/* Loaner Status */}
              {isLoaner && !isCancelled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800">
                  Emanet Cihaz
                </span>
              )}

              {/* Report Status Badge */}
              {device.reason?.toLowerCase() === 'sale' && !isCancelled && (reportStatus !== 'none') && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                  ${['raporlu', 'received', 'has_report', 'true'].includes(reportStatus) ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800' :
                    ['bekleniyor', 'pending'].includes(reportStatus) ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800' :
                      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}>
                  {['raporlu', 'received', 'has_report', 'true'].includes(reportStatus) ? 'Rapor Teslim Alındı' :
                    ['bekleniyor', 'pending'].includes(reportStatus) ? 'Rapor Bekleniyor' : 'Raporsuz'}
                </span>
              )}
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium border ${earStyle.badge}`}>
            {displaySide === 'left' || device.earSide === 'LEFT' || device.ear === 'left' ? 'Sol' :
              displaySide === 'right' || device.earSide === 'RIGHT' || device.ear === 'right' ? 'Sağ' : 'Bilateral'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Atama ID:</span>
            <p className="font-medium text-gray-900 dark:text-gray-200 font-mono text-xs">{device.assignmentUid || device.saleId || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Barkod No:</span>
            <p className="font-medium text-gray-900 dark:text-gray-200 font-mono">{device.barcode || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Seri No:</span>
            <p className="font-medium text-gray-900 dark:text-gray-200 font-mono">
              {/* For bilateral cards, show the correct serial based on ear side */}
              {(() => {
                const earSide = displaySide || device.earSide || device.ear || '';
                const isRight = earSide === 'RIGHT' || earSide === 'right' || earSide === 'R';
                const isLeft = earSide === 'LEFT' || earSide === 'left' || earSide === 'L';

                // Primary: Try regular serial numbers
                if (isRight && device.serialNumberRight) return device.serialNumberRight;
                if (isLeft && device.serialNumberLeft) return device.serialNumberLeft;
                if (device.serialNumber) return device.serialNumber;

                // Fallback: If isLoaner, show loaner serial numbers
                const deviceIsLoaner = device.isLoaner || device.is_loaner;
                if (deviceIsLoaner) {
                  if (isRight && device.loanerSerialNumberRight) return device.loanerSerialNumberRight;
                  if (isLeft && device.loanerSerialNumberLeft) return device.loanerSerialNumberLeft;
                  if (device.loanerSerialNumber) return device.loanerSerialNumber;
                }

                return '-';
              })()}
            </p>
          </div>

          {/* Report Status - Only show for Sale */}


          <div>
            <span className="text-gray-500 dark:text-gray-400">Atama Nedeni:</span>
            <p className="font-medium text-gray-900 dark:text-gray-200">{getReasonText(device.reason)}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Atama Tarihi:</span>
            <p className="font-medium text-gray-900 dark:text-gray-200">{formatDate(device.assignedDate || device.createdAt || device.created_at)}</p>
          </div>

          {/* Conditional Fields - Only show for 'sale' */}
          {device.reason?.toLowerCase() === 'sale' && (
            <>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Liste Fiyatı:</span>
                <p className="font-medium text-gray-900 dark:text-gray-200">{formatCurrency(device.listPrice)}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Satış Fiyatı:</span>
                <p className="font-medium text-gray-900 dark:text-gray-200">
                  {(() => {
                    // Prefer showing per-unit sale price for the card.
                    // Order: 1) explicit per-item salePricePerItem, 2) salePrice / qty, 3) netPayable / qty, 4) listPrice
                    const earVal = (device.ear || device.earSide || device.ear_side || '').toString().toLowerCase();
                    const qty = (earVal.startsWith('b') || earVal === 'both' || earVal === 'bilateral') ? 2 : 1;

                    const explicitPerItem = device.salePricePerItem;
                    if (explicitPerItem !== null && explicitPerItem !== undefined) {
                      return formatCurrency(explicitPerItem);
                    }

                    // Treat `salePrice` stored on the assignment as the per-item sale price.
                    if (device.salePrice !== undefined && device.salePrice !== null) {
                      return formatCurrency(Number(device.salePrice));
                    }

                    // If only netPayable is available, and quantity>1, derive per-item from netPayable/qty.
                    if (device.netPayable !== undefined && device.netPayable !== null) {
                      const perUnitNet = Number(device.netPayable) / Math.max(1, qty);
                      return formatCurrency(perUnitNet);
                    }

                    if (device.listPrice !== undefined && device.listPrice !== null) {
                      return formatCurrency(device.listPrice);
                    }

                    return '-';
                  })()}
                </p>
              </div>

              {/* SGK Support - Per ear amount for bilateral assignments */}
              {(() => {
                // Backend stores sgkSupport as total (both ears combined for bilateral)
                // We need to divide by 2 for bilateral to show per-ear amount
                const rawSgk = device.sgkSupport ?? device.sgk_support ?? device.sgkReduction ?? null;

                if (rawSgk !== null && rawSgk !== undefined && Number(rawSgk) > 0) {
                  const earVal = (device.ear || device.earSide || device.ear_side || '').toString().toLowerCase();
                  const isBilateral = earVal.startsWith('b') || earVal === 'both' || earVal === 'bilateral';
                  // For bilateral, divide by 2 to show per-ear SGK support
                  const perEarSgk = isBilateral ? Number(rawSgk) / 2 : Number(rawSgk);

                  return (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">SGK Desteği:</span>
                      <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(perEarSgk)}</p>
                    </div>
                  );
                }

                return null;
              })()}

              <div>
                <span className="text-gray-500 dark:text-gray-400">Ödeme Yöntemi:</span>
                <p className="font-medium text-gray-900 dark:text-gray-200">{getPaymentMethodText(device.paymentMethod)}</p>
              </div>
            </>
          )}

          {device.assignedBy && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Atayan:</span>
              <p className="font-medium text-gray-900 dark:text-gray-200">{device.assignedBy}</p>
            </div>
          )}
        </div>

        {(device.notes || device.isLoaner || device.is_loaner) && (
          <div className="pt-2 border-t text-xs">
            {device.notes && (
              <>
                <span className="text-gray-500 dark:text-gray-400 block">Notlar:</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{device.notes}</p>
              </>
            )}

            {(device.isLoaner || device.is_loaner) && (
              <div className={`mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800 ${!device.notes ? 'mt-0' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-purple-800 dark:text-purple-300 font-semibold block mb-1">Emanet Cihaz Verildi:</span>
                    <p className="text-purple-700 dark:text-purple-400">
                      {device.loanerBrand || device.loaner_brand || 'Bilinmiyor'} {device.loanerModel || device.loaner_model || ''}
                      {(() => {
                        // Use displaySide prop first, then fallback to device ear
                        const side = (displaySide || device.earSide || device.ear || '').toLowerCase();
                        const isRight = side === 'right' || side === 'r' || side === 'sağ';
                        const isLeft = side === 'left' || side === 'l' || side === 'sol';

                        let sn = device.loanerSerialNumber;

                        if (isRight) {
                          sn = device.loanerSerialNumberRight ?? sn;
                        } else if (isLeft) {
                          sn = device.loanerSerialNumberLeft ?? sn;
                        }

                        return sn ? ` (SN: ${sn})` : '';
                      })()}
                    </p>
                  </div>
                  {/* Return to Stock Button - Inside the purple box as requested */}
                  {(device.status !== 'returned') && !isCancelled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReturnLoaner?.(device);
                      }}
                      className="ml-2 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center gap-1 shadow-sm"
                      title="Emaneti Stoğa Geri Al"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Stoğa Al
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex items-center justify-end gap-2">

        <button
          onClick={() => onEdit?.(device)}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
          title="Düzenle"
        >
          <Edit className="w-4 h-4" />
          Düzenle
        </button>
        <button
          onClick={() => onReplace?.(device)}
          className="px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-1"
          title="Değiştir"
        >
          <RefreshCw className="w-4 h-4" />
          Değiştir
        </button>
        <button
          onClick={() => onCancel?.(device)}
          className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
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
