import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { Appointment, CreateAppointmentData, UpdateAppointmentData, AppointmentType, AppointmentStatus } from '../../types/appointment';
import { useAppointments } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/patient/usePatients';

interface AppointmentFormProps {
  appointment?: Appointment;
  patientId?: string;
  onSave?: (appointment: Appointment) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  className?: string;
}

interface FormData {
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  title: string;
  notes: string;
  clinician: string;
  clinicianId: string;
  location: string;
  branchId: string;
}

interface FormErrors {
  patientId?: string;
  date?: string;
  time?: string;
  duration?: string;
  type?: string;
  title?: string;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  patientId,
  onSave,
  onCancel,
  mode = 'create',
  className = ''
}) => {
  const { createAppointment, updateAppointment, creating, updating, error } = useAppointments();
  const { patients } = usePatients();

  const [formData, setFormData] = useState<FormData>({
    patientId: patientId || appointment?.patientId || '',
    patientName: appointment?.patientName || '',
    date: appointment?.date || new Date().toISOString().split('T')[0],
    time: appointment?.time || '09:00',
    duration: appointment?.duration || 30,
    type: appointment?.type || 'consultation',
    status: appointment?.status || 'scheduled',
    title: appointment?.title || '',
    notes: appointment?.notes || '',
    clinician: appointment?.clinician || '',
    clinicianId: appointment?.clinicianId || '',
    location: appointment?.location || '',
    branchId: appointment?.branchId || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update patient name when patient is selected
  useEffect(() => {
    if (formData.patientId && patients.length > 0) {
      const selectedPatient = patients.find(p => p.id === formData.patientId);
      if (selectedPatient) {
        const patientName = selectedPatient.firstName && selectedPatient.lastName 
          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
          : selectedPatient.name || 'İsimsiz Hasta';
        
        setFormData(prev => ({ ...prev, patientName }));
      }
    }
  }, [formData.patientId, patients]);

  // Auto-generate title based on type
  useEffect(() => {
    if (!formData.title || formData.title === getTypeLabel(formData.type)) {
      setFormData(prev => ({ ...prev, title: getTypeLabel(formData.type) }));
    }
  }, [formData.type]);

  const getTypeLabel = (type: AppointmentType): string => {
    const labels = {
      consultation: 'Konsültasyon',
      follow_up: 'Kontrol Muayenesi',
      trial: 'Deneme Başlangıç',
      delivery: 'Cihaz Teslimi',
      control_visit: 'Kontrol Ziyareti',
      battery_renewal: 'Pil Yenileme',
      repair: 'Tamir',
      fitting: 'Cihaz Ayarı',
      assessment: 'Değerlendirme'
    };
    return labels[type] || type;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Hasta seçimi zorunludur';
    }

    if (!formData.date) {
      newErrors.date = 'Tarih zorunludur';
    } else {
      const appointmentDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        newErrors.date = 'Geçmiş tarih seçilemez';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Saat zorunludur';
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.time)) {
      newErrors.time = 'Geçerli bir saat formatı giriniz (HH:MM)';
    }

    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = 'Süre 0\'dan büyük olmalıdır';
    } else if (formData.duration > 480) {
      newErrors.duration = 'Süre 8 saatten fazla olamaz';
    }

    if (!formData.type) {
      newErrors.type = 'Randevu türü zorunludur';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Başlık zorunludur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const appointmentData: CreateAppointmentData = {
          patientId: formData.patientId,
          patientName: formData.patientName,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          type: formData.type,
          status: formData.status,
          title: formData.title.trim(),
          notes: formData.notes.trim() || undefined,
          clinician: formData.clinician.trim() || undefined,
          clinicianId: formData.clinicianId.trim() || undefined,
          location: formData.location.trim() || undefined,
          branchId: formData.branchId.trim() || undefined,
          createdBy: 'current-user' // TODO: Get from auth context
        };

        const newAppointment = await createAppointment(appointmentData);
        onSave?.(newAppointment);
      } else if (appointment) {
        const updateData: Partial<UpdateAppointmentData> = {
          patientId: formData.patientId,
          patientName: formData.patientName,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          type: formData.type,
          status: formData.status,
          title: formData.title.trim(),
          notes: formData.notes.trim() || undefined,
          clinician: formData.clinician.trim() || undefined,
          clinicianId: formData.clinicianId.trim() || undefined,
          location: formData.location.trim() || undefined,
          branchId: formData.branchId.trim() || undefined
        };

        const updatedAppointment = await updateAppointment(appointment.id, updateData);
        onSave?.(updatedAppointment);
      }
    } catch (error) {
      console.error('Failed to save appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = creating || updating || isSubmitting;

  return (
    <div className={`appointment-form ${className}`}>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta *
            </label>
            <Select
              value={formData.patientId}
              onChange={(e) => handleInputChange('patientId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.patientId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={!!patientId} // Disable if patientId is provided as prop
            >
              <option value="">Hasta seçiniz</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName && patient.lastName 
                    ? `${patient.firstName} ${patient.lastName}` 
                    : patient.name || 'İsimsiz Hasta'
                  } - {patient.phone || 'Telefon yok'}
                </option>
              ))}
            </Select>
            {errors.patientId && (
              <p className="mt-1 text-sm text-red-600">{errors.patientId}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarih *
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saat *
            </label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.time ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.time && (
              <p className="mt-1 text-sm text-red-600">{errors.time}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Süre (dakika) *
            </label>
            <Input
              type="number"
              min="15"
              max="480"
              step="15"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.duration ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Randevu Türü *
            </label>
            <Select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as AppointmentType)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.type ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="consultation">Konsültasyon</option>
              <option value="follow_up">Kontrol Muayenesi</option>
              <option value="trial">Deneme Başlangıç</option>
              <option value="delivery">Cihaz Teslimi</option>
              <option value="control_visit">Kontrol Ziyareti</option>
              <option value="battery_renewal">Pil Yenileme</option>
              <option value="repair">Tamir</option>
              <option value="fitting">Cihaz Ayarı</option>
              <option value="assessment">Değerlendirme</option>
            </Select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durum
            </label>
            <Select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as AppointmentStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="scheduled">Planlandı</option>
              <option value="confirmed">Onaylandı</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
              <option value="no_show">Gelmedi</option>
              <option value="rescheduled">Ertelendi</option>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Randevu başlığı"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Clinician */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doktor
            </label>
            <Input
              type="text"
              value={formData.clinician}
              onChange={(e) => handleInputChange('clinician', e.target.value)}
              placeholder="Doktor adı"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lokasyon
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Muayene odası, şube vb."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notlar
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Randevu ile ilgili notlar..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              variant='default'>
              İptal
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            variant='default'>
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {mode === 'create' ? 'Randevu Oluştur' : 'Randevuyu Güncelle'}
          </Button>
        </div>
      </form>
    </div>
  );
};