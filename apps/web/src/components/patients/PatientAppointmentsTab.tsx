import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, X, Check, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button, Badge, Input, Textarea } from '@x-ear/ui-web';
import { Patient } from '../../types/patient';
import { getAppointments } from '../../api/generated/appointments/appointments';
import type { 
  Appointment, 
  AppointmentsGetAppointmentsParams,
  AppointmentsCreateAppointmentBody,
  AppointmentsCancelAppointmentBody,
  AppointmentsCompleteAppointmentBody,
  AppointmentsRescheduleAppointmentBody
} from '../../api/generated/api.schemas';

interface PatientAppointmentsTabProps {
  patient: Patient;
  onPatientUpdate: (patient: Patient) => void;
}

export const PatientAppointmentsTab: React.FC<PatientAppointmentsTabProps> = ({ patient, onPatientUpdate }) => {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });

  // Load appointments for this patient
  useEffect(() => {
    loadAppointments();
  }, [patient.id]);

  const loadAppointments = async () => {
    if (!patient.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const appointmentApi = getAppointments();
      const params: AppointmentsGetAppointmentsParams = {
        patient_id: patient.id,
        page: 1,
        per_page: 100
      };
      
      const response = await appointmentApi.appointmentsGetAppointments(params);
      setAppointments(response.data?.data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('Randevular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments based on current filters
  const filteredAppointments = appointments.filter(appointment => {
    if (filters.status !== 'all' && appointment.status !== filters.status) {
      return false;
    }
    
    if (filters.search && !appointment.notes?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleNewAppointment = async (appointmentData: AppointmentsCreateAppointmentBody) => {
    try {
      const appointmentApi = getAppointments();
      await appointmentApi.appointmentsCreateAppointment(appointmentData);
      await loadAppointments();
      setShowBookingForm(false);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError('Randevu oluşturulurken hata oluştu');
    }
  };

  const handleCancelAppointment = async (appointmentId: string, reason?: string) => {
    try {
      const appointmentApi = getAppointments();
      const cancelData: AppointmentsCancelAppointmentBody = { reason };
      await appointmentApi.appointmentsCancelAppointment(appointmentId, cancelData);
      await loadAppointments();
    } catch (err) {
      console.error('Error canceling appointment:', err);
      setError('Randevu iptal edilirken hata oluştu');
    }
  };

  const handleConfirmAppointment = async (appointmentId: string, notes?: string) => {
    try {
      const appointmentApi = getAppointments();
      const completeData: AppointmentsCompleteAppointmentBody = { notes };
      await appointmentApi.appointmentsCompleteAppointment(appointmentId, completeData);
      await loadAppointments();
    } catch (err) {
      console.error('Error completing appointment:', err);
      setError('Randevu tamamlanırken hata oluştu');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Planlandı</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Onaylandı</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Tamamlandı</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">İptal</Badge>;
      case 'no_show':
        return <Badge className="bg-orange-100 text-orange-800">Gelmedi</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Bilinmiyor</Badge>;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Randevular yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Randevular</h3>
          <p className="text-sm text-gray-600">
            {filteredAppointments.length} randevu bulundu
          </p>
        </div>
        <Button 
          onClick={() => setShowBookingForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Randevu
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="scheduled">Planlandı</option>
              <option value="confirmed">Onaylandı</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
              <option value="no_show">Gelmedi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <Input
              type="date"
              value={filters.dateRange === 'all' ? '' : filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value || 'all' }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <Input
              type="text"
              placeholder="Notlarda ara..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(appointment.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {appointment.date} - {appointment.time}
                      </p>
                      <p className="text-sm text-gray-600">
                        Süre: {appointment.duration || 30} dakika
                      </p>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>

                  {appointment.appointmentType && (
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Tür:</strong> {appointment.appointmentType}
                    </p>
                  )}

                  {appointment.clinicianId && (
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Doktor:</strong> {appointment.clinicianId}
                    </p>
                  )}

                  {appointment.notes && (
                    <p className="text-sm text-gray-600">
                      <strong>Notlar:</strong> {appointment.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {appointment.status === 'SCHEDULED' && (
                    <>
                      <Button
                        onClick={() => appointment.id && handleConfirmAppointment(appointment.id)}
                        className="p-2 text-green-600 hover:bg-green-50"
                        title="Tamamla"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => appointment.id && handleCancelAppointment(appointment.id, 'Hasta tarafından iptal edildi')}
                        className="p-2 text-red-600 hover:bg-red-50"
                        title="İptal Et"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    className="p-2 text-gray-600 hover:bg-gray-50"
                    title="Düzenle"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{filters.status !== 'all' || filters.dateRange !== 'all' ? 'Filtre kriterlerine uygun randevu bulunamadı.' : 'Henüz randevu bulunmamaktadır.'}</p>
          </div>
        )}
      </div>

      {/* New Appointment Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Yeni Randevu</h3>
              <Button
                onClick={() => setShowBookingForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const appointmentData: AppointmentsCreateAppointmentBody = {
                patientId: patient.id || '',
                date: formData.get('date') as string,
                time: formData.get('time') as string,
                duration: parseInt(formData.get('duration') as string) || 30,
                appointmentType: formData.get('type') as string,
                notes: formData.get('notes') as string
              };
              handleNewAppointment(appointmentData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                  <Input type="date" name="date" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
                  <Input type="time" name="time" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dakika)</label>
                  <Input type="number" name="duration" defaultValue="30" min="15" max="180" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Randevu Türü</label>
                  <Input type="text" name="type" placeholder="Kontrol, Muayene, vb." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                  <Textarea name="notes" rows={3} placeholder="Randevu notları..." />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Randevu Oluştur
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};