import React from 'react';
import {
  Select,
  Input,
  Textarea,
  Label,
} from '@x-ear/ui-web';
import { SaleStatus } from '@/api/generated/schemas';

interface SaleFormData {
  status: SaleStatus;
  saleDate: string;
  paymentMethod?: string;
  totalAmount: number;
  discountAmount?: number;
  sgkCoverage?: number;
  notes?: string;
}

interface SaleFormFieldsProps {
  formData: SaleFormData;
  onChange: (data: Partial<SaleFormData>) => void;
  canEditFinancials?: boolean;
}

export const SaleFormFields: React.FC<SaleFormFieldsProps> = ({
  formData,
  onChange,
  canEditFinancials = true,
}) => {
  const handleChange = (field: keyof SaleFormData, value: any) => {
    onChange({ [field]: value });
  };

  const statusOptions = [
    { value: 'PENDING', label: 'Beklemede' },
    { value: 'COMPLETED', label: 'Tamamlandı' },
    { value: 'CANCELLED', label: 'İptal Edildi' },
  ];

  const paymentMethodOptions = [
    { value: '', label: 'Seçiniz' },
    { value: 'cash', label: 'Nakit' },
    { value: 'credit_card', label: 'Kredi Kartı' },
    { value: 'installment', label: 'Taksit' },
    { value: 'sgk', label: 'SGK' },
  ];

  return (
    <>
      {/* Sale Status */}
      <div className="mb-6">
        <span className="text-lg font-bold text-gray-700 block mb-3">
          Satış Durumu
        </span>
        <div className="mb-4">
          <Label htmlFor="status">Durum</Label>
          <Select
            id="status"
            options={statusOptions}
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as SaleStatus)}
            fullWidth
          />
        </div>
      </div>

      {/* Sale Details */}
      <div className="mb-6">
        <span className="text-lg font-bold text-gray-700 block mb-3">
          Satış Detayları
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="saleDate">Satış Tarihi</Label>
            <Input
              id="saleDate"
              type="date"
              value={formData.saleDate}
              onChange={(e) => handleChange('saleDate', e.target.value)}
              fullWidth
            />
          </div>
          <div>
            <Label htmlFor="paymentMethod">Satış Türü</Label>
            <Select
              id="paymentMethod"
              options={paymentMethodOptions}
              value={formData.paymentMethod || ''}
              onChange={(value) => handleChange('paymentMethod', value)}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div className="mb-6">
        <span className="text-lg font-bold text-gray-700 block mb-3">
          Mali Bilgiler
        </span>
        {!canEditFinancials && (
          <span className="text-sm text-orange-600 block mb-3">
            ⚠️ Ödeme kaydı bulunduğu için mali bilgiler düzenlenemez.
          </span>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="totalAmount">Toplam Tutar</Label>
            <Input
              id="totalAmount"
              type="number"
              value={formData.totalAmount}
              onChange={(e) => handleChange('totalAmount', parseFloat(e.target.value) || 0)}
              step="0.01"
              readOnly={!canEditFinancials}
              className={!canEditFinancials ? "bg-gray-100" : ""}
              fullWidth
            />
          </div>
          <div>
            <Label htmlFor="discountAmount">İndirim Tutarı</Label>
            <Input
              id="discountAmount"
              type="number"
              value={formData.discountAmount || 0}
              onChange={(e) => handleChange('discountAmount', parseFloat(e.target.value) || 0)}
              step="0.01"
              readOnly={!canEditFinancials}
              className={!canEditFinancials ? "bg-gray-100" : ""}
              fullWidth
            />
          </div>
          <div>
            <Label htmlFor="sgkCoverage">SGK Katkısı</Label>
            <Input
              id="sgkCoverage"
              type="number"
              value={formData.sgkCoverage || 0}
              onChange={(e) => handleChange('sgkCoverage', parseFloat(e.target.value) || 0)}
              step="0.01"
              readOnly={!canEditFinancials}
              className={!canEditFinancials ? "bg-gray-100" : ""}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <span className="text-lg font-bold text-gray-700 block mb-3">
          Notlar
        </span>
        <div>
          <Label htmlFor="notes">Satış Notları</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Satış ile ilgili notlarınızı buraya yazabilirsiniz..."
            rows={4}
            fullWidth
          />
        </div>
      </div>
    </>
  );
};