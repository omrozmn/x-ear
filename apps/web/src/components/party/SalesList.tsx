import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, MoreVertical, Eye, Edit, FileText, File } from 'lucide-react';
import type { SaleRead } from '@/api/client/sales.client';
import { ExtendedSaleRead } from '@/types/extended-sales';
import { Button, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';

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
      <div className="text-center py-12" role="status" data-testid="sales-empty-state">
        <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-medium text-foreground mb-2" data-testid="sales-empty-title">
          {sales.length === 0
            ? 'Henüz satış yapılmamış'
            : hasActiveFilters
              ? 'Filtreye uygun satış bulunamadı'
              : 'Henüz satış kaydı bulunmuyor'
          }
        </h3>
        <p className="text-muted-foreground" data-testid="sales-empty-description">
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
          <div className="font-medium text-foreground">{(d.name || d.model || 'Cihaz') as string}</div>
          <div className="text-xs text-muted-foreground">Marka: {(d.brand || '-') as string} | Model: {(d.model || '-') as string}</div>
        </div>
      ));
    }

    // If no devices array but productId exists, show product info
    if (sale.productId) {
      return (
        <div className="mb-1">
          <div className="font-medium text-foreground">Ürün ID: {sale.productId}</div>
          <div className="text-xs text-muted-foreground">Envanter ürünü</div>
        </div>
      );
    }

    return <div className="text-muted-foreground text-sm">Ürün bilgisi yok</div>;
  };

  const renderBarcodeSerialInfo = (sale: SaleRead) => {
    const saleData = sale as unknown as Record<string, unknown>;
    const devices = saleData.devices as Array<Record<string, unknown>> | undefined;

    if (devices && devices.length > 0) {
      return (
        <div className="space-y-1">
          {devices.map((device, index: number) => {
            const barcode = device.barcode as string | undefined;
            const serialNumber = device.serialNumber as string | undefined;
            const serialNumberLeft = device.serialNumberLeft as string | undefined;
            const serialNumberRight = device.serialNumberRight as string | undefined;
            
            return (
              <div key={index} className="text-sm">
                {barcode && (
                  <div className="font-mono text-xs bg-muted px-1 rounded inline-block mb-1">
                    {String(barcode)}
                  </div>
                )}
                {serialNumber && (
                  <div className="font-mono text-foreground">{String(serialNumber)}</div>
                )}
                {serialNumberLeft && (
                  <div className="font-mono text-xs text-destructive">S: {String(serialNumberLeft)}</div>
                )}
                {serialNumberRight && (
                  <div className="font-mono text-xs text-primary">L: {String(serialNumberRight)}</div>
                )}
                {!barcode && !serialNumber && !serialNumberLeft && !serialNumberRight && (
                  <div className="text-xs text-muted-foreground">Seri yok</div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // If no devices but productId exists, show productId as barcode
    if (sale.productId) {
      return (
        <div>
          <div className="font-medium">{sale.productId}</div>
          <div className="text-xs text-muted-foreground">Ürün Kodu</div>
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

  const renderStatusBadge = (status?: string, paidAmount = 0, remainingAmount = 0) => {
    if (paidAmount > 0 && remainingAmount > 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Kısmi Ödendi</span>;
    } else if (paidAmount > 0 && remainingAmount === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-success/10 text-success rounded-full">Ödendi</span>;
    }

    const badges: Record<string, React.ReactElement> = {
      'paid': <span className="px-2 py-1 text-xs font-medium bg-success/10 text-success rounded-full">Ödendi</span>,
      'pending': <span className="px-2 py-1 text-xs font-medium bg-warning/10 text-yellow-800 rounded-full">Beklemede</span>,
      'partial': <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Kısmi Ödendi</span>,
      'cancelled': <span className="px-2 py-1 text-xs font-medium bg-destructive/10 text-red-800 rounded-full">İptal edildi</span>,
      'completed': <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-blue-800 rounded-full">Tamamlandı</span>
    };
    return (status ? badges[status] : undefined) || badges['pending'];
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

  const salesColumns: Column<SaleRead>[] = [
    {
      key: '_saleId',
      title: 'Satış ID/Tarih',
      render: (_: unknown, sale: SaleRead) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground text-xs">#{sale.id}</span>
          <span className="text-xs text-muted-foreground">
            {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '-'}
          </span>
        </div>
      ),
    },
    {
      key: '_product',
      title: 'Ürün/Hizmet',
      render: (_: unknown, sale: SaleRead) => renderDevicesSummary(sale),
    },
    {
      key: '_barcode',
      title: 'Barkod/Seri No',
      render: (_: unknown, sale: SaleRead) => renderBarcodeSerialInfo(sale),
    },
    {
      key: '_listPrice',
      title: 'Liste Fiyatı',
      align: 'right',
      render: (_: unknown, sale: SaleRead) => {
        const ext = sale as unknown as ExtendedSaleRead;
        return <span className="font-medium">{formatCurrency(ext.listPrice || 0)}</span>;
      },
    },
    {
      key: '_discount',
      title: 'İndirim',
      align: 'right',
      render: (_: unknown, sale: SaleRead) => {
        const ext = sale as unknown as ExtendedSaleRead;
        const discount = ext.discountAmount || (ext.discount_amount as number) || 0;
        return discount > 0 ? (
          <span className="text-destructive font-medium">-{formatCurrency(discount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: '_sgk',
      title: 'SGK Desteği',
      align: 'right',
      render: (_: unknown, sale: SaleRead) => {
        const ext = sale as unknown as ExtendedSaleRead;
        const sgk = ext.sgkCoverage || 0;
        return sgk > 0 ? (
          <span className="text-primary font-medium">{formatCurrency(sgk)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: '_totalWithVat',
      title: 'Toplam Tutar',
      align: 'right',
      render: (_: unknown, sale: SaleRead) => (
        <span className="font-semibold">{formatCurrency(calculateTotalWithVat(sale))}</span>
      ),
    },
    {
      key: '_paid',
      title: 'Alınan Ödeme',
      align: 'right',
      render: (_: unknown, sale: SaleRead) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-medium text-success">{formatCurrency(calculatePaidAmount(sale))}</span>
          {renderPaymentMethods(sale)}
        </div>
      ),
    },
    {
      key: '_remaining',
      title: 'Kalan Tutar',
      align: 'right',
      render: (_: unknown, sale: SaleRead) => {
        const remaining = calculateRemaining(sale);
        return remaining > 0 ? (
          <span className="font-semibold text-orange-600">{formatCurrency(remaining)}</span>
        ) : (
          <span className="text-success font-medium">Ödendi</span>
        );
      },
    },
    {
      key: 'status',
      title: 'Durum',
      align: 'center',
      render: (_: unknown, sale: SaleRead) => renderStatusBadge(sale.status || undefined),
    },
    {
      key: '_actions',
      title: 'İşlemler',
      align: 'center',
      render: (_: unknown, sale: SaleRead) => (
        <div className="relative" ref={openMenuSaleId === String(sale.id) ? menuRef : undefined}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpenMenuSaleId(prev => prev === String(sale.id) ? null : String(sale.id))}
            className="rounded p-1 hover:bg-muted"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </Button>
          {openMenuSaleId === String(sale.id) && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
              <ul className="py-1">
                <li>
                  <Button type="button" variant="ghost"
                    onClick={() => { onViewInvoice(sale); setOpenMenuSaleId(null); }}
                    className="flex w-full items-center justify-start gap-2 rounded-none px-4 py-2 text-sm hover:bg-muted"
                  >
                    <Eye className="w-4 h-4" /> Fatura Görüntüle
                  </Button>
                </li>
                <li>
                  <Button type="button" variant="ghost"
                    onClick={() => { onCreateInvoice(sale); setOpenMenuSaleId(null); }}
                    className="flex w-full items-center justify-start gap-2 rounded-none px-4 py-2 text-sm hover:bg-muted"
                  >
                    <FileText className="w-4 h-4" /> Fatura Oluştur
                  </Button>
                </li>
                <li>
                  <Button type="button" variant="ghost"
                    onClick={() => { onCollectPayment(sale); setOpenMenuSaleId(null); }}
                    className="flex w-full items-center justify-start gap-2 rounded-none px-4 py-2 text-sm hover:bg-muted"
                  >
                    <DollarSign className="w-4 h-4" /> Ödeme Al
                  </Button>
                </li>
                <li>
                  <Button type="button" variant="ghost"
                    onClick={() => { onManagePromissoryNotes(sale); setOpenMenuSaleId(null); }}
                    className="flex w-full items-center justify-start gap-2 rounded-none px-4 py-2 text-sm hover:bg-muted"
                  >
                    <File className="w-4 h-4" /> Senetleri Yönet
                  </Button>
                </li>
                <li>
                  <Button type="button" variant="ghost"
                    onClick={() => { onManageInstallments(sale); setOpenMenuSaleId(null); }}
                    className="flex w-full items-center justify-start gap-2 rounded-none px-4 py-2 text-sm hover:bg-muted"
                  >
                    <Edit className="w-4 h-4" /> Taksitleri Yönet
                  </Button>
                </li>
              </ul>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable<SaleRead>
      data={filteredSales}
      columns={salesColumns}
      rowKey={(sale) => String(sale.id)}
      onRowClick={onSaleClick}
      loading={false}
      emptyText="Kayıt bulunamadı"
    />
  );
};
