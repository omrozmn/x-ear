import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Textarea,
  Alert,
  Spinner
} from '@x-ear/ui-web';
import { X, Calendar, Clock, User, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Party } from '../../../types/party';

interface Appointment {
  id: string;
  date: string;
  note?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  appointment?: Appointment | null;
  onAppointmentSave: (appointmentData: Record<string, unknown>) => void;
  loading?: boolean;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  party,
  appointment,
  onAppointmentSave,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    date: '',
    note: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isEditing = !!appointment;

  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        // Editing existing appointment
        const appointmentDate = new Date(appointment.date);
        const localDateTime = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);

        setFormData({
          date: localDateTime,
          note: appointment.note || '',
          status: appointment.status
        });
      } else {
        // Creating new appointment - set default to next hour
        const now = new Date();
        const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
        const localDateTime = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);

        setFormData({
          date: localDateTime,
          note: '',
          status: 'scheduled'
        });
      }
      setErrors({});
    }
  }, [isOpen, appointment]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Randevu tarihi ve saati gereklidir';
    } else {
      const appointmentDate = new Date(formData.date);
      const now = new Date();

      if (appointmentDate < now && formData.status === 'scheduled') {
        newErrors.date = 'Geçmiş tarih için randevu durumu "Planlandı" olamaz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const appointmentData = {
        id: appointment?.id || `appt_${Date.now()}`,
        date: new Date(formData.date).toISOString(),
        note: formData.note.trim() || undefined,
        status: formData.status,
        ...(isEditing
          ? { updatedAt: new Date().toISOString() }
          : { createdAt: new Date().toISOString() }
        )
      };

      onAppointmentSave(appointmentData);

      setSuccess(isEditing ? 'Randevu başarıyla güncellendi' : 'Randevu başarıyla oluşturuldu');

      // Reset form after successful submission
      setTimeout(() => {
        setError(null);
        setSuccess(null);
        onClose();
      }, 2000);

    } catch (err) {
      setError('Randevu kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-primary bg-primary/10';
      case 'completed': return 'text-success bg-success/10';
      case 'cancelled': return 'text-destructive bg-destructive/10';
      default: return 'text-foreground bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Planlandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-foreground flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            {isEditing ? 'Randevuyu Düzenle' : 'Yeni Randevu'}
          </h3>
          <Button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Party Info */}
            <div className="bg-muted p-4 rounded-2xl">
              <h4 className="font-medium text-foreground mb-2 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Hasta Bilgileri
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Ad Soyad:</span> {party.firstName} {party.lastName}
                </div>
                <div>
                  <span className="font-medium">TC No:</span> {party.tcNumber}
                </div>
                <div>
                  <span className="font-medium">Telefon:</span> {party.phone}
                </div>
                <div>
                  <span className="font-medium">E-posta:</span> {party.email || 'Belirtilmemiş'}
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Randevu Detayları
              </h4>

              {/* Date and Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tarih ve Saat *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <div className="flex items-center mt-1 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.date}
                  </div>
                )}
                {formData.date && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Seçilen tarih: {formatDateTime(formData.date)}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Durum
                </label>
                <select data-allow-raw="true"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="scheduled">Planlandı</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(formData.status)}`}>
                  {getStatusLabel(formData.status)}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  Notlar (Opsiyonel)
                </label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => handleInputChange('note', e.target.value)}
                  placeholder="Randevu ile ilgili notlar, özel talimatlar veya hatırlatmalar..."
                  rows={4}
                  className="resize-none"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formData.note.length}/500 karakter
                </div>
              </div>
            </div>

            {/* Existing Appointment Info */}
            {isEditing && appointment && (
              <div className="bg-primary/10 p-4 rounded-2xl">
                <h4 className="font-medium text-foreground mb-2">Mevcut Randevu Bilgileri</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Oluşturulma:</span> {
                      appointment.createdAt ? formatDateTime(appointment.createdAt) : 'Bilinmiyor'
                    }
                  </div>
                  {appointment.updatedAt && (
                    <div>
                      <span className="font-medium">Son Güncelleme:</span> {formatDateTime(appointment.updatedAt)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions for Common Appointment Types */}
            <div className="bg-muted p-4 rounded-2xl">
              <h4 className="font-medium text-foreground mb-2">Hızlı Notlar</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Kontrol muayenesi',
                  'Cihaz ayarı',
                  'Kulak kalıbı alımı',
                  'Odyometri testi',
                  'Cihaz temizliği',
                  'Garanti kontrolü'
                ].map((quickNote) => (
                  <button data-allow-raw="true"
                    key={quickNote}
                    type="button"
                    onClick={() => {
                      const currentNote = formData.note.trim();
                      const newNote = currentNote
                        ? `${currentNote}\n• ${quickNote}`
                        : `• ${quickNote}`;
                      handleInputChange('note', newNote);
                    }}
                    className="text-left p-2 text-sm border border-border rounded hover:bg-muted transition-colors"
                  >
                    + {quickNote}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <Alert variant="error" className="border-red-200 bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="border-green-200 bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                {success}
              </Alert>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-foreground bg-muted hover:bg-accent rounded-xl"
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="px-6 py-2 premium-gradient tactile-press text-white rounded-xl flex items-center"
              disabled={loading || isLoading}
            >
              {(loading || isLoading) && <Spinner className="w-4 h-4 mr-2" />}
              {(loading || isLoading) ? 'Kaydediliyor...' : (isEditing ? 'Güncelle' : 'Randevu Oluştur')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;