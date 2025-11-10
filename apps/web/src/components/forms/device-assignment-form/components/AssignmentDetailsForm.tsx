import React from 'react';
import { Input, Select, Textarea } from '@x-ear/ui-web';
import { Calendar, User, FileText, AlertCircle, CheckCircle, Clock, RotateCcw } from 'lucide-react';

export interface DeviceAssignment {
  id?: string;
  deviceId: string;
  patientId: string;
  assignedDate: string;
  assignedBy: string;
  status: 'assigned' | 'trial' | 'returned' | 'defective';
  ear: 'left' | 'right' | 'both';
  reason: 'sale' | 'service' | 'repair' | 'trial' | 'replacement' | 'proposal' | 'other';
  notes?: string;
  trialEndDate?: string;
  returnDate?: string;
  condition?: string;

  // Pricing fields
  listPrice?: number;
  trialListPrice?: number;
  trialPrice?: number;
  salePrice?: number;
  sgkSupportType?: string;
  sgkReduction?: number;
  discountType?: 'none' | 'percentage' | 'amount';
  discountValue?: number;
  patientPayment?: number;
  downPayment?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'installment';
  installmentCount?: number;
  monthlyInstallment?: number;

  // Serial numbers
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
}

interface AssignmentDetailsFormProps {
  formData: Partial<DeviceAssignment>;
  onFormDataChange: (data: Partial<DeviceAssignment>) => void;
  errors?: Record<string, string>;
}

export const AssignmentDetailsForm: React.FC<AssignmentDetailsFormProps> = ({
  formData,
  onFormDataChange,
  errors = {}
}) => {
  const updateFormData = (field: keyof DeviceAssignment, value: any) => {
    onFormDataChange({ [field]: value });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'trial':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'returned':
        return <RotateCcw className="w-4 h-4 text-orange-500" />;
      case 'defective':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Information - 3 columns in one row: Sebep, Tarih, Atayan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Atama Sebebi *
          </label>
          <select
            value={formData.reason || ''}
            onChange={(e) => updateFormData('reason', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.reason ? 'border-red-300' : 'border-gray-300'}`}
          >
            <option value="">Sebep seçiniz</option>
            <option value="sale">Satış</option>
            <option value="service">Servis</option>
            <option value="repair">Tamir</option>
            <option value="trial">Deneme</option>
            <option value="replacement">Değişim</option>
            <option value="proposal">Teklif</option>
            <option value="other">Diğer</option>
          </select>
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Atama Tarihi *
          </label>
          <input
            type="date"
            value={formData.assignedDate || ''}
            onChange={(e) => updateFormData('assignedDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.assignedDate ? 'border-red-300' : 'border-gray-300'}`}
          />
          {errors.assignedDate && (
            <p className="mt-1 text-sm text-red-600">{errors.assignedDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Atayan Kişi
          </label>
          <input
            type="text"
            value={formData.assignedBy || ''}
            onChange={(e) => updateFormData('assignedBy', e.target.value)}
            placeholder="Atayan kişi adı"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Ear Selection - BUTTONS with color coding: Right=Red, Bilateral=Gradient, Left=Blue */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kulak Seçimi *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'right', label: 'Sağ Kulak', color: 'red' },
            { value: 'both', label: 'Bilateral', color: 'gradient' },
            { value: 'left', label: 'Sol Kulak', color: 'blue' }
          ].map((ear) => {
            const isSelected = formData.ear === ear.value;
            const colorClasses = {
              blue: isSelected
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-blue-300 bg-white text-blue-600 hover:bg-blue-50',
              red: isSelected
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-red-300 bg-white text-red-600 hover:bg-red-50',
              gradient: isSelected
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-green-300 bg-white text-green-600 hover:bg-green-50'
            };

            return (
              <label key={ear.value} className="relative">
                <input
                  type="radio"
                  name="ear"
                  value={ear.value}
                  checked={isSelected}
                  onChange={(e) => updateFormData('ear', e.target.value)}
                  className="sr-only"
                />
                <div className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${colorClasses[ear.color as keyof typeof colorClasses]}`}>
                  <span className="text-sm font-medium">{ear.label}</span>
                </div>
              </label>
            );
          })}
        </div>
        {errors.ear && (
          <p className="mt-1 text-sm text-red-600">{errors.ear}</p>
        )}
      </div>

      {/* Trial End Date */}
      {formData.status === 'trial' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deneme Bitiş Tarihi *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <Input
              type="date"
              value={formData.trialEndDate || ''}
              onChange={(e) => updateFormData('trialEndDate', e.target.value)}
              className={`pl-10 ${errors.trialEndDate ? 'border-red-300' : ''}`}
            />
            {errors.trialEndDate && (
              <p className="mt-1 text-sm text-red-600">{errors.trialEndDate}</p>
            )}
          </div>
        </div>
      )}

      {/* Return Date */}
      {formData.status === 'returned' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            İade Tarihi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <Input
              type="date"
              value={formData.returnDate || ''}
              onChange={(e) => updateFormData('returnDate', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Device Condition */}
      {(formData.status === 'returned' || formData.status === 'defective') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cihaz Durumu
          </label>
          <Select
            value={formData.condition || ''}
            onChange={(e) => updateFormData('condition', e.target.value)}
            label=""
            options={[
              { value: '', label: 'Durum seçin...' },
              { value: 'excellent', label: 'Mükemmel' },
              { value: 'good', label: 'İyi' },
              { value: 'fair', label: 'Orta' },
              { value: 'poor', label: 'Kötü' },
              { value: 'damaged', label: 'Hasarlı' }
            ]}
          />
        </div>
      )}
    </div>
  );
};