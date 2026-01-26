import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, MoreVertical, Eye, Edit, FileText, File } from 'lucide-react';
import type { SaleRead } from '@/api/client/sales.client';
import { ExtendedSaleRead } from '@/types/extended-sales';

interface SalesListProps {
  sales: SaleRead[];
  filteredSales: SaleRead[];
  hasActiveFilters?: boolean;
  onSaleClick: (sale: SaleRead) => void;
  onCreateInvoice: (sale: SaleRead) => void;
  onViewInvoice: (sale: SaleRead) => void;
  onManagePromissoryNotes: (sale: SaleRead) => void;
  onCollectPayment: (sale: SaleRead) => void;
  onManageInstallments: (sale: SaleRead) => void;
}

export const SalesList: React.FC<SalesListProps> = ({
  sales,
  filteredSales,
  hasActiveFilters = false,
  onSaleClick,
  onCreateInvoice,
  onViewInvoice,
  onManagePromissoryNotes,
  onCollectPayment,
  onManageInstallments
}) => {
  console.log('SalesList - sales:', sales);
  console.log('SalesList - filteredSales:', filteredSales);
  console.log('SalesList - hasActiveFilters:', hasActiveFilters);
  const [openMenuSaleId, setOpenMenuSaleId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!menuRef.current.contains(e.target)) {
        setOpenMenuSaleId(null);
      }
    }

    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);
  if (filteredSales.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {sales.length === 0
            ? 'Henüz satış yapılmamış'
            : hasActiveFilters
              ? 'Filtreye uygun satış bulunamadı'
              : 'Henüz satış kaydı bulunmuyor'
          }
        </h3>
        <p className="text-gray-500">
          {sales.length === 0
            ? 'Bu hastaya henüz satış işlemi gerçekleştirilmemiş.'
            : hasActiveFilters
              ? 'Lütfen filtre kriterlerinizi kontrol edin.'
              : 'Yeni satış eklemek için "Yeni Satış" butonunu kullanın.'
          }
        </p>
      </div>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₺0';
    return `₺${amount.toLocaleString('tr-TR')}`;
  };

  const renderDevicesSummary = (sale: SaleRead) => {
    const saleData = sale as unknown as Record<string, unknown>;
    const devices = saleData.devices as Array<Record<string, unknown>> | undefined;

    if (devices && devices.length > 0) {
      return devices.map((d, index: number) => (
        <div key={index} className="mb-1">
          <div className="font-medium text-gray-900">{(d.name || d.model || 'Cihaz') as string}</div>
          <div className="text-xs text-gray-600">Marka: {(d.brand || '-') as string} | Model: {(d.model || '-') as string}</div>
        </div>
      ));
    }

    // If no devices array but productId exists, show product info
    if (sale.productId) {
      return (
        <div className="mb-1">
          <div className="font-medium text-gray-900">Ürün ID: {sale.productId}</div>
          <div className="text-xs text-gray-600">Envanter ürünü</div>
        </div>
      );
    }

    return <div className="text-gray-500 text-sm">Ürün bilgisi yok</div>;
  };

  const renderBarcodeSerialInfo = (sale: SaleRead) => {
    const saleData = sale as unknown as Record<string, unknown>;
    const devices = saleData.devices as Array<Record<string, unknown>> | undefined;

    if (devices && devices.length > 0) {
      const device = devices[0];
      const barcode = (device.barcode || device.serialNumber || '-') as string;
      const serial = (device.serialNumber || '-') as string;

      return (
        <div>
          <div className="font-medium">{barcode}</div>
          <div className="text-xs text-gray-600">{serial}</div>
        </div>
      );
    }

    // If no devices but productId exists, show productId as barcode
    if (sale.productId) {
      return (
        <div>
          <div className="font-medium">{sale.productId}</div>
          <div className="text-xs text-gray-600">Ürün Kodu</div>
        </div>
      );
    }

    return '-';
  };

  const renderPaymentMethods = (sale: SaleRead) => {
    const saleData = sale as unknown as ExtendedSaleRead;
    const paymentRecords = saleData.paymentRecords as Array<{ status?: string, paymentMethod?: string, amount?: number }> | undefined;

    if (paymentRecords && paymentRecords.length > 0) {
      const paidRecords = paymentRecords.filter((r) => ((r.status || 'paid') as string) === 'paid');
      return paidRecords.map((record, index: number) => {
        const methodLabels: Record<string, string> = {
          'cash': 'Nakit',
          'card': 'Kart',
          'transfer': 'Havale',
          'installment': 'Taksit',
          'promissory_note': 'Senet'
        };
        const method = methodLabels[record.paymentMethod as string] || (record.paymentMethod as string);
        const amount = record.amount as number | undefined;
        return (
          <div key={index} className="text-xs">
            {method}:{amount?.toLocaleString('tr-TR')}
          </div>
        );
      });
    }

    const paymentMethod = sale.paymentMethod || 'cash';
    const methodLabels: Record<string, string> = {
      'cash': 'Nakit',
      'card': 'Kart',
      'transfer': 'Havale',
      'installment': 'Taksit',
      'promissory_note': 'Senet'
    };

    return methodLabels[paymentMethod] || paymentMethod;
  };

  const renderStatusBadge = (status: string, paidAmount = 0, remainingAmount = 0) => {
    if (paidAmount > 0 && remainingAmount > 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Kısmi Ödendi</span>;
    } else if (paidAmount > 0 && remainingAmount === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ödendi</span>;
    }

    const badges: Record<string, React.ReactElement> = {
      'paid': <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ödendi</span>,
      'pending': <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Beklemede</span>,
      'partial': <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Kısmi Ödendi</span>,
      'cancelled': <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">İptal edildi</span>,
      'completed': <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Tamamlandı</span>
    };
    return badges[status] || badges['pending'];
  };

  const calculatePaidAmount = (sale: SaleRead) => {
    const extendedSale = sale as unknown as ExtendedSaleRead;
    if (extendedSale.paidAmount !== undefined && extendedSale.paidAmount !== null) {
      return parseFloat(String(extendedSale.paidAmount)) || 0;
    } else if (extendedSale.paid_amount !== undefined && extendedSale.paid_amount !== null) {
      return parseFloat(String(extendedSale.paid_amount)) || 0;
    } else if (extendedSale.paymentRecords && Array.isArray(extendedSale.paymentRecords)) {
      const paymentRecords = extendedSale.paymentRecords as Array<{ status?: string; amount?: number }>;
      const paidRecords = paymentRecords.filter((r) => ((r.status || 'paid') as string) === 'paid');
      return paidRecords.reduce((sum: number, record) => sum + ((record.amount as number) || 0), 0);
    }
    return 0;
  };

  const calculatePartyPayable = (sale: SaleRead) => {
    const extendedSale = sale as unknown as ExtendedSaleRead;
    // Return final amount directly as backend handles VAT logic and inclusivity
    const partyPayable = extendedSale.party_payment || extendedSale.partyPayment || extendedSale.totalPartyPayment || extendedSale.finalAmount || extendedSale.final_amount;

    if (typeof partyPayable === 'number') return partyPayable;

    // Fallback calculation if finalAmount not explicit
    const total = extendedSale.totalAmount || 0;
    const discount = extendedSale.discountAmount || (extendedSale.discount_amount as number) || 0;
    const sgk = extendedSale.sgkCoverage || 0;
    return total - discount - sgk;
  };

  // Deprecated client-side VAT calculation
  const calculateTotalWithVat = (sale: SaleRead) => {
    return calculatePartyPayable(sale);
  };

  const calculateRemaining = (sale: SaleRead) => {
    const total = calculateTotalWithVat(sale);
    const paid = calculatePaidAmount(sale);
    return Math.max(0, total - paid);
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto" role="table" aria-label="Hasta satışları tablosu">
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
                İndirim
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                SGK Desteği
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
            {filteredSales.map((sale) => {
              const paid = calculatePaidAmount(sale);
              const remaining = calculateRemaining(sale);
              const cancelledClass = sale.status === 'cancelled' ? 'opacity-50 line-through pointer-events-none' : '';

              return (
                <tr
                  key={sale.id}
                  className={`hover:bg-gray-50 ${paid > 0 && remaining > 0 ? 'bg-yellow-50' : ''} ${cancelledClass} cursor-pointer transition-colors`}
                  onClick={() => onSaleClick(sale)}
                  role="row"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">{sale.id}</div>
                    <div className="text-xs text-gray-600">
                      {new Date(sale.saleDate || sale.createdAt || '').toLocaleDateString('tr-TR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {renderDevicesSummary(sale)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {renderBarcodeSerialInfo(sale)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency((sale as unknown as ExtendedSaleRead).totalAmount || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                    {(sale as unknown as ExtendedSaleRead).discountAmount ? `-${formatCurrency((sale as unknown as ExtendedSaleRead).discountAmount)}` : formatCurrency(0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
                    {(sale as unknown as ExtendedSaleRead).sgkCoverage ? `-${formatCurrency((sale as unknown as ExtendedSaleRead).sgkCoverage)}` : formatCurrency(0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(calculateTotalWithVat(sale))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-700">
                    <div>{formatCurrency(paid)}</div>
                    <div className="text-xs text-gray-600">{renderPaymentMethods(sale)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-orange-700">
                    {formatCurrency(remaining)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {renderStatusBadge(sale.status || '', paid, remaining)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      data-allow-raw="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuSaleId(prev => prev === sale.id ? null : (sale.id as string));
                      }}
                      aria-haspopup="true"
                      aria-expanded={openMenuSaleId === sale.id}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>

                    {openMenuSaleId === sale.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <ul className="py-1">
                          <li>
                            <button
                              data-allow-raw="true"
                              onClick={(e) => { e.stopPropagation(); onViewInvoice(sale); setOpenMenuSaleId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="inline mr-2 w-4 h-4 align-middle" /> Görüntüle Fatura
                            </button>
                          </li>
                          <li>
                            <button
                              data-allow-raw="true"
                              onClick={(e) => { e.stopPropagation(); onCreateInvoice(sale); setOpenMenuSaleId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <FileText className="inline mr-2 w-4 h-4 align-middle" /> Fatura Oluştur
                            </button>
                          </li>
                          <li>
                            <button
                              data-allow-raw="true"
                              onClick={(e) => { e.stopPropagation(); onCollectPayment(sale); setOpenMenuSaleId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <DollarSign className="inline mr-2 w-4 h-4 align-middle" /> Tahsilat Yap
                            </button>
                          </li>
                          <li>
                            <button
                              data-allow-raw="true"
                              onClick={(e) => { e.stopPropagation(); onManagePromissoryNotes(sale); setOpenMenuSaleId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <File className="inline mr-2 w-4 h-4 align-middle" /> Senet İşlemleri
                            </button>
                          </li>
                          <li>
                            <button
                              data-allow-raw="true"
                              onClick={(e) => { e.stopPropagation(); onManageInstallments(sale); setOpenMenuSaleId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="inline mr-2 w-4 h-4 align-middle" /> Taksit İşlemleri
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};