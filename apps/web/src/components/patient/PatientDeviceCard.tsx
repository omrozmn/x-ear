import React from 'react';
import { PatientDevice } from '../../types/patient';
import { Edit, Trash2, RefreshCw } from 'lucide-react';

interface PatientDeviceCardProps {
  device: PatientDevice;
  onEdit?: (device: PatientDevice) => void;
  onReplace?: (device: PatientDevice) => void;
  onCancel?: (device: PatientDevice) => void;
  onReturnLoaner?: (device: PatientDevice) => void;
  isCancelled?: boolean;
}

export const PatientDeviceCard: React.FC<PatientDeviceCardProps> = ({
  device,
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

  // DEBUG: log incoming device payload and the values we will display
  try {
    const dp: any = device as any;
    const debugDisplay = {
      patientPayment: dp.patientPayment ?? dp.patientPayment,
      salePrice: dp.salePrice ?? dp.salePrice,
      netPayable: dp.netPayable ?? dp.netPayable,
      listPrice: dp.listPrice ?? dp.listPrice,
      serials: {
        serialNumber: dp.serialNumber || dp.serial_number,
        left: dp.serialNumberLeft || dp.serial_number_left,
        right: dp.serialNumberRight || dp.serial_number_right
      },
      ear: dp.ear || dp.earSide || dp.side,
      raw: dp
    };
    // use debug to avoid noise in production logs; frontend dev tooling shows console.debug
    console.debug('[PatientDeviceCard] debugDisplay:', debugDisplay);
  } catch (e) {
    console.debug('[PatientDeviceCard] debug logging failed', e);
  }

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
            {/* Delivery & Loaner Badges */}
            <div className="flex flex-wrap gap-2 mt-1">
              {/* Delivery Status */}
              {(device as any).deliveryStatus === 'pending' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  Teslim Edilmedi
                </span>
              )}
              {(device as any).deliveryStatus === 'delivered' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  Teslim Edildi
                </span>
              )}

              {/* Loaner Status */}
              {(device as any).isLoaner && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  Emanet Cihaz
                </span>
              )}

              {/* Report Status Badge */}
              {device.reason === 'sale' && ((device as any).reportStatus || (device as any).report_status) && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                  ${['raporlu', 'received', 'has_report', 'true'].includes(((device as any).reportStatus || (device as any).report_status || '').toLowerCase()) ? 'bg-green-100 text-green-800 border-green-200' :
                    ['bekleniyor', 'pending'].includes(((device as any).reportStatus || (device as any).report_status || '').toLowerCase()) ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'}`}>
                  {['raporlu', 'received', 'has_report', 'true'].includes(((device as any).reportStatus || (device as any).report_status || '').toLowerCase()) ? 'Rapor Teslim Alındı' :
                    ['bekleniyor', 'pending'].includes(((device as any).reportStatus || (device as any).report_status || '').toLowerCase()) ? 'Rapor Bekleniyor' : 'Raporsuz'}
                </span>
              )}
            </div>
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
            <span className="text-gray-500">Atama ID:</span>
            <p className="font-medium text-gray-900 font-mono text-xs">{(device as any).assignmentUid || (device as any).saleId || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Barkod No:</span>
            <p className="font-medium text-gray-900 font-mono">{(device as any).barcode || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Seri No:</span>
            <p className="font-medium text-gray-900 font-mono">
              {/* For bilateral cards, show the correct serial based on ear side */}
              {(() => {
                const dp: any = device as any;
                const earSide = dp.earSide || device.ear || '';
                const isRight = earSide === 'RIGHT' || earSide === 'right' || earSide === 'R';
                const isLeft = earSide === 'LEFT' || earSide === 'left' || earSide === 'L';

                // Primary: Try regular serial numbers
                if (isRight && (dp.serialNumberRight || dp.serial_number_right)) return dp.serialNumberRight || dp.serial_number_right;
                if (isLeft && (dp.serialNumberLeft || dp.serial_number_left)) return dp.serialNumberLeft || dp.serial_number_left;
                if (dp.serialNumber || dp.serial_number) return dp.serialNumber || dp.serial_number;

                // Fallback: If isLoaner, show loaner serial numbers
                const isLoaner = dp.isLoaner || dp.is_loaner || dp.isLoanerDevice || false;
                if (isLoaner) {
                  if (isRight && (dp.loanerSerialNumberRight || dp.loaner_serial_number_right)) return dp.loanerSerialNumberRight || dp.loaner_serial_number_right;
                  if (isLeft && (dp.loanerSerialNumberLeft || dp.loaner_serial_number_left)) return dp.loanerSerialNumberLeft || dp.loaner_serial_number_left;
                  if (dp.loanerSerialNumber || dp.loaner_serial_number) return dp.loanerSerialNumber || dp.loaner_serial_number;
                }

                return '-';
              })()}
            </p>
          </div>

          {/* Report Status - Only show for Sale */}


          <div>
            <span className="text-gray-500">Atama Nedeni:</span>
            <p className="font-medium text-gray-900">{getReasonText(device.reason)}</p>
          </div>
          <div>
            <span className="text-gray-500">Atama Tarihi:</span>
            <p className="font-medium text-gray-900">{formatDate(device.assignedDate)}</p>
          </div>

          {/* Conditional Fields - Only show for 'sale' */}
          {device.reason === 'sale' && (
            <>
              <div>
                <span className="text-gray-500">SGK Destek Türü:</span>
                <p className="font-medium text-gray-900">{getSgkSupportText((device as any).sgkScheme || (device as any).sgkSupportType)}</p>
              </div>
              <div>
                <span className="text-gray-500">Liste Fiyatı:</span>
                <p className="font-medium text-gray-900">{formatCurrency(device.listPrice)}</p>
              </div>
              <div>
                <span className="text-gray-500">Satış Fiyatı:</span>
                <p className="font-medium text-gray-900">
                  {(() => {
                    const dp: any = device as any;


                    // Prefer showing per-unit sale price for the card.
                    // Order: 1) explicit per-item salePricePerItem, 2) salePrice / qty, 3) netPayable / qty, 4) listPrice
                    const earVal = (dp.ear || dp.earSide || dp.ear_side || '').toString().toLowerCase();
                    const qty = (earVal.startsWith('b') || earVal === 'both' || earVal === 'bilateral') ? 2 : 1;

                    const explicitPerItem = dp.salePricePerItem ?? dp.sale_price_per_item ?? dp.perItem?.sale_price ?? null;
                    if (explicitPerItem !== null && explicitPerItem !== undefined) {
                      console.debug('[PatientDeviceCard] display -> salePricePerItem', explicitPerItem);
                      return formatCurrency(explicitPerItem);
                    }

                    // Treat `salePrice` stored on the assignment as the per-item sale price.
                    if (dp.salePrice !== undefined && dp.salePrice !== null) {
                      console.debug('[PatientDeviceCard] display -> salePrice (per-item assumed)', dp.salePrice);
                      return formatCurrency(Number(dp.salePrice));
                    }

                    // If only netPayable is available, and quantity>1, derive per-item from netPayable/qty.
                    if (dp.netPayable !== undefined && dp.netPayable !== null) {
                      const perUnitNet = Number(dp.netPayable) / Math.max(1, qty);
                      console.debug('[PatientDeviceCard] display -> netPayable(perUnit)', perUnitNet, 'qty=', qty);
                      return formatCurrency(perUnitNet);
                    }

                    if (dp.listPrice !== undefined && dp.listPrice !== null) {
                      return formatCurrency(dp.listPrice);
                    }

                    return '-';
                  })()}
                </p>
              </div>

              {/* SGK Support */}
              {(() => {
                const dp: any = device as any;
                // Determine quantity from ear
                const earVal = (dp.ear || dp.earSide || dp.ear_side || '').toString().toLowerCase();
                const qty = (earVal.startsWith('b') || earVal === 'both' || earVal === 'bilateral') ? 2 : 1;

                // Prefer explicit per-item SGK if present
                const explicitPerItemSgk = dp.sgkSupportPerItem ?? dp.sgk_support_per_item ?? dp.perItem?.sgk_support ?? null;
                if (explicitPerItemSgk !== null && explicitPerItemSgk !== undefined) {
                  return (
                    <div>
                      <span className="text-gray-500">SGK Desteği:</span>
                      <p className="font-medium text-green-600">{formatCurrency(explicitPerItemSgk)}</p>
                    </div>
                  );
                }

                // Fallback: take available SGK fields. The backend sometimes returns either
                //  - total SGK for the assignment (for bilateral assignments), or
                //  - per-item SGK already. We must detect which one we have and avoid
                //  dividing a per-item value by the quantity (causing half values).
                const rawSgk = dp.sgkSupport ?? dp.sgk_support ?? dp.sgkReduction ?? dp.sgk_coverage_amount ?? null;
                if (rawSgk !== null && rawSgk !== undefined) {
                  const rawSgkNum = Number(rawSgk);
                  console.log('[PatientDeviceCard] deviceId=', dp.id || dp.assignmentId || dp.deviceId, 'ear=', earVal, 'rawSgk=', rawSgkNum, 'qty=', qty);
                  let perUnit: number;

                  if (qty > 1) {
                    // Try to detect whether rawSgk is a total (needs division) or already per-item.
                    // Heuristic: if rawSgk is larger than the per-item sale/list price, it's likely a total.
                    const compareBase = Number(dp.salePrice ?? dp.sale_price ?? dp.listPrice ?? dp.list_price ?? dp.netPayable ?? dp.net_payable ?? 0);
                    console.log('[PatientDeviceCard] compareBase=', compareBase);
                    if (compareBase > 0 && rawSgkNum > compareBase * 1.1) {
                      // rawSgk appears to be a total across both ears -> divide
                      perUnit = rawSgkNum / qty;
                      console.log('[PatientDeviceCard] rawSgk looks like total; dividing -> perUnit=', perUnit);
                    } else {
                      // rawSgk looks like it's already a per-item amount -> use as-is
                      perUnit = rawSgkNum;
                      console.log('[PatientDeviceCard] rawSgk looks like per-item; using as-is -> perUnit=', perUnit);
                    }
                  } else {
                    perUnit = rawSgkNum;
                    console.log('[PatientDeviceCard] qty=1; perUnit=', perUnit);
                  }

                  return (
                    <div>
                      <span className="text-gray-500">SGK Desteği:</span>
                      <p className="font-medium text-green-600">{formatCurrency(perUnit)}</p>
                    </div>
                  );
                }

                return null;
              })()}

              <div>
                <span className="text-gray-500">Ödeme Yöntemi:</span>
                <p className="font-medium text-gray-900">{getPaymentMethodText(device.paymentMethod)}</p>
              </div>
            </>
          )}

          {device.assignedBy && (
            <div>
              <span className="text-gray-500">Atayan:</span>
              <p className="font-medium text-gray-900">{device.assignedBy}</p>
            </div>
          )}
        </div>

        {(device.notes || (device as any).isLoaner) && (
          <div className="pt-2 border-t text-xs">
            {device.notes && (
              <>
                <span className="text-gray-500 block">Notlar:</span>
                <p className="text-gray-700 mt-1">{device.notes}</p>
              </>
            )}

            {(device as any).isLoaner && (
              <div className={`mt-2 p-2 bg-purple-50 rounded border border-purple-100 ${!device.notes ? 'mt-0' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-purple-800 font-semibold block mb-1">Emanet Cihaz Verildi:</span>
                    <p className="text-purple-700">
                      {(device as any).loanerBrand} {(device as any).loanerModel}
                      {(() => {
                        const dp: any = device as any;
                        const side = (dp.earSide || dp.ear || '').toLowerCase();
                        const isRight = side === 'right' || side === 'r' || side === 'sağ';
                        const isLeft = side === 'left' || side === 'l' || side === 'sol';

                        let sn = dp.loanerSerialNumber;

                        if (isRight) {
                          sn = dp.loanerSerialNumberRight ?? dp.loaner_serial_number_right ?? sn;
                        } else if (isLeft) {
                          sn = dp.loanerSerialNumberLeft ?? dp.loaner_serial_number_left ?? sn;
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
                      className="ml-2 px-2 py-1 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded hover:bg-purple-100 transition-colors flex items-center gap-1 shadow-sm"
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
