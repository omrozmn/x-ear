import React, { useState } from 'react';
import { PartySale } from '@/hooks/party/usePartySales';
import {
  MoreVertical,
  FileText,
  Banknote,
  Ban
} from 'lucide-react';
import { Button, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/PermissionGate';

interface SalesTableViewProps {
  sales: PartySale[];
  partyId?: string;
  onSaleClick?: (sale: PartySale) => void;
  onEditSale?: (sale: PartySale) => void;
  onCreateInvoice?: (sale: PartySale) => void;
  onViewInvoice?: (sale: PartySale) => void;
  onManagePromissoryNotes?: (sale: PartySale) => void;
  onCancelSale?: (sale: PartySale) => void;
  selectedSaleIds?: string[];
  onSelectionChange?: (saleIds: string[]) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
}

export const SalesTableView: React.FC<SalesTableViewProps> = ({
  sales,
  onSaleClick,
  onCreateInvoice,
  onViewInvoice,
  onManagePromissoryNotes,
  onCancelSale,
  selectedSaleIds = [],
  onSelectionChange,
  pagination,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canViewAmounts = isSuperAdmin || hasPermission('sensitive.sales.list.amounts.view');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    if (!canViewAmounts) return '***';
    return amount.toLocaleString('tr-TR') + ' TL';
  };

  const calculateDisplayTotal = (sale: PartySale) => {
    // Backend now provides the correct final amount (VAT inclusive if applicable)
    // Use nullish coalescing to accept 0 as a valid final amount
    return sale.finalAmount ?? (sale.totalAmount - (sale.discountAmount || 0) - (sale.sgkCoverage || 0));
  };

  const renderDevicesSummary = (sale: PartySale) => {
    if (!sale.devices || sale.devices.length === 0) {
      // Fallback to sale-level fields if no devices array
      if (sale.productName) {
        return (
          <div className="space-y-1">
            <div className="text-sm">
              <div className="font-medium text-gray-900">{sale.productName}</div>
              {(sale.brand || sale.model) && (
                <div className="text-xs text-gray-500">
                  {sale.brand} {sale.model}
                </div>
              )}
            </div>
          </div>
        );
      }
      return <span className="text-gray-500">Ürün/Hizmet</span>;
    }

    // ✅ FIXED: Prioritize productName from sale, then smart fallback
    const firstDevice = sale.devices[0];
    const isBilateral = sale.devices.length === 2;

    // Get all available data
    const saleProductName = sale.productName || '';  // e.g., "deneme" (from inventory.name)
    const deviceName = firstDevice.name || '';  // e.g., "earnet force100" (brand + model)
    const brand = firstDevice.brand || sale.brand || '';  // e.g., "earnet"
    const model = firstDevice.model || sale.model || '';  // e.g., "force100"

    // Build brand+model string
    const brandModel = `${brand} ${model}`.trim();

    // Decide what to show
    let title = '';
    let subtitle = '';

    if (saleProductName) {
      // We have a product name from sale - use it as title
      title = saleProductName;
      // Use brand+model or deviceName as subtitle
      subtitle = brandModel || deviceName;
    } else if (deviceName) {
      // No sale product name, use device name as title
      // Check if deviceName is same as brand+model to avoid duplication
      const isDuplicate = deviceName.toLowerCase() === brandModel.toLowerCase();

      if (isDuplicate) {
        // deviceName is same as brand+model, use category or generic name as title
        title = firstDevice.category || 'İşitme Cihazı';
        subtitle = deviceName;
      } else {
        // deviceName is different, use it as title
        title = deviceName;
        subtitle = brandModel;
      }
    } else {
      // Fallback
      title = brandModel || firstDevice.category || 'Ürün';
      subtitle = '';
    }

    return (
      <div className="space-y-1">
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {title}
            {isBilateral && <span className="ml-1 text-blue-600">(Bilateral)</span>}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBarcodeSerialInfo = (sale: PartySale) => {
    if (!sale.devices || sale.devices.length === 0) {
      return <span className="text-gray-500">-</span>;
    }

    // ✅ FIXED: Bilateral satışlarda tek barkod göster (User Request)
    // İlk cihazın barkodunu göster, bilateral olsa bile tek barkod
    const firstDevice = sale.devices[0];
    const deviceData = firstDevice as typeof firstDevice & {
      serialNumberLeft?: string;
      serialNumberRight?: string;
    };

    return (
      <div className="flex flex-col gap-1 overflow-hidden">
        <div className="text-sm">
          {/* Tek barkod göster (bilateral olsa bile) */}
          {deviceData.barcode && (
            <div className="font-mono text-[10px] bg-gray-100 px-1 rounded inline-block mb-1">
              {deviceData.barcode}
            </div>
          )}

          {/* Seri numaralar - bilateral ise her ikisini göster */}
          {sale.devices.length === 2 && (deviceData.serialNumberLeft || deviceData.serialNumberRight) ? (
            // Bilateral satış - sol ve sağ seri numaralarını göster
            <div className="space-y-1">
              {deviceData.serialNumberLeft && (
                <div className="text-xs text-gray-600 font-medium">
                  <span className="text-[10px] text-gray-400 mr-1 italic">Sol:</span>
                  {deviceData.serialNumberLeft}
                </div>
              )}
              {sale.devices[1] && (sale.devices[1] as typeof firstDevice & { serialNumberRight?: string }).serialNumberRight && (
                <div className="text-xs text-gray-600 font-medium">
                  <span className="text-[10px] text-gray-400 mr-1 italic">Sağ:</span>
                  {(sale.devices[1] as typeof firstDevice & { serialNumberRight?: string }).serialNumberRight}
                </div>
              )}
            </div>
          ) : (
            // Tek cihaz - standart seri numarası göster
            deviceData.serialNumber && (
              <div className="text-xs text-gray-600 font-medium">
                {deviceData.serialNumber} {deviceData.ear ? `(${deviceData.ear === 'left' ? 'Sol' : deviceData.ear === 'right' ? 'Sağ' : deviceData.ear})` : ''}
              </div>
            )
          )}

          {!deviceData.barcode && !deviceData.serialNumber && !deviceData.serialNumberLeft && !deviceData.serialNumberRight && (
            <div className="text-xs text-gray-400 italic">Barkod/Seri No Yok</div>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentMethods = (sale: PartySale) => {
    const methods: string[] = [];
    if (sale.paymentMethod === 'cash') methods.push('Nakit');
    if (sale.paymentMethod === 'card') methods.push('Kart');
    if (sale.paymentMethod === 'installment') methods.push('Taksit');
    if (sale.sgkCoverage && sale.sgkCoverage > 0) methods.push('SGK');

    return methods.join(', ') || 'Belirtilmemiş';
  };

  const renderStatusBadge = (status: string, paidAmount: number, remainingAmount: number) => {
    if (status === 'cancelled') {
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

  const toggleOverflowMenu = (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === saleId ? null : saleId);
  };

  const closeOverflowMenu = () => {
    setOpenMenuId(null);
  };

  const salesTableColumns: Column<PartySale>[] = [
    {
      key: '_saleId',
      title: 'Satış ID/Tarih',
      render: (_, sale) => (
        <div className="text-sm text-gray-900">
          <div className="font-medium">{sale.id}</div>
          <div className="text-xs text-gray-600">{formatDate(sale.saleDate)}</div>
        </div>
      ),
    },
    {
      key: '_product',
      title: 'Ürün/Hizmet',
      render: (_, sale) => <div className="text-sm text-gray-600">{renderDevicesSummary(sale)}</div>,
    },
    {
      key: '_barcode',
      title: 'Barkod/Seri No',
      render: (_, sale) => <div className="text-sm font-medium text-gray-900">{renderBarcodeSerialInfo(sale)}</div>,
    },
    {
      key: '_listPrice',
      title: 'Liste Fiyatı',
      align: 'right',
      render: (_, sale) => {
        const actualTotal = sale.actualListPriceTotal || sale.totalAmount || 0;
        return <span className="text-sm font-semibold text-gray-900">{formatCurrency(actualTotal)}</span>;
      },
    },
    {
      key: '_discount',
      title: 'İndirim',
      align: 'right',
      render: (_, sale) => {
        const discountAmount = sale.discountAmount || 0;
        const discountType = (sale.discountType as 'none' | 'percentage' | 'amount') || 'none';
        const discountValue = sale.discountValue || 0;
        if (discountType === 'none' || discountAmount === 0) return <span className="text-sm text-gray-500">-</span>;
        if (discountType === 'percentage') return <span className={`text-sm font-semibold ${discountAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>{`-${discountValue}% (${formatCurrency(discountAmount)})`}</span>;
        return <span className={`text-sm font-semibold ${discountAmount > 0 ? 'text-red-600' : 'text-gray-500'}`}>{discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : '-'}</span>;
      },
    },
    {
      key: '_sgk',
      title: 'SGK Desteği',
      align: 'right',
      render: (_, sale) => {
        const sgkAmount = sale.sgkCoverage || 0;
        return <span className={`text-sm font-semibold ${sgkAmount > 0 ? 'text-blue-600' : 'text-gray-500'}`}>{sgkAmount > 0 ? '-' : ''}{formatCurrency(sgkAmount)}</span>;
      },
    },
    {
      key: '_total',
      title: 'Toplam Tutar',
      align: 'right',
      render: (_, sale) => (
        <span className="text-sm font-semibold text-gray-900">{formatCurrency(calculateDisplayTotal(sale))}</span>
      ),
    },
    {
      key: '_paid',
      title: 'Alınan Ödeme',
      align: 'right',
      render: (_, sale) => {
        const paidAmount = sale.paidAmount || 0;
        return (
          <div>
            <div className="text-sm font-semibold text-green-700">{formatCurrency(paidAmount)}</div>
            <div className="text-xs text-gray-600">{renderPaymentMethods(sale)}</div>
          </div>
        );
      },
    },
    {
      key: '_remaining',
      title: 'Kalan Tutar',
      align: 'right',
      render: (_, sale) => {
        const displayTotal = calculateDisplayTotal(sale);
        const paidAmount = sale.paidAmount || 0;
        const remainingAmount = displayTotal - paidAmount;
        return <span className={`text-sm font-semibold ${remainingAmount > 0 ? 'text-orange-700' : 'text-gray-500'}`}>{formatCurrency(remainingAmount)}</span>;
      },
    },
    {
      key: 'status',
      title: 'Durum',
      align: 'center',
      render: (_, sale) => {
        const displayTotal = calculateDisplayTotal(sale);
        const paidAmount = sale.paidAmount || 0;
        const remainingAmount = displayTotal - paidAmount;
        const hasInvoice = !!sale.invoice;
        return (
          <div>
            {renderStatusBadge(sale.status, paidAmount, remainingAmount)}
            {hasInvoice && (
              <span className="block mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Fatura Oluşturuldu
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: '_actions',
      title: 'İşlemler',
      align: 'center',
      render: (_, sale) => (
        <div className="relative" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="w-9 h-9 p-0 rounded-lg"
            onClick={(e: React.MouseEvent) => toggleOverflowMenu(e, sale.id)}
            aria-label="Aksiyonlar"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
          {openMenuId === sale.id && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="py-1">
                <PermissionGate permission="invoices.create">
                  <button
                    data-allow-raw="true"
                    onClick={() => { if (sale.invoice) { onViewInvoice?.(sale); } else { onCreateInvoice?.(sale); } closeOverflowMenu(); }}
                    className="flex w-full items-center justify-start rounded-none px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {sale.invoice ? 'Fatura Görüntüle' : 'Fatura Kes'}
                  </button>
                </PermissionGate>
                <PermissionGate permission="sales.view">
                  <button
                    data-allow-raw="true"
                    onClick={() => { onManagePromissoryNotes?.(sale); closeOverflowMenu(); }}
                    className="flex w-full items-center justify-start rounded-none px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Senetler
                  </button>
                </PermissionGate>
                <PermissionGate permission="sales.delete">
                  <button
                    data-allow-raw="true"
                    onClick={() => { onCancelSale?.(sale); closeOverflowMenu(); }}
                    className="flex w-full items-center justify-start rounded-none px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Satışı İptal Et
                  </button>
                </PermissionGate>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Mobile card view for a single sale
  const renderMobileCard = (sale: PartySale) => {
    const displayTotal = calculateDisplayTotal(sale);
    const paidAmount = sale.paidAmount || 0;
    const remainingAmount = displayTotal - paidAmount;
    const discountAmount = sale.discountAmount || 0;
    const sgkAmount = sale.sgkCoverage || 0;
    const hasInvoice = !!sale.invoice;
    const cancelledClass = sale.status === 'cancelled' ? 'opacity-50 pointer-events-none' : '';
    const actualTotal = sale.actualListPriceTotal || sale.totalAmount || 0;

    return (
      <div
        key={sale.id}
        className={`bg-white border rounded-xl p-4 shadow-sm relative ${cancelledClass} transition-all active:scale-[0.98] cursor-pointer`}
        onClick={() => onSaleClick?.(sale)}
      >
        {/* Header: Date, ID, and Context Menu */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs text-gray-500 font-medium mb-0.5">{formatDate(sale.saleDate)}</div>
            <div className="text-sm font-semibold text-gray-900">#{sale.id}</div>
          </div>
          <div className="flex items-center gap-2">
            {renderStatusBadge(sale.status, paidAmount, remainingAmount)}

            {/* Overflow Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                className="w-8 h-8 p-0 rounded-lg"
                onClick={(e) => toggleOverflowMenu(e, sale.id)}
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
              {openMenuId === sale.id && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                    <div className="py-1">
                    <PermissionGate permission="invoices.create">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          if (hasInvoice) {
                            onViewInvoice?.(sale);
                          } else {
                            onCreateInvoice?.(sale);
                          }
                          closeOverflowMenu();
                        }}
                        className="flex w-full items-center justify-start rounded-none px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {hasInvoice ? 'Fatura Görüntüle' : 'Fatura Kes'}
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="sales.view">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          onManagePromissoryNotes?.(sale);
                          closeOverflowMenu();
                        }}
                        className="flex w-full items-center justify-start rounded-none px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Banknote className="w-4 h-4 mr-2" />
                        Senetler
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="sales.delete">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          onCancelSale?.(sale);
                          closeOverflowMenu();
                        }}
                        className="flex w-full items-center justify-start rounded-none px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Satışı İptal Et
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product & Device Details */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 space-y-2">
          {renderDevicesSummary(sale)}
          <div className="pt-2 border-t border-gray-200">
            {renderBarcodeSerialInfo(sale)}
          </div>
        </div>

        {/* Financial Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center text-gray-600">
            <span>Liste Fiyatı</span>
            <span className="font-medium text-gray-900">{formatCurrency(actualTotal)}</span>
          </div>

          {(discountAmount > 0 || sgkAmount > 0) && (
            <>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>İndirim</span>
                  <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {sgkAmount > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>SGK Desteği</span>
                  <span className="font-medium text-blue-600">-{formatCurrency(sgkAmount)}</span>
                </div>
              )}
              <div className="h-px bg-gray-100 my-1"></div>
            </>
          )}

          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Toplam</span>
            <span className="font-bold text-gray-900 text-base">{formatCurrency(displayTotal)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Alınan Ödeme</span>
            <div className="text-right">
              <span className="font-semibold text-green-700">{formatCurrency(paidAmount)}</span>
              {paidAmount > 0 && (
                <div className="text-[10px] text-gray-500 mt-0.5">{renderPaymentMethods(sale)}</div>
              )}
            </div>
          </div>

          {remainingAmount > 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-gray-100">
              <span className="font-medium text-gray-700">Kalan</span>
              <span className="font-bold text-orange-600 text-base">{formatCurrency(remainingAmount)}</span>
            </div>
          )}
        </div>

        {hasInvoice && (
          <div className="mt-3">
            <span className="inline-block px-2 py-1 text-[10px] font-medium bg-green-50 border border-green-200 text-green-700 rounded-md">
              Fatura Mevcut
            </span>
          </div>
        )}
      </div>
    );
  };

  console.log('📋 SalesTableView: Rendering sales table with', sales?.length || 0, 'sales');
  if (sales && sales.length > 0) {
    console.log('📋 Sales data sample:', sales[0]);
    console.log('💰 DEBUGGING PAID AMOUNT - First sale:', JSON.stringify({
      id: sales[0].id,
      paidAmount: sales[0].paidAmount,
      finalAmount: sales[0].finalAmount,
      listPriceTotal: sales[0].listPriceTotal
    }, null, 2));
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border border-gray-100 rounded-xl text-gray-500">
        <FileText className="w-10 h-10 text-gray-300 mb-3" />
        <p className="font-medium">Henüz satış kaydı bulunmuyor</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile view - Cards */}
      <div className="flex flex-col gap-4 md:hidden pb-20">
        {sales.map(sale => renderMobileCard(sale))}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden md:block">
        <DataTable<PartySale>
          data={sales}
          columns={salesTableColumns}
          rowKey={(sale) => sale.id}
          onRowClick={(sale) => onSaleClick?.(sale)}
          rowSelection={onSelectionChange ? {
            selectedRowKeys: selectedSaleIds,
            onChange: (keys) => onSelectionChange(keys.map(String)),
          } : undefined}
          pagination={pagination}
          responsive={false}
        />
      </div>
    </>

  );
};
