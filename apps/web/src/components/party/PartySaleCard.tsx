import React from 'react';
import { PartySale } from '../../hooks/party/usePartySales';
import {
  DollarSign,
  Calendar,
  User,
  Package,
  CreditCard,
  TrendingDown,
  FileText,
  Eye,
  Receipt,
  Banknote,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { Button } from '../ui/Button';

interface PartySaleCardProps {
  sale: PartySale;
  onSaleClick?: (sale: PartySale) => void;
  onCreateInvoice?: (sale: PartySale) => void;
  onViewInvoice?: (sale: PartySale) => void;
  onManagePromissoryNotes?: (sale: PartySale) => void;
  onCollectPayment?: (sale: PartySale) => void;
  onManageInstallments?: (sale: PartySale) => void;
}

export const PartySaleCard: React.FC<PartySaleCardProps> = ({
  sale,
  onSaleClick,
  onCreateInvoice,
  onViewInvoice,
  onManagePromissoryNotes,
  onCollectPayment,
  onManageInstallments
}) => {
  // Removed unused state variables _showActions and _setShowActions

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success';
      case 'pending':
        return 'bg-warning/10 text-yellow-800';
      case 'cancelled':
        return 'bg-destructive/10 text-red-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Bekliyor';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'Nakit';
      case 'card':
        return 'Kart';
      case 'installment':
        return 'Taksit';
      case 'insurance':
        return 'Sigorta';
      default:
        return method || 'Belirtilmemiş';
    }
  };

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSaleClick?.(sale)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSaleClick?.(sale);
        }
      }}
      aria-label={`Satış: ${sale.productId || 'Ürün'} - ${formatCurrency(sale.totalAmount)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <Package className="w-5 h-5 text-primary mr-2" aria-hidden="true" />
          <h4 className="text-sm font-medium text-foreground truncate">
            {sale.productId || 'Ürün Satışı'}
          </h4>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(sale.paymentStatus)}`}>
          {getPaymentStatusText(sale.paymentStatus)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Toplam Tutar:</span>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(sale.totalAmount)}
          </span>
        </div>

        {sale.discountAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">İndirim:</span>
            <span className="text-sm text-success flex items-center">
              <TrendingDown className="w-3 h-3 mr-1" />
              -{formatCurrency(sale.discountAmount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Net Tutar:</span>
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(sale.finalAmount)}
          </span>
        </div>

        {sale.paidAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ödenen:</span>
            <span className="text-sm text-success">
              {formatCurrency(sale.paidAmount)}
            </span>
          </div>
        )}

        {sale.remainingAmount && sale.remainingAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Kalan:</span>
            <span className="text-sm text-destructive">
              {formatCurrency(sale.remainingAmount)}
            </span>
          </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-1" aria-hidden="true" />
          {formatDate(sale.saleDate)}
        </div>

        {sale.paymentMethod && (
          <div className="flex items-center text-sm text-muted-foreground">
            <CreditCard className="w-4 h-4 mr-1" aria-hidden="true" />
            {getPaymentMethodText(sale.paymentMethod)}
          </div>
        )}

        {sale.soldBy && (
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="w-4 h-4 mr-1" aria-hidden="true" />
            {sale.soldBy}
          </div>
        )}

        {sale.sgkCoverage && sale.sgkCoverage > 0 && (
          <div className="flex items-center text-sm text-primary">
            <DollarSign className="w-4 h-4 mr-1" aria-hidden="true" />
            SGK Desteği: {formatCurrency(sale.sgkCoverage)}
          </div>
        )}

        {sale.devices && sale.devices.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Cihazlar:</p>
            <div className="space-y-1">
              {sale.devices.slice(0, 2).map((device, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-center">
                  <Smartphone className="w-3 h-3 mr-1" />
                  {device.name} {device.ear && `(${device.ear})`}
                </div>
              ))}
              {sale.devices.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{sale.devices.length - 2} daha...
                </div>
              )}
            </div>
          </div>
        )}

        {sale.paymentPlan && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Taksit Planı:</p>
            <div className="text-xs text-muted-foreground">
              {sale.paymentPlan.installmentCount} taksit × {formatCurrency(sale.paymentPlan.installmentAmount)}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {/* Invoice Actions */}
            {!sale.invoice?.id ? (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateInvoice?.(sale);
                }}
                className="text-xs px-2 py-1"
              >
                <FileText className="w-3 h-3 mr-1" />
                Fatura Oluştur
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewInvoice?.(sale);
                }}
                className="text-xs px-2 py-1"
              >
                <Eye className="w-3 h-3 mr-1" />
                Fatura Önizle
              </Button>
            )}

            {/* Payment Collection */}
            {sale.remainingAmount && sale.remainingAmount > 0 && (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onCollectPayment?.(sale);
                }}
                className="text-xs px-2 py-1"
              >
                <Receipt className="w-3 h-3 mr-1" />
                Tahsilat
              </Button>
            )}

            {/* Promissory Notes */}
            {sale.paymentMethod === 'installment' && (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onManagePromissoryNotes?.(sale);
                }}
                className="text-xs px-2 py-1"
              >
                <Banknote className="w-3 h-3 mr-1" />
                Senetler
              </Button>
            )}

            {/* Installment Management */}
            {sale.paymentPlan && (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageInstallments?.(sale);
                }}
                className="text-xs px-2 py-1"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Taksitler
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};