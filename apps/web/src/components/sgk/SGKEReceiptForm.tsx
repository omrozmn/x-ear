import React, { useState } from 'react';
import { Patient } from '../../types/patient/patient-base.types';
import { Button, Input, Select, Textarea } from '@x-ear/ui-web';

interface SGKEReceiptFormProps {
  patient: Patient;
  onSubmit?: (data: EReceiptData) => void;
  onCancel?: () => void;
}

interface EReceiptData {
  patientId: string;
  prescriptionNumber: string;
  doctorName: string;
  hospitalName: string;
  prescriptionDate: string;
  medications: EReceiptMedication[];
  notes?: string;
}

interface EReceiptMedication {
  name: string;
  dosage: string;
  quantity: number;
  usage: string;
  duration: string;
}

export const SGKEReceiptForm: React.FC<SGKEReceiptFormProps> = ({
  patient,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    patientId: patient.id || '',
    prescriptionNumber: '',
    doctorName: '',
    hospitalName: '',
    prescriptionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [medications, setMedications] = useState<EReceiptMedication[]>([
    {
      name: '',
      dosage: '',
      quantity: 1,
      usage: '',
      duration: '',
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Reçete numarası kontrolü
    if (!formData.prescriptionNumber.trim()) {
      newErrors.prescriptionNumber = 'Reçete numarası gereklidir';
    }

    // Doktor adı kontrolü
    if (!formData.doctorName.trim()) {
      newErrors.doctorName = 'Doktor adı gereklidir';
    }

    // Hastane adı kontrolü
    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = 'Hastane adı gereklidir';
    }

    // Reçete tarihi kontrolü
    if (!formData.prescriptionDate) {
      newErrors.prescriptionDate = 'Reçete tarihi gereklidir';
    } else {
      const prescriptionDate = new Date(formData.prescriptionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (prescriptionDate > today) {
        newErrors.prescriptionDate = 'Reçete tarihi gelecek bir tarih olamaz';
      }
    }

    // İlaç kontrolü
    if (medications.length === 0) {
      newErrors.medications = 'En az bir ilaç eklenmesi gereklidir';
    } else {
      medications.forEach((med, index) => {
        if (!med.name.trim()) {
          newErrors[`medication_${index}_name`] = 'İlaç adı gereklidir';
        }
        if (!med.dosage.trim()) {
          newErrors[`medication_${index}_dosage`] = 'Doz bilgisi gereklidir';
        }
        if (!med.usage.trim()) {
          newErrors[`medication_${index}_usage`] = 'Kullanım şekli gereklidir';
        }
        if (!med.duration.trim()) {
          newErrors[`medication_${index}_duration`] = 'Kullanım süresi gereklidir';
        }
        if (med.quantity <= 0) {
          newErrors[`medication_${index}_quantity`] = 'Miktar 0\'dan büyük olmalıdır';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMedicationChange = (index: number, field: keyof EReceiptMedication, value: string | number) => {
    setMedications(prev => prev.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    ));
    
    // Clear medication-specific errors when user starts typing
    const errorKey = `medication_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };

  const addMedication = () => {
    setMedications(prev => [...prev, {
      name: '',
      dosage: '',
      quantity: 1,
      usage: '',
      duration: '',
    }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const eReceiptData: EReceiptData = {
        ...formData,
        medications,
      };

      // E-reçete oluşturma işlemi burada yapılacak
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API call
      onSubmit?.(eReceiptData);
    } catch (error) {
      console.error('E-reçete oluşturma hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">SGK E-Reçete Oluştur</h2>
      
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

        {/* Reçete Bilgileri */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Reçete Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Reçete Numarası"
              name="prescriptionNumber"
              value={formData.prescriptionNumber}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.prescriptionNumber}
            />
            <Input
              label="Reçete Tarihi"
              name="prescriptionDate"
              type="date"
              value={formData.prescriptionDate}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.prescriptionDate}
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
            <Input
              label="Hastane Adı"
              name="hospitalName"
              value={formData.hospitalName}
              onChange={handleInputChange}
              fullWidth
              required
              error={errors.hospitalName}
            />
          </div>
        </div>

        {/* İlaçlar */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">İlaçlar</h3>
            <Button
              type="button"
              variant="outline"
              onClick={addMedication}
            >
              İlaç Ekle
            </Button>
          </div>
          
          {medications.map((medication, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">İlaç {index + 1}</h4>
                {medications.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMedication(index)}
                  >
                    Kaldır
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="İlaç Adı"
                  value={medication.name}
                  onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                  fullWidth
                  required
                  error={errors[`medication_${index}_name`]}
                />
                <Input
                  label="Doz"
                  value={medication.dosage}
                  onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                  fullWidth
                  required
                  error={errors[`medication_${index}_dosage`]}
                />
                <Input
                  label="Miktar"
                  type="number"
                  value={medication.quantity}
                  onChange={(e) => handleMedicationChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  fullWidth
                  min={1}
                  required
                  error={errors[`medication_${index}_quantity`]}
                />
                <Input
                  label="Kullanım Şekli"
                  value={medication.usage}
                  onChange={(e) => handleMedicationChange(index, 'usage', e.target.value)}
                  fullWidth
                  required
                  error={errors[`medication_${index}_usage`]}
                />
                <Input
                  label="Kullanım Süresi"
                  value={medication.duration}
                  onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                  fullWidth
                  required
                  error={errors[`medication_${index}_duration`]}
                />
              </div>
            </div>
          ))}
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
            {isLoading ? 'Oluşturuluyor...' : 'E-Reçete Oluştur'}
          </Button>
        </div>
      </form>
    </div>
  );
};