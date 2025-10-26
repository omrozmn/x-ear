import React, { useState } from 'react';
import { Patient } from '../../types/patient/patient-base.types';
import { Button, Input, Select, Textarea } from '@x-ear/ui-web';

interface SGKUTSFormProps {
  patient: Patient;
  onSubmit?: (data: UTSRegistrationData) => void;
  onCancel?: () => void;
}

interface UTSRegistrationData {
  patientId: string;
  registrationType: string;
  registrationDate: string;
  facilityCode: string;
  facilityName: string;
  doctorCode: string;
  doctorName: string;
  treatmentType: string;
  diagnosis: string;
  treatmentPlan: string;
  estimatedDuration: string;
  notes?: string;
}

export const SGKUTSForm: React.FC<SGKUTSFormProps> = ({
  patient,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<UTSRegistrationData>({
    patientId: patient.id || '',
    registrationType: '',
    registrationDate: new Date().toISOString().split('T')[0],
    facilityCode: '',
    facilityName: '',
    doctorCode: '',
    doctorName: '',
    treatmentType: '',
    diagnosis: '',
    treatmentPlan: '',
    estimatedDuration: '',
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

    if (!formData.registrationType) newErrors.registrationType = 'Kayıt türü seçimi zorunludur';
    if (!formData.registrationDate) newErrors.registrationDate = 'Kayıt tarihi zorunludur';
    if (!formData.facilityCode) newErrors.facilityCode = 'Tesis kodu zorunludur';
    if (!formData.facilityName) newErrors.facilityName = 'Tesis adı zorunludur';
    if (!formData.doctorCode) newErrors.doctorCode = 'Doktor kodu zorunludur';
    if (!formData.doctorName) newErrors.doctorName = 'Doktor adı zorunludur';
    if (!formData.treatmentType) newErrors.treatmentType = 'Tedavi türü seçimi zorunludur';
    if (!formData.diagnosis) newErrors.diagnosis = 'Tanı bilgisi zorunludur';
    if (!formData.treatmentPlan) newErrors.treatmentPlan = 'Tedavi planı zorunludur';
    if (!formData.estimatedDuration) newErrors.estimatedDuration = 'Tahmini süre seçimi zorunludur';

    // Facility code validation (should be numeric and 6 digits)
    if (formData.facilityCode && (!/^\d{6}$/.test(formData.facilityCode))) {
      newErrors.facilityCode = 'Tesis kodu 6 haneli sayı olmalıdır';
    }

    // Doctor code validation (should be numeric and 7 digits)
    if (formData.doctorCode && (!/^\d{7}$/.test(formData.doctorCode))) {
      newErrors.doctorCode = 'Doktor kodu 7 haneli sayı olmalıdır';
    }

    // Date validation
    if (formData.registrationDate && new Date(formData.registrationDate) > new Date()) {
      newErrors.registrationDate = 'Kayıt tarihi gelecek bir tarih olamaz';
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
      const utsData: UTSRegistrationData = {
        ...formData,
      };

      // UTS kayıt işlemi burada yapılacak
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API call
      onSubmit?.(utsData);
    } catch (error) {
      console.error('UTS kayıt hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const registrationTypeOptions = [
    { value: 'NEW_REGISTRATION', label: 'Yeni Kayıt' },
    { value: 'RENEWAL', label: 'Yenileme' },
    { value: 'UPDATE', label: 'Güncelleme' },
  ];

  const treatmentTypeOptions = [
    { value: 'PHYSIOTHERAPY', label: 'Fizyoterapi' },
    { value: 'OCCUPATIONAL_THERAPY', label: 'Meslek Terapisi' },
    { value: 'SPEECH_THERAPY', label: 'Konuşma Terapisi' },
    { value: 'PSYCHOLOGICAL_THERAPY', label: 'Psikolojik Terapi' },
    { value: 'MEDICAL_REHABILITATION', label: 'Tıbbi Rehabilitasyon' },
  ];

  const durationOptions = [
    { value: '15', label: '15 gün' },
    { value: '30', label: '30 gün' },
    { value: '45', label: '45 gün' },
    { value: '60', label: '60 gün' },
    { value: '90', label: '90 gün' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">SGK UTS Kayıt</h2>
      
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
              value={patient.tcNumber || ''}
              fullWidth
              readOnly
            />
          </div>
        </div>

        {/* Kayıt Bilgileri */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Kayıt Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Kayıt Türü"
              name="registrationType"
              value={formData.registrationType}
              onChange={handleInputChange}
              options={registrationTypeOptions}
              fullWidth
              required
              error={errors.registrationType}
            />
            <Input
              label="Kayıt Tarihi"
              name="registrationDate"
              type="date"
              value={formData.registrationDate}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.registrationDate}
            />
          </div>
        </div>

        {/* Tesis ve Doktor Bilgileri */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tesis ve Doktor Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tesis Kodu"
              name="facilityCode"
              value={formData.facilityCode}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.facilityCode}
            />
            <Input
              label="Tesis Adı"
              name="facilityName"
              value={formData.facilityName}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.facilityName}
            />
            <Input
              label="Doktor Kodu"
              name="doctorCode"
              value={formData.doctorCode}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.doctorCode}
            />
            <Input
              label="Doktor Adı"
              name="doctorName"
              value={formData.doctorName}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.doctorName}
            />
          </div>
        </div>

        {/* Tedavi Bilgileri */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tedavi Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tedavi Türü"
              name="treatmentType"
              value={formData.treatmentType}
              onChange={handleInputChange}
              options={treatmentTypeOptions}
              fullWidth
              required
              error={errors.treatmentType}
            />
            <Select
              label="Tahmini Süre"
              name="estimatedDuration"
              value={formData.estimatedDuration}
              onChange={handleInputChange}
              options={durationOptions}
              fullWidth
              required
              error={errors.estimatedDuration}
            />
          </div>
          <div className="mt-4 space-y-4">
            <Textarea
              label="Tanı"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleInputChange}
              rows={3}
              fullWidth
              required
              error={errors.diagnosis}
            />
            <Textarea
              label="Tedavi Planı"
              name="treatmentPlan"
              value={formData.treatmentPlan}
              onChange={handleInputChange}
              rows={3}
              fullWidth
              required
              error={errors.treatmentPlan}
            />
          </div>
        </div>

        {/* Notlar */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <Textarea
            label="Notlar"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            fullWidth
          />
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
            {isLoading ? 'Kaydediliyor...' : 'UTS Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  );
};