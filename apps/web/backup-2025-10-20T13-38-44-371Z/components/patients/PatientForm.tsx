import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { Patient, PatientStatus, PatientSegment, PatientLabel, PatientAcquisitionType } from '../../types/patient/patient-base.types';

interface PatientFormProps {
  patient?: Patient | null;
  onSave?: (patient: Patient) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function PatientForm({ patient, onSave, onCancel, isModal = false }: PatientFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    tcNumber: '',
    birthDate: '',
    email: '',
    address: '',
    status: 'active' as PatientStatus,
    segment: 'new' as PatientSegment,
    label: 'yeni' as PatientLabel,
    acquisitionType: 'tabela' as PatientAcquisitionType,
    tags: [] as string[],
    deviceTrial: false,
    notes: patient?.notes ? JSON.stringify(patient.notes) : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        phone: patient.phone || '',
        tcNumber: patient.tcNumber || '',
        birthDate: patient.birthDate || '',
        email: patient.email || '',
        address: patient.address || '',
        status: patient.status || 'active',
        segment: patient.segment || 'new',
        label: patient.label || 'yeni',
        acquisitionType: patient.acquisitionType || 'tabela',
        tags: patient.tags || [],
        deviceTrial: patient.deviceTrial || false,
        notes: patient.notes ? patient.notes.map(note => note.text).join('\n') : '',
      });
    }
  }, [patient]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gerekli';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gerekli';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon gerekli';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli telefon numarası girin';
    }

    if (formData.tcNumber && !/^\d{11}$/.test(formData.tcNumber)) {
      newErrors.tcNumber = 'TC Kimlik No 11 haneli olmalı';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli email adresi girin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Narrow form selections into typed fields to avoid unsafe 'as' casts
  const allowedStatus: Patient['status'][] = ['active','inactive'];
  const allowedSegment: Patient['segment'][] = ['new','trial','purchased','control','renewal'];
  const allowedLabel: Patient['label'][] = ['yeni','arama-bekliyor','randevu-verildi','deneme-yapildi','kontrol-hastasi','satis-tamamlandi'];
  const allowedAcq: Patient['acquisitionType'][] = ['tabela','sosyal-medya','tanitim','referans','diger'];
    // small type-guard helper to avoid inline casts
    const isIn = <T,>(arr: T[], v: unknown): v is T => arr.includes(v as T);

    const statusValue = isIn(allowedStatus, formData.status) ? formData.status : 'active';
    const segmentValue = isIn(allowedSegment, formData.segment) ? formData.segment : 'new';
    const labelValue = isIn(allowedLabel, formData.label) ? formData.label : 'yeni';
    const acquisitionValue = isIn(allowedAcq, formData.acquisitionType) ? formData.acquisitionType : 'diger';

      const patientData: Patient = {
        id: patient?.id || `patient_${Date.now()}`,
        ...formData,
        status: statusValue,
        segment: segmentValue,
        label: labelValue,
        acquisitionType: acquisitionValue,
        notes: formData.notes ? [{ 
          id: Date.now().toString(),
          text: formData.notes, 
          date: new Date().toISOString(),
          author: 'User',
          type: 'general' as const,
          isPrivate: false
        }] : [],
        devices: patient?.devices || [],
        installments: patient?.installments || [],
        sales: patient?.sales || [],
        communications: patient?.communications || [],
        sgkInfo: patient?.sgkInfo || { hasInsurance: false },
        createdAt: patient?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (onSave) {
        onSave(patientData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ad *</label>
          <Input
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Hasta adı"
            error={errors.firstName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Soyad *</label>
          <Input
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Hasta soyadı"
            error={errors.lastName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telefon *</label>
          <Input
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="0555 123 45 67"
            error={errors.phone}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">TC Kimlik No</label>
          <Input
            value={formData.tcNumber}
            onChange={(e) => handleInputChange('tcNumber', e.target.value)}
            placeholder="12345678901"
            maxLength={11}
            error={errors.tcNumber}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Doğum Tarihi</label>
          <Input
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="hasta@email.com"
            error={errors.email}
          />
        </div>

        <div>
          <Select
            label="Durum"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as PatientStatus })}
            options={[
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Pasif" }
            ]}
            fullWidth
          />
        </div>

        <div>
          <Select
            label="Segment"
            value={formData.segment}
            onChange={(e) => setFormData({ ...formData, segment: e.target.value as PatientSegment })}
            options={[
              { value: "new", label: "Yeni" },
              { value: "trial", label: "Deneme" },
              { value: "purchased", label: "Satın Alınmış" },
              { value: "control", label: "Kontrol" },
              { value: "renewal", label: "Yenileme" }
            ]}
            fullWidth
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Adres</label>
        <Textarea
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Hasta adresi"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notlar</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Hasta hakkında notlar"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="deviceTrial"
          checked={formData.deviceTrial}
          onChange={(e) => handleInputChange('deviceTrial', e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="deviceTrial" className="text-sm">Cihaz denemesi yapıldı</label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            İptal
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Kaydediliyor...' : (patient ? 'Güncelle' : 'Kaydet')}
        </Button>
      </div>
    </form>
  );
}