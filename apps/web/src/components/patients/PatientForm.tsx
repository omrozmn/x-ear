import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { Patient } from '../../types/patient';
import { usePatients } from '../../hooks/usePatients';

interface PatientFormProps {
  patient?: Patient | null;
  onSave?: (patient: Patient) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function PatientForm({ patient, onSave, onCancel, isModal = false }: PatientFormProps) {
  const { createPatient, updatePatient, validateTcNumber, loading, error } = usePatients();
  
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    tcNumber: '',
    birthDate: '',
    email: '',
    address: '',
    status: 'active' as Patient['status'],
    segment: 'new' as Patient['segment'],
    label: 'yeni' as Patient['label'],
    acquisitionType: 'tabela' as Patient['acquisitionType'],
    tags: [] as string[],
    deviceTrial: false,
    trialDevice: '',
    trialDate: '',
    priceGiven: false,
    purchased: false,
    purchaseDate: '',
    deviceType: undefined as Patient['deviceType'],
    deviceModel: '',
    sgkInfo: {
      hasInsurance: false,
      insuranceNumber: '',
      insuranceType: undefined as Patient['sgkInfo']['insuranceType'],
      coveragePercentage: undefined as Patient['sgkInfo']['coveragePercentage'],
      approvalNumber: '',
      approvalDate: '',
      expiryDate: ''
    }
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with patient data
  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || '',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        phone: patient.phone || '',
        tcNumber: patient.tcNumber || '',
        birthDate: patient.birthDate || '',
        email: patient.email || '',
        address: patient.address || '',
        status: patient.status,
        segment: patient.segment,
        label: patient.label,
        acquisitionType: patient.acquisitionType,
        tags: patient.tags || [],
        deviceTrial: patient.deviceTrial || false,
        trialDevice: patient.trialDevice || '',
        trialDate: patient.trialDate || '',
        priceGiven: patient.priceGiven || false,
        purchased: patient.purchased || false,
        purchaseDate: patient.purchaseDate || '',
        deviceType: patient.deviceType,
        deviceModel: patient.deviceModel || '',
        sgkInfo: {
          hasInsurance: patient.sgkInfo?.hasInsurance || false,
          insuranceNumber: patient.sgkInfo?.insuranceNumber || '',
          insuranceType: patient.sgkInfo?.insuranceType || undefined,
          coveragePercentage: patient.sgkInfo?.coveragePercentage ?? undefined,
          approvalNumber: patient.sgkInfo?.approvalNumber || '',
          approvalDate: patient.sgkInfo?.approvalDate || '',
          expiryDate: patient.sgkInfo?.expiryDate || ''
        }
      });
    }
  }, [patient?.id]); // Only depend on patient ID to avoid unnecessary re-renders

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSgkInfoChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sgkInfo: {
        ...prev.sgkInfo,
        [field]: value
      }
    }));
  };

  const validateForm = async (): Promise<boolean> => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.firstName) {
      errors.firstName = 'Ad gereklidir';
    }
    
    if (!formData.phone) {
      errors.phone = 'Telefon numarası gereklidir';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
      errors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    // TC Number validation
    if (formData.tcNumber) {
      if (!/^\d{11}$/.test(formData.tcNumber)) {
        errors.tcNumber = 'TC kimlik numarası 11 haneli olmalıdır';
      } else {
        const isValid = await validateTcNumber(formData.tcNumber, patient?.id);
        if (!isValid) {
          errors.tcNumber = 'Bu TC kimlik numarası zaten kayıtlı';
        }
      }
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    // Birth date validation
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        errors.birthDate = 'Doğum tarihi gelecekte olamaz';
      }
    }

    // Trial date validation
    if (formData.deviceTrial && formData.trialDate) {
      const trialDate = new Date(formData.trialDate);
      const today = new Date();
      if (trialDate > today) {
        errors.trialDate = 'Deneme tarihi gelecekte olamaz';
      }
    }

    // Purchase date validation
    if (formData.purchased && formData.purchaseDate) {
      const purchaseDate = new Date(formData.purchaseDate);
      const today = new Date();
      if (purchaseDate > today) {
        errors.purchaseDate = 'Satın alma tarihi gelecekte olamaz';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    
    try {
      const patientData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim() || formData.firstName || 'Unnamed Patient',
        devices: patient?.devices || [],
        notes: patient?.notes || [],
        communications: patient?.communications || [],
        reports: patient?.reports || [],
        ereceiptHistory: patient?.ereceiptHistory || []
      };

      let savedPatient: Patient | null;
      
      if (patient) {
        // Update existing patient
        savedPatient = await updatePatient(patient.id, patientData);
      } else {
        // Create new patient
        savedPatient = await createPatient(patientData);
      }

      if (savedPatient) {
        onSave?.(savedPatient);
      }
    } catch (err) {
      console.error('Failed to save patient:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              type="text"
              label="Ad *"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              error={validationErrors.firstName}
              placeholder="Ad"
              fullWidth
            />
          </div>

          <div>
            <Input
              type="text"
              label="Soyad"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Soyad"
              fullWidth
            />
          </div>

          <div>
            <Input
              type="tel"
              label="Telefon *"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={validationErrors.phone}
              placeholder="0555 123 45 67"
              fullWidth
            />
          </div>

          <div>
            <Input
              type="text"
              label="TC Kimlik No"
              value={formData.tcNumber}
              onChange={(e) => handleInputChange('tcNumber', e.target.value)}
              error={validationErrors.tcNumber}
              placeholder="12345678901"
              maxLength={11}
              fullWidth
            />
          </div>

          <div>
            <Input
              type="date"
              label="Doğum Tarihi"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              error={validationErrors.birthDate}
              fullWidth
            />
          </div>

          <div>
            <Input
              type="email"
              label="E-posta"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={validationErrors.email}
              placeholder="ornek@email.com"
              fullWidth
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Adres"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              placeholder="Hasta adresi"
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sınıflandırma</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Durum *"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              error={validationErrors.status}
              options={[
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Pasif' },
                { value: 'archived', label: 'Arşivlendi' }
              ]}
              fullWidth
            />
          </div>

          <div>
            <Select
              label="Segment"
              value={formData.segment}
              onChange={(e) => handleInputChange('segment', e.target.value)}
              options={[
                { value: 'new', label: 'Yeni' },
                { value: 'trial', label: 'Deneme' },
                { value: 'purchased', label: 'Satın Aldı' },
                { value: 'control', label: 'Kontrol' },
                { value: 'renewal', label: 'Yenileme' }
              ]}
              fullWidth
            />
          </div>

          <div>
            <Select
              label="Etiket"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              options={[
                { value: 'yeni', label: 'Yeni' },
                { value: 'arama-bekliyor', label: 'Arama Bekliyor' },
                { value: 'randevu-verildi', label: 'Randevu Verildi' },
                { value: 'deneme-yapildi', label: 'Deneme Yapıldı' },
                { value: 'kontrol-hastasi', label: 'Kontrol Hastası' },
                { value: 'satis-tamamlandi', label: 'Satış Tamamlandı' }
              ]}
              fullWidth
            />
          </div>

          <div>
            <Select
              label="Kazanım Türü"
              value={formData.acquisitionType}
              onChange={(e) => handleInputChange('acquisitionType', e.target.value)}
              options={[
                { value: 'tabela', label: 'Tabela' },
                { value: 'sosyal-medya', label: 'Sosyal Medya' },
                { value: 'tanitim', label: 'Tanıtım' },
                { value: 'referans', label: 'Referans' },
                { value: 'diger', label: 'Diğer' }
              ]}
              fullWidth
            />
          </div>
        </div>
      </div>



      {/* Form Actions */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        {onCancel && !isModal && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            variant='secondary'
            className="mr-3">
            İptal
          </Button>
        )}
        
        <Button
          type="submit"
          disabled={isSubmitting || loading}
          variant='primary'>
          {isSubmitting || loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {patient ? 'Güncelleniyor...' : 'Kaydediliyor...'}
            </div>
          ) : (
            patient ? 'Güncelle' : 'Kaydet'
          )}
        </Button>
      </div>
    </form>
  );

  // When used in modal, just return the form content without additional wrapper
  if (isModal) {
    return <FormContent />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {patient ? 'Hasta Düzenle' : 'Yeni Hasta'}
        </h1>
      </div>
      <FormContent />
    </div>
  );
}