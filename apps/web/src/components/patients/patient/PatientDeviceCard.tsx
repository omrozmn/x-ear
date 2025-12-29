import React from 'react';
import { LoanerInfoCard } from './LoanerInfoCard';
import { PatientDevice } from '../../../types/patient';
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
  FileText,
  Package,
  PackageCheck,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';
import { LoanerDeviceModal } from './LoanerDeviceModal';

interface PatientDeviceCardProps {
  device: PatientDevice;
  onDeviceClick?: (device: PatientDevice) => void;
  onUpdate?: (deviceId: string, updates: Partial<PatientDevice>) => Promise<void>;
  onLoanerReturn?: (deviceId: string) => Promise<void>;
  inventoryItems?: Array<{ id?: string; name?: string; brand?: string; model?: string; availableInventory?: number }>;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}

export const PatientDeviceCard: React.FC<PatientDeviceCardProps> = ({
  device,
  onDeviceClick,
  onUpdate,
  onLoanerReturn,
  inventoryItems = [],
  onEditClick,
  onDeleteClick
}) => {
  const [showLoanerModal, setShowLoanerModal] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'Belirtilmemiş';
    return `${Number(amount).toLocaleString('tr-TR')} ₺`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'lost': return 'bg-red-100 text-red-800 border-red-200';
      case 'trial': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'maintenance': return 'Bakımda';
      case 'lost': return 'Kayıp';
      case 'trial': return 'Deneme';
      case 'assigned': return 'Atandı';
      default: return status;
    }
  };

  const getEarColor = (ear?: string) => {
    if (!ear) return { border: 'border-l-4 border-l-gray-400', bg: 'bg-gray-50', text: 'text-gray-700', label: 'Belirtilmemiş' };
    const normalized = ear.toLowerCase();

    switch (normalized) {
      case 'l':
      case 'left':
      case 'sol':
        return {
          border: 'border-l-4 border-l-blue-500',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          label: 'Sol Kulak'
        };
      case 'r':
      case 'right':
      case 'sag':
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

  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    setIsDeleting(true);
    onDeleteClick?.();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    onEditClick?.();
  };

  const handleDeliveryStatusToggle = async () => {
    if (!onUpdate) return;

    console.log('🔄 [DeliveryToggle] BAŞLANGIÇ - Mevcut device:', {
      id: device.id,
      deliveryStatus: device.deliveryStatus,
      deliveryStatusSnake: (device as any).delivery_status
    });

    setIsUpdating(true);
    try {
      const newStatus = device.deliveryStatus === 'delivered' ? 'pending' : 'delivered';
      console.log('🔄 [DeliveryToggle] Yeni durum:', newStatus, '← Eski:', device.deliveryStatus);

      await onUpdate(device.id, { deliveryStatus: newStatus });

      console.log('✅ [DeliveryToggle] onUpdate tamamlandı');
    } catch (error) {
      console.error('❌ [DeliveryToggle] HATA:', error);
    } finally {
      setIsUpdating(false);
      console.log('🔄 [DeliveryToggle] BİTİŞ - isUpdating=false');
    }
  };

  const handleAddLoaner = async (loanerInventoryId: string, loanerSerialNumber: string) => {
    if (!onUpdate) return;

    await onUpdate(device.id, {
      isLoaner: true,
      loanerInventoryId,
      loanerSerialNumber
    });
  };

  const handleReturnLoaner = async () => {
    if (!onLoanerReturn) return;

    setIsUpdating(true);
    try {
      await onLoanerReturn(device.id);
    } catch (error) {
      console.error('Failed to return loaner:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const earStyle = getEarColor(device.side || device.ear);

  // Debug: log device payload and report-related fields so we can inspect backend shape
  React.useEffect(() => {
    try {
      const d: any = device as any;
      console.debug('[PatientDeviceCard] device id ->', d?.id || d?.deviceId || '(no-id)');
      try {
        console.debug('[PatientDeviceCard] raw device JSON ->', JSON.stringify(d));
      } catch (e) {
        console.debug('[PatientDeviceCard] raw device object ->', d);
      }
      try {
        console.debug('[PatientDeviceCard] report fields JSON ->', JSON.stringify({
          reportStatus: d.reportStatus,
          report_status: d.report_status,
          hasReport: d.hasReport,
          has_report: d.has_report,
          reports: d.reports,
        }));
      } catch (e) {
        console.debug('[PatientDeviceCard] report fields ->', {
          reportStatus: d.reportStatus,
          report_status: d.report_status,
          hasReport: d.hasReport,
          has_report: d.has_report,
          reports: d.reports,
        });
      }
      try {
        console.debug('[PatientDeviceCard] deliveryStatus JSON ->', JSON.stringify({ deliveryStatus: d.deliveryStatus || d.delivery_status }));
      } catch (e) {
        console.debug('[PatientDeviceCard] deliveryStatus fields ->', { deliveryStatus: d.deliveryStatus || d.delivery_status });
      }
    } catch (e) {
      // ignore
    }
  }, [device]);

  // Watch deliveryStatus changes specifically
  React.useEffect(() => {
    const d: any = device as any;
    console.log('🎯 [PatientDeviceCard] deliveryStatus değişti:', {
      deviceId: d?.id || d?.deviceId,
      deliveryStatus: device.deliveryStatus,
      delivery_status_snake: d.delivery_status,
      timestamp: new Date().toISOString()
    });
  }, [device.deliveryStatus, device]);

  return (
    <>
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

                    {/* Delivery Status Badge */}
                    {device.deliveryStatus === 'pending' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border-yellow-200">
                        Teslim Bekliyor
                      </span>
                    )}
                    {device.deliveryStatus === 'delivered' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border-green-200">
                        Teslim Edildi
                      </span>
                    )}

                    {/* Loaner Badge */}
                    {(device as any).isLoaner && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border-purple-200">
                        Emanet Cihaz
                      </span>
                    )}

                    {/* Report Status Badge: support multiple backend field names and show green for reported */}
                    {(() => {
                      const d: any = device as any;
                      const status = (d.reportStatus || d.report_status || '').toLowerCase();
                      const reason = (d.reason || '').toLowerCase();
                      const isSale = reason === 'sale';

                      // If not a sale and no report status, don't show badge
                      if (!status && !isSale) return null;

                      // Normalize to new values for display
                      let normalizedStatus = status;
                      if (!normalizedStatus && isSale) normalizedStatus = 'none'; // Default for sale

                      if (status === 'raporlu' || status === 'has_report' || d.hasReport === true) normalizedStatus = 'received';
                      if (status === 'bekleniyor') normalizedStatus = 'pending';
                      if (status === 'raporsuz') normalizedStatus = 'none';

                      switch (normalizedStatus) {
                        case 'received':
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border-green-200">
                              Rapor Teslim Alındı
                            </span>
                          );
                        case 'pending':
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border-orange-200">
                              Rapor Bekleniyor
                            </span>
                          );
                        case 'none':
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border-gray-200">
                              Raporsuz Özel Satış
                            </span>
                          );
                        default:
                          // Fallback for legacy "raporlu" boolean or strings if normalization missed something
                          if (status === 'true' || status.includes('report') || status.includes('rapor')) {
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border-green-200">
                                Rapor Teslim Alındı
                              </span>
                            );
                          }
                          return null;
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {onEditClick && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditClick(); }}
                    className="p-2 text-gray-500 hover:bg-white hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                    title="Düzenle"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {onDeleteClick && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
                    className="p-2 text-gray-500 hover:bg-white hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                    title="Kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

            {/* Device Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500 flex items-center">
                  <Settings className="w-3 h-3 mr-1" />
                  Seri No:
                </span>
                {/* Specific Handling for Bilateral Serial Numbers */}
                {device.serialNumberLeft && device.serialNumberRight ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-xs bg-red-50 text-red-700 px-1 rounded">R: {device.serialNumberRight}</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-1 rounded">L: {device.serialNumberLeft}</span>
                  </div>
                ) : (
                  <p className="font-medium text-gray-900 mt-1">{device.serialNumber || 'Belirtilmemiş'}</p>
                )}
              </div>
              <div>
                <span className="text-gray-500">Tip:</span>
                <p className="font-medium text-gray-900 mt-1">{device.type || device.deviceType || 'Standart'}</p>
              </div>
              <div>
                <span className="text-gray-500 flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Liste Fiyatı:
                </span>
                <p className="font-medium text-gray-900 mt-1">{formatCurrency(Number(device.listPrice || device.price))}</p>
              </div>
              <div>
                <span className="text-gray-500 flex items-center">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Satış Fiyatı:
                </span>
                <p className="font-medium text-gray-900 mt-1">{formatCurrency(Number(device.salePrice || device.price))}</p>
              </div>
            </div>

            {/* Pricing and Payment Info */}
            {(device.sgkReduction !== undefined || device.patientPayment !== undefined || device.paymentMethod || device.saleId) && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Ödeme & Satış Bilgileri</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {device.saleId && (
                    <div className="md:col-span-3 pb-2 mb-2 border-b border-gray-200">
                      <span className="text-gray-500 mr-2">Satış ID:</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">{device.saleId}</span>
                    </div>
                  )}
                  {device.sgkReduction !== undefined && (
                    <div>
                      <span className="text-gray-500">SGK Katkısı:</span>
                      <p className="font-medium text-green-600">{formatCurrency(Number(device.sgkReduction))}</p>
                    </div>
                  )}
                  {device.patientPayment !== undefined && (
                    <div>
                      <span className="text-gray-500">Hasta Ödemesi:</span>
                      <p className="font-medium text-blue-600">{formatCurrency(Number(device.patientPayment))}</p>
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

            {/* Delivery Status - Explicit Toggle */}
            {onUpdate && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeliveryStatusToggle();
                  }}
                  disabled={isUpdating}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center ${device.deliveryStatus === 'delivered'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                >
                  {device.deliveryStatus === 'delivered' ? (
                    <>
                      <PackageCheck className="w-4 h-4" />
                      <span>Teslim Edildi</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      <span>Teslim Bekliyor (Teslim Et)</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-center text-gray-500 mt-1">
                  Durumu değiştirmek için tıklayın (Stok kontrolü yapılır)
                </p>
              </div>
            )}

            {onUpdate && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {device.isLoaner ? (
                  <LoanerInfoCard
                    device={device}
                    onReturn={handleReturnLoaner}
                    isUpdating={isUpdating}
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLoanerModal(true);
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-200 flex items-center justify-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Emanet Cihaz Ata
                  </button>
                )}
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

      {/* Loaner Device Modal */}
      <LoanerDeviceModal
        isOpen={showLoanerModal}
        onClose={() => setShowLoanerModal(false)}
        onSubmit={handleAddLoaner}
        inventoryItems={inventoryItems}
      />
    </>
  );
};