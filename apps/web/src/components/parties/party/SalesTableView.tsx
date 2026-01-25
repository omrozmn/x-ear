import React, { useState } from 'react';
import { SaleRead } from '../../../api/generated/schemas/saleRead';
import type { DeviceAssignmentRead } from '../../../api/generated/schemas/deviceAssignmentRead';
import {
  MoreVertical,
  Eye,
  Edit,
  FileText,
  Banknote,
  FolderOpen,
  Ban
} from 'lucide-react';
import { Button } from '../../ui/Button';

interface SalesTableViewProps {
  sales: SaleRead[];
  partyId: string;
  onSaleClick?: (sale: SaleRead) => void;
  onEditSale?: (sale: SaleRead) => void;
  onCreateInvoice?: (sale: SaleRead) => void;
  onViewInvoice?: (sale: SaleRead) => void;
  onManagePromissoryNotes?: (sale: SaleRead) => void;
  onCollectPayment?: (sale: SaleRead) => void;
  onOpenDocuments?: (partyId: string) => void;
  onCancelSale?: (sale: SaleRead) => void;
}

// Extended interface to handle runtime properties missing from schema
interface ExtendedSaleRead extends SaleRead {
  // SaleRead already has devices, just need to add missing properties
  remainingAmount?: number;
}

export const SalesTableView: React.FC<SalesTableViewProps> = ({
  sales: rawSales,
  partyId,
  onSaleClick,
  onEditSale,
  onCreateInvoice,
  onViewInvoice,
  onManagePromissoryNotes,
  onCollectPayment: _onCollectPayment,
  onOpenDocuments,
  onCancelSale
}) => {
  const sales = rawSales as unknown as ExtendedSaleRead[];
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    // dateString can be Date object in some weird cases or str, relying on str from API
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount?: number) => {
    const safe = amount ?? 0;
    try {
      return safe.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TRY';
    } catch (e) {
      return `${Number(safe).toFixed(2)} TRY`;
    }
  };

  /* Removed incorrect client-side VAT calculation. 
     Backend's finalAmount/totalAmount is already the correct figure. */

  const renderDevicesSummary = (sale: ExtendedSaleRead) => {
    const devices = sale.devices || [];
    if (!devices || devices.length === 0) {
      return <span className="text-gray-500">Ürün/Hizmet</span>;
    }

    return (
      <div className="space-y-1">
        {devices.slice(0, 2).map((device, index: number) => (
          <div key={index} className="text-sm">
            <div className="font-medium text-gray-900">{device.deviceName || 'Cihaz'}</div>
            <div className="text-xs text-gray-500">{device.brand} {device.model}</div>
          </div>
        ))}
        {devices.length > 2 && (
          <div className="text-xs text-gray-500">+{devices.length - 2} daha...</div>
        )}
      </div>
    );
  };

  const renderBarcodeSerialInfo = (sale: ExtendedSaleRead) => {
    const devices = sale.devices || [];
    if (!devices || devices.length === 0) {
      return <span className="text-gray-500">-</span>;
    }

    const device = devices[0];
    return (
      <div className="text-sm">
        {device.serialNumber && <div className="font-mono">{device.serialNumber}</div>}
        {device.serialNumber && <div className="text-xs text-gray-500">{device.serialNumber}</div>}
      </div>
    );
  };

  const renderPaymentMethods = (sale: SaleRead) => {
    const methods: string[] = [];
    if (sale.paymentMethod === 'cash') methods.push('Nakit');
    if (sale.paymentMethod === 'card') methods.push('Kart');
    if (sale.paymentMethod === 'installment') methods.push('Taksit');
    if (sale.sgkCoverage && sale.sgkCoverage > 0) methods.push('SGK');

    return methods.join(', ') || 'Belirtilmemiş';
  };

  const renderStatusBadge = (status?: string, paidAmount: number = 0, remainingAmount: number = 0) => {
    const s = status ?? (remainingAmount <= 0 ? 'completed' : paidAmount > 0 ? 'pending' : 'pending');
    if (s === 'cancelled') {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">İptal Edildi</span>;
    }

    if (remainingAmount <= 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Tamamlandı</span>;
    }

    if (paidAmount > 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Kısmi Ödeme</span>;
    }

    return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Bekliyor</span>;
  };

  const toggleOverflowMenu = (e: React.MouseEvent, saleId: string | number | undefined) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === String(saleId) ? null : String(saleId));
  };

  const closeOverflowMenu = () => {
    setOpenMenuId(null);
  };

  console.log('📋 SalesTableView: Rendering sales table with', sales?.length || 0, 'sales');
  if (sales && sales.length > 0) {
    console.log('📋 Sales data sample:', sales[0]);
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Satış ID/Tarih
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ürün/Hizmet
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Barkod/Seri No
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Liste Fiyatı
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              SGK Desteği
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              İndirim
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Toplam Tutar
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Alınan Ödeme
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kalan Tutar
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Durum
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(!sales || sales.length === 0) ? (
            <tr>
              <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                Henüz satış kaydı bulunmuyor
              </td>
            </tr>
          ) : (
            sales.map((sale) => {
              // GOLDEN PATH: Trust the backend's computed values
              const displayTotal = sale.finalAmount ?? sale.totalAmount ?? 0;
              const paidAmount = sale.paidAmount ?? 0;
              const remainingAmount = sale.remainingAmount ?? 0;
              const discountAmount = sale.discountAmount ?? 0;
              const listPrice = sale.listPriceTotal ?? sale.totalAmount ?? 0;
              const sgkCoverage = sale.sgkCoverage ?? 0;

              const hasInvoice = Boolean(sale.invoice);
              // Backend 'status' is authoritative
              const statusStr = sale.status;
              const cancelledClass = statusStr === 'cancelled' ? 'opacity-50 line-through pointer-events-none' : '';
              const partialPaymentClass = paidAmount > 0 && remainingAmount > 0 ? 'bg-yellow-50' : '';

              return (
                <tr
                  key={String(sale.id)}
                  className={`hover:bg-gray-50 ${partialPaymentClass} ${cancelledClass} cursor-pointer transition-colors`}
                  onClick={() => onSaleClick?.(sale)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">{sale.id}</div>
                    <div className="text-xs text-gray-600">{formatDate(sale.saleDate ?? undefined)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {renderDevicesSummary(sale)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {renderBarcodeSerialInfo(sale)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(listPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                    {sgkCoverage > 0 ? formatCurrency(sgkCoverage) : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${discountAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {discountAmount > 0 ? '-' : ''}{formatCurrency(discountAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(displayTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-700">
                    <div>{formatCurrency(paidAmount)}</div>
                    <div className="text-xs text-gray-600">{renderPaymentMethods(sale)}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${remainingAmount > 0 ? 'text-orange-700' : 'text-gray-500'}`}>
                    {formatCurrency(remainingAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {renderStatusBadge(statusStr ?? undefined, paidAmount, remainingAmount)}
                    {hasInvoice && (
                      <span className="block mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Fatura Oluşturuldu
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        className="w-9 h-9 p-0"
                        onClick={(e) => toggleOverflowMenu(e, sale.id)}
                        aria-label="Aksiyonlar"
                        aria-haspopup="true"
                        aria-expanded={openMenuId === String(sale.id)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>

                      {/* Overflow Menu */}
                      {openMenuId === String(sale.id) && (
                        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                onSaleClick?.(sale);
                                closeOverflowMenu();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Görüntüle
                            </button>
                            <button
                              onClick={() => {
                                onEditSale?.(sale);
                                closeOverflowMenu();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </button>
                            {hasInvoice ? (
                              <button
                                onClick={() => {
                                  onViewInvoice?.(sale);
                                  closeOverflowMenu();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Fatura Önizle
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onCreateInvoice?.(sale);
                                  closeOverflowMenu();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Fatura Oluştur
                              </button>
                            )}
                            <button
                              onClick={() => {
                                onManagePromissoryNotes?.(sale);
                                closeOverflowMenu();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Banknote className="w-4 h-4 mr-2" />
                              Senetler
                            </button>
                            <button
                              onClick={() => {
                                onOpenDocuments?.(partyId);
                                closeOverflowMenu();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Belgeler
                            </button>
                            <button
                              onClick={() => {
                                onCancelSale?.(sale);
                                closeOverflowMenu();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Satışı İptal Et
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};