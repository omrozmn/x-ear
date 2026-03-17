import { DollarSign, MoreVertical, Eye, Edit, FileText, File } from 'lucide-react';
import { Button, Dropdown, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import type { SaleRead } from '@/api/generated';
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

  if (filteredSales.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {sales.length === 0
            ? 'Henüz satış yapılmamış'
            : hasActiveFilters
              ? 'Filtreye uygun satış bulunamadı'
              : 'Henüz satış kaydı bulunmuyor'
          }
        </h3>
        <p className="text-muted-foreground">
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
    if (sale.devices && sale.devices.length > 0) {
      return sale.devices.map((d, index: number) => (
        <div key={index} className="mb-1">
          <div className="font-medium text-foreground">{d.name || d.model || 'Cihaz'}</div>
          <div className="text-xs text-muted-foreground">Marka: {d.brand || '-'} | Model: {d.model || '-'}</div>
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
    if (sale.devices && sale.devices.length > 0) {
      return (
        <div className="space-y-1">
          {sale.devices.map((device, index: number) => (
            <div key={index} className="text-sm">
              {device.barcode && (
                <div className="font-mono text-xs bg-muted px-1 rounded inline-block mb-1">
                  {device.barcode}
                </div>
              )}
              {device.serialNumber && (
                <div className="font-mono text-foreground">{device.serialNumber}</div>
              )}
              {device.serialNumberLeft && (
                <div className="font-mono text-xs text-destructive">S: {device.serialNumberLeft}</div>
              )}
              {device.serialNumberRight && (
                <div className="font-mono text-xs text-primary">L: {device.serialNumberRight}</div>
              )}
              {!device.barcode && !device.serialNumber && !device.serialNumberLeft && !device.serialNumberRight && (
                <div className="text-xs text-muted-foreground">Seri yok</div>
              )}
            </div>
          ))}
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
    if (sale.paymentRecords && sale.paymentRecords.length > 0) {
      const paidRecords = sale.paymentRecords.filter((r: any) => (r.status || 'paid') === 'paid');
      return paidRecords.map((record: any, index: number) => {
        const methodLabels: Record<string, string> = {
          'cash': 'Nakit',
          'card': 'Kart',
          'transfer': 'Havale',
          'installment': 'Taksit',
          'promissory_note': 'Senet'
        };
        const method = methodLabels[record.paymentMethod] || record.paymentMethod;
        return (
          <div key={index} className="text-xs">
            {method}:{record.amount?.toLocaleString('tr-TR')}
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
      return <span className="px-2 py-1 text-xs font-medium bg-success/10 text-success rounded-full">Ödendi</span>;
    }

    const badges: Record<string, React.ReactElement> = {
      'paid': <span className="px-2 py-1 text-xs font-medium bg-success/10 text-success rounded-full">Ödendi</span>,
      'pending': <span className="px-2 py-1 text-xs font-medium bg-warning/10 text-yellow-800 rounded-full">Beklemede</span>,
      'partial': <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Kısmi Ödendi</span>,
      'cancelled': <span className="px-2 py-1 text-xs font-medium bg-destructive/10 text-red-800 rounded-full">İptal edildi</span>,
      'completed': <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-blue-800 rounded-full">Tamamlandı</span>
    };
    return badges[status] || badges['pending'];
  };

  const calculatePaidAmount = (sale: SaleRead) => {
    const extendedSale = sale as unknown as ExtendedSaleRead;
    if (extendedSale.paidAmount !== undefined && extendedSale.paidAmount !== null) {
      return parseFloat(String(extendedSale.paidAmount)) || 0;
    } else if (sale.paymentRecords && sale.paymentRecords.length > 0) {
      const paidRecords = sale.paymentRecords.filter((r: any) => (r.status || 'paid') === 'paid');
      return paidRecords.reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
    }
    return 0;
  };

  const calculatePartyPayable = (sale: SaleRead) => {
    const extendedSale = sale as unknown as ExtendedSaleRead;
    // Use patientPayment (which exists in schema) or calculate from other fields
    const partyPayable = extendedSale.partyPayment || extendedSale.patientPayment || extendedSale.finalAmount;
    if (typeof partyPayable === 'number') return partyPayable;
    const total = extendedSale.totalAmount || 0;
    const discount = extendedSale.discountAmount || 0;
    const sgk = extendedSale.sgkCoverage || 0;
    return total - discount - sgk;
  };

  const calculateVatAmount = (sale: SaleRead) => {
    const partyPayable = calculatePartyPayable(sale);
    // VAT rate is not in schema, default to 20%
    const vatRate = 20;
    return (partyPayable * vatRate) / 100;
  };

  const calculateTotalWithVat = (sale: SaleRead) => {
    const partyPayable = calculatePartyPayable(sale);
    const vatAmount = calculateVatAmount(sale);
    return partyPayable + vatAmount;
  };

  const calculateRemaining = (sale: SaleRead) => {
    const totalWithVat = calculateTotalWithVat(sale);
    const paid = calculatePaidAmount(sale);
    return totalWithVat - paid;
  };

  const salesColumns: Column<SaleRead>[] = [
    {
      key: '_saleId',
      title: 'Satış ID/Tarih',
      render: (_, sale) => (
        <div className="text-sm text-foreground">
          <div className="font-medium">{sale.id}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(sale.saleDate || sale.createdAt || Date.now()).toLocaleDateString('tr-TR')}
          </div>
        </div>
      ),
    },
    {
      key: '_product',
      title: 'Ürün/Hizmet',
      render: (_, sale) => <div className="text-sm text-muted-foreground">{renderDevicesSummary(sale)}</div>,
    },
    {
      key: '_barcode',
      title: 'Barkod/Seri No',
      render: (_, sale) => <div className="text-sm font-medium text-foreground">{renderBarcodeSerialInfo(sale)}</div>,
    },
    {
      key: '_totalAmount',
      title: 'Liste Fiyatı',
      align: 'right',
      render: (_, sale) => {
        const extendedSale = sale as unknown as ExtendedSaleRead;
        return <span className="text-sm font-semibold text-foreground">{formatCurrency(extendedSale.totalAmount || 0)}</span>;
      },
    },
    {
      key: '_discount',
      title: 'İndirim',
      align: 'right',
      render: (_, sale) => {
        const extendedSale = sale as unknown as ExtendedSaleRead;
        return (
          <span className="text-sm font-semibold text-destructive">
            {extendedSale.discountAmount ? `-${formatCurrency(extendedSale.discountAmount)}` : formatCurrency(0)}
          </span>
        );
      },
    },
    {
      key: '_totalWithVat',
      title: 'KDV Dahil Toplam',
      align: 'right',
      render: (_, sale) => (
        <span className="text-sm font-semibold text-foreground">{formatCurrency(calculateTotalWithVat(sale))}</span>
      ),
    },
    {
      key: '_paid',
      title: 'Alınan Ödeme',
      align: 'right',
      render: (_, sale) => {
        const paid = calculatePaidAmount(sale);
        return (
          <div>
            <div className="text-sm font-semibold text-success">{formatCurrency(paid)}</div>
            <div className="text-xs text-muted-foreground">{renderPaymentMethods(sale)}</div>
          </div>
        );
      },
    },
    {
      key: '_remaining',
      title: 'Kalan Tutar',
      align: 'right',
      render: (_, sale) => (
        <span className="text-sm font-semibold text-orange-700">{formatCurrency(calculateRemaining(sale))}</span>
      ),
    },
    {
      key: 'status',
      title: 'Durum',
      align: 'center',
      render: (_, sale) => {
        const paid = calculatePaidAmount(sale);
        const remaining = calculateRemaining(sale);
        return renderStatusBadge(sale.status || 'pending', paid, remaining);
      },
    },
    {
      key: '_actions',
      title: 'İşlemler',
      align: 'center',
      render: (_, sale) => (
        <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <Dropdown
            position="bottom-right"
            trigger={
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-full border border-border">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            }
            items={[
              {
                label: (<><Eye className="inline mr-2 w-4 h-4 align-middle" /> Görüntüle Fatura</>),
                value: 'view_invoice',
                onClick: () => onViewInvoice(sale)
              },
              {
                label: (<><FileText className="inline mr-2 w-4 h-4 align-middle" /> Fatura Oluştur</>),
                value: 'create_invoice',
                onClick: () => onCreateInvoice(sale)
              },
              {
                label: (<><DollarSign className="inline mr-2 w-4 h-4 align-middle" /> Tahsilat Yap</>),
                value: 'collect_payment',
                onClick: () => onCollectPayment(sale)
              },
              {
                label: (<><File className="inline mr-2 w-4 h-4 align-middle" /> Senet İşlemleri</>),
                value: 'promissory_notes',
                onClick: () => onManagePromissoryNotes(sale)
              },
              {
                label: (<><Edit className="inline mr-2 w-4 h-4 align-middle" /> Taksit İşlemleri</>),
                value: 'installments',
                onClick: () => onManageInstallments(sale)
              }
            ]}
          />
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
    />
  );
};
