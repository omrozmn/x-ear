import React, { useState } from 'react';
import { PatientSale } from '../../../hooks/patient/usePatientSales';
import {
  DollarSign,
  Calendar,
  User,
  Package,
  CreditCard,
  TrendingUp,
  TrendingDown,
  FileText,
  Eye,
  Receipt,
  Banknote,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { Button } from '../../ui/Button';

interface PatientSaleCardProps {
  sale: PatientSale;
  onSaleClick?: (sale: PatientSale) => void;
  onCreateInvoice?: (sale: PatientSale) => void;
  onViewInvoice?: (sale: PatientSale) => void;
  onManagePromissoryNotes?: (sale: PatientSale) => void;
  onCollectPayment?: (sale: PatientSale) => void;
  onManageInstallments?: (sale: PatientSale) => void;
}

export const PatientSaleCard: React.FC<PatientSaleCardProps> = ({
  sale,
  onSaleClick,
  onCreateInvoice,
  onViewInvoice,
  onManagePromissoryNotes,
  onCollectPayment,
  onManageInstallments
}) => {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    } as any);
  };

  const formatCurrency = (amount?: number) => {
    const safe = amount ?? 0;
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(safe);
  };

  const getPaymentStatusColor = (status?: string) => {
    const s = status ?? 'pending';
    switch (s) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (status?: string) => {
    const s = status ?? 'pending';
    switch (s) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Bekliyor';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return s;
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

  const paidAmount = ('paidAmount' in sale && sale.paidAmount !== undefined) ? (sale.paidAmount as number) : 0;
  const finalAmount = ('finalAmount' in sale && sale.finalAmount !== undefined)
    ? (sale.finalAmount as number)
    : (sale.totalAmount ?? 0) - (sale.discountAmount ?? 0);
  const remainingAmount = ('remainingAmount' in sale && sale.remainingAmount !== undefined)
    ? (sale.remainingAmount as number)
    : Math.max(finalAmount - paidAmount, 0);
  const paymentStatus = ('paymentStatus' in sale ? sale.paymentStatus as string | undefined : undefined);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
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
          <Package className="w-5 h-5 text-blue-500 mr-2" aria-hidden="true" />
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {sale.productId || 'Ürün Satışı'}
          </h4>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(paymentStatus)}`}>
          {getPaymentStatusText(paymentStatus)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Toplam Tutar:</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(sale.totalAmount)}
          </span>
        </div>

        {(sale.discountAmount ?? 0) > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">İndirim:</span>
            <span className="text-sm text-green-600 flex items-center">
              <TrendingDown className="w-3 h-3 mr-1" />
              -{formatCurrency(sale.discountAmount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Net Tutar:</span>
          <span className="text-sm font-semibold text-blue-600">
            {formatCurrency(finalAmount)}
          </span>
        </div>

        {paidAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Ödenen:</span>
            <span className="text-sm text-green-600">
              {formatCurrency(paidAmount)}
            </span>
          </div>
        )}

        {remainingAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Kalan:</span>
            <span className="text-sm text-red-600">
              {formatCurrency(remainingAmount)}
            </span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-1" aria-hidden="true" />
          {formatDate(sale.saleDate)}
        </div>

        {sale.paymentMethod && (
          <div className="flex items-center text-sm text-gray-600">
            <CreditCard className="w-4 h-4 mr-1" aria-hidden="true" />
            {getPaymentMethodText(sale.paymentMethod)}
          </div>
        )}

        {'soldBy' in sale && sale.soldBy && (
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-1" aria-hidden="true" />
            {sale.soldBy}
          </div>
        )}

        {sale.sgkCoverage && sale.sgkCoverage > 0 && (
          <div className="flex items-center text-sm text-blue-600">
            <DollarSign className="w-4 h-4 mr-1" aria-hidden="true" />
            SGK Desteği: {formatCurrency(sale.sgkCoverage)}
          </div>
        )}

        {'devices' in sale && sale.devices && sale.devices.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Cihazlar:</p>
            <div className="space-y-1">
              {sale.devices.slice(0, 2).map((device, index) => (
                <div key={index} className="text-xs text-gray-600 flex items-center">
                  <Smartphone className="w-3 h-3 mr-1" />
                  {device.name} {device.ear && `(${device.ear})`}
                </div>
              ))}
              {sale.devices.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{sale.devices.length - 2} daha...
                </div>
              )}
            </div>
          </div>
        )}

        {'paymentPlan' in sale && sale.paymentPlan && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Taksit Planı:</p>
            <div className="text-xs text-gray-600">
              {sale.paymentPlan.installmentCount} taksit × {formatCurrency(sale.paymentPlan.installmentAmount)}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {/* Invoice Actions */}
            {!((sale as any).invoice) ? (
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
            {remainingAmount > 0 && (
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
            {'paymentPlan' in sale && sale.paymentPlan && (
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