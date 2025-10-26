import React, { useState } from 'react';
import { Patient } from '../../types/patient/patient-base.types';
import { Button, Input, Select } from '@x-ear/ui-web';

interface SGKQueryFormProps {
  patient: Patient;
  onSubmit?: (data: SGKQueryData) => void;
  onCancel?: () => void;
}

interface SGKQueryData {
  patientId: string;
  tcNumber: string;
  queryType: string;
  queryDate: string;
  notes?: string;
}

export const SGKQueryForm: React.FC<SGKQueryFormProps> = ({
  patient,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<SGKQueryData>({
    patientId: patient.id || '',
    tcNumber: patient.tcNumber || '',
    queryType: '',
    queryDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tcNumber) newErrors.tcNumber = 'TC Kimlik No zorunludur';
    if (!formData.queryType) newErrors.queryType = 'Sorgulama türü seçimi zorunludur';
    if (!formData.queryDate) newErrors.queryDate = 'Sorgulama tarihi zorunludur';

    // TC Number validation
    if (formData.tcNumber && formData.tcNumber.length !== 11) {
      newErrors.tcNumber = 'TC Kimlik No 11 haneli olmalıdır';
    }

    // Date validation
    if (formData.queryDate && new Date(formData.queryDate) > new Date()) {
      newErrors.queryDate = 'Sorgulama tarihi gelecek bir tarih olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // SGK sorgulama işlemi burada yapılacak
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API call
      onSubmit?.(formData);
    } catch (error) {
      console.error('SGK sorgulama hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const queryTypeOptions = [
    { value: 'ENTITLEMENT_QUERY', label: 'Hak Sorgulama' },
    { value: 'PAYMENT_QUERY', label: 'Ödeme Sorgulama' },
    { value: 'TREATMENT_QUERY', label: 'Tedavi Sorgulama' },
    { value: 'PRESCRIPTION_QUERY', label: 'Reçete Sorgulama' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">SGK Sorgulama</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hasta Bilgileri */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Hasta Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Hasta Adı"
              value={`${patient.firstName} ${patient.lastName}`}
              fullWidth
              readOnly
            />
            <Input
              label="TC Kimlik No"
              name="tcNumber"
              value={formData.tcNumber}
              onChange={handleInputChange}
              fullWidth
              maxLength={11}
              required
              error={errors.tcNumber}
            />
          </div>
        </div>

        {/* Sorgulama Bilgileri */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sorgulama Detayları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Sorgulama Türü"
              name="queryType"
              value={formData.queryType}
              onChange={handleInputChange}
              options={queryTypeOptions}
              fullWidth
              required
              error={errors.queryType}
            />
            <Input
              label="Sorgulama Tarihi"
              name="queryDate"
              type="date"
              value={formData.queryDate}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.queryDate}
            />
          </div>
          <div className="mt-4">
            <Input
              label="Notlar"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              fullWidth
            />
          </div>
        </div>

        {/* Form Aksiyonları */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
          >
            {isLoading ? 'Sorgulanıyor...' : 'Sorgula'}
          </Button>
        </div>
      </form>
    </div>
  );
};