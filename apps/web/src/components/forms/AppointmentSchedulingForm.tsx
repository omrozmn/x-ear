import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Calendar, Clock, User, FileText, AlertCircle, MapPin } from 'lucide-react';
import { getCurrentUserId } from '@/utils/auth-utils';

interface Appointment {
  id?: string;
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number; // dakika cinsinden
  doctorId: string;
  doctorName: string;
  appointmentType: 'consultation' | 'fitting' | 'follow_up' | 'repair' | 'other';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  location?: string;
  createdBy: string;
  createdAt: string;
}

interface AppointmentSchedulingFormProps {
  patientId: string;
  appointment?: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointmentData: Partial<Appointment>) => Promise<void>;
  isLoading?: boolean;
}

export const AppointmentSchedulingForm: React.FC<AppointmentSchedulingFormProps> = ({
  patientId,
  appointment,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<Appointment>>({
    patientId,
    appointmentDate: '',
    appointmentTime: '',
    duration: 30,
    status: 'scheduled',
    createdBy: getCurrentUserId()
  });

  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or appointment changes
  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        // Edit mode
        setFormData({
          ...appointment,
          appointmentDate: appointment.appointmentDate.split('T')[0], // Convert to date input format
          appointmentTime: appointment.appointmentTime.substring(0, 5) // Convert to time input format (HH:MM)
        });
      } else {
        // Create mode
        setFormData({
          patientId,
          appointmentDate: '',
          appointmentTime: '',
          duration: 30,
          status: 'scheduled',
          createdBy: getCurrentUserId()
        });
      }
      setErrors({});
    }
  }, [isOpen, appointment, patientId]);

  // Load available doctors
  useEffect(() => {
    if (isOpen) {
      // TODO: Load available doctors from API
      setAvailableDoctors([
        { id: '1', name: 'Dr. Ahmet Yılmaz', specialty: 'Kulak Burun Boğaz', title: 'Uzman Dr.' },
        { id: '2', name: 'Dr. Ayşe Kaya', specialty: 'Audioloji', title: 'Uzman Dr.' },
        { id: '3', name: 'Dr. Mehmet Demir', specialty: 'Kulak Burun Boğaz', title: 'Prof. Dr.' }
      ]);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.appointmentDate) {
      newErrors.appointmentDate = 'Randevu tarihi zorunludur';
    }

    if (!formData.appointmentTime) {
      newErrors.appointmentTime = 'Randevu saati zorunludur';
    }

    if (!formData.doctorId) {
      newErrors.doctorId = 'Doktor seçimi zorunludur';
    }

    if (!formData.appointmentType) {
      newErrors.appointmentType = 'Randevu türü zorunludur';
    }

    if (!formData.duration || formData.duration < 15) {
      newErrors.duration = 'Geçerli bir süre giriniz (minimum 15 dakika)';
    }

    // Geçmiş tarih kontrolü
    if (formData.appointmentDate) {
      const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime || '00:00'}`);
      const now = new Date();

      if (appointmentDateTime < now) {
        newErrors.appointmentDate = 'Geçmiş tarihli randevu oluşturamazsınız';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Combine date and time for backend
      const appointmentDateTime = `${formData.appointmentDate}T${formData.appointmentTime}:00`;

      const appointmentData = {
        ...formData,
        appointmentDate: appointmentDateTime,
        appointmentTime: formData.appointmentTime
      };

      await onSave(appointmentData);
      onClose();
    } catch (error) {
      console.error('Randevu kaydedilirken hata:', error);
    }
  };

  const getAppointmentTypeText = (type: string): string => {
    switch (type) {
      case 'consultation':
        return 'Konsultasyon';
      case 'fitting':
        return 'Cihaz Uygulaması';
      case 'follow_up':
        return 'Kontrol';
      case 'repair':
        return 'Tamirat';
      case 'other':
        return 'Diğer';
      default:
        return type;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return 'Planlandı';
      case 'confirmed':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'no_show':
        return 'Gelmedi';
      default:
        return status;
    }
  };

  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={appointment ? 'Randevuyu Düzenle' : 'Yeni Randevu Oluştur'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tarih ve Saat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Randevu Tarihi *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={formData.appointmentDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.appointmentDate ? 'border-red-300' : ''}`}
              />
              {errors.appointmentDate && (
                <p className="mt-1 text-sm text-red-600">{errors.appointmentDate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Randevu Saati *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <select
                value={formData.appointmentTime || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.appointmentTime ? 'border-red-300' : ''}`}
              >
                <option value="">Saat seçin...</option>
                {generateTimeSlots().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {errors.appointmentTime && (
                <p className="mt-1 text-sm text-red-600">{errors.appointmentTime}</p>
              )}
            </div>
          </div>
        </div>

        {/* Doktor Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Doktor *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <select
              value={formData.doctorId || ''}
              onChange={(e) => {
                const selectedDoctor = availableDoctors.find(d => d.id === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  doctorId: e.target.value,
                  doctorName: selectedDoctor ? selectedDoctor.name : ''
                }));
              }}
              className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.doctorId ? 'border-red-300' : ''}`}
            >
              <option value="">Doktor seçin...</option>
              {availableDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.title} {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
            {errors.doctorId && (
              <p className="mt-1 text-sm text-red-600">{errors.doctorId}</p>
            )}
          </div>
        </div>

        {/* Randevu Türü ve Süre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Randevu Türü *
            </label>
            <select
              value={formData.appointmentType || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, appointmentType: e.target.value as any }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.appointmentType ? 'border-red-300' : ''}`}
            >
              <option value="">Tür seçin...</option>
              <option value="consultation">Konsultasyon</option>
              <option value="fitting">Cihaz Uygulaması</option>
              <option value="follow_up">Kontrol</option>
              <option value="repair">Tamirat</option>
              <option value="other">Diğer</option>
            </select>
            {errors.appointmentType && (
              <p className="mt-1 text-sm text-red-600">{errors.appointmentType}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Süre (dakika) *
            </label>
            <input
              type="number"
              min="15"
              max="240"
              step="15"
              value={formData.duration || 30}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.duration ? 'border-red-300' : ''}`}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
            )}
          </div>
        </div>

        {/* Konum */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Konum
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Randevu yeri (örn: Klinik, Hastane)"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Randevu ile ilgili notlar..."
              rows={3}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Durum (sadece düzenleme modunda göster) */}
        {appointment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durum
            </label>
            <select
              value={formData.status || 'scheduled'}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="scheduled">Planlandı</option>
              <option value="confirmed">Onaylandı</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
              <option value="no_show">Gelmedi</option>
            </select>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Kaydediliyor...' : (appointment ? 'Güncelle' : 'Randevu Oluştur')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};