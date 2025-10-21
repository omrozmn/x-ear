import React, { useState, useMemo } from 'react';
import { usePatientAppointments } from '../hooks/patient/usePatientAppointments';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { ErrorBoundary } from './common/ErrorBoundary';
import { AppointmentSchedulingForm } from './forms/AppointmentSchedulingForm';
import { Calendar, AlertCircle, Plus, Search, Filter } from 'lucide-react';
import { Button } from './ui/Button';

interface PatientAppointmentsTabProps {
  patientId: string;
}

export const PatientAppointmentsTab: React.FC<PatientAppointmentsTabProps> = ({
  patientId
}) => {
  const { appointments, isLoading: appointmentsLoading, error: appointmentsError } = usePatientAppointments(patientId);
  const [showSchedulingForm, setShowSchedulingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Filtered appointments and statistics
  const { filteredAppointments, filteredStats } = useMemo(() => {
    let filtered = appointments;

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.appointmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Appointment type filter
    if (appointmentTypeFilter) {
      filtered = filtered.filter(appointment => appointment.appointmentType === appointmentTypeFilter);
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;

        if (startDate && appointmentDate < startDate) return false;
        if (endDate && appointmentDate > endDate) return false;
        return true;
      });
    }

    // Calculate statistics
    const appointmentTypeCounts = filtered.reduce((acc, appointment) => {
      acc[appointment.appointmentType] = (acc[appointment.appointmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const upcomingAppointments = filtered.filter(appointment => {
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
      return appointmentDateTime > new Date() && appointment.status === 'scheduled';
    }).length;

    return {
      filteredAppointments: filtered,
      filteredStats: {
        totalAppointments: filtered.length,
        appointmentTypeCounts,
        upcomingAppointments
      }
    };
  }, [appointments, searchTerm, appointmentTypeFilter, dateRange]);

  // Get unique appointment types for filter dropdown
  const appointmentTypes = useMemo(() => {
    const types = new Set(appointments.map(appointment => appointment.appointmentType));
    return Array.from(types).sort();
  }, [appointments]);

  if (appointmentsLoading) {
    return (
      <div className="p-6" role="status" aria-label="Randevular yükleniyor">
        <LoadingSkeleton lines={4} className="mb-4" />
        <div className="grid gap-4">
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (appointmentsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Randevular yüklenirken hata oluştu</h3>
              <p className="mt-1 text-sm text-red-700">
                {typeof appointmentsError === 'string' ? appointmentsError : appointmentsError.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAppointmentClick = (appointment: any) => {
    // TODO: Implement appointment detail modal or navigation
    console.log('Appointment clicked:', appointment);
  };

  const handleScheduleAppointment = () => {
    setShowSchedulingForm(true);
  };

  const handleSchedulingFormClose = () => {
    setShowSchedulingForm(false);
  };

  const handleAppointmentSave = async (appointmentData: any) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement appointment save API call
      console.log('Appointment save:', appointmentData);
      setShowSchedulingForm(false);
    } catch (error) {
      console.error('Appointment save failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="w-5 h-5 mr-2" aria-hidden="true" />
          Hasta Randevuları ({filteredAppointments.length})
        </h3>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-400 mr-2" aria-hidden="true" />
          <h4 className="text-sm font-medium text-gray-900">Arama ve Filtreleme</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Arama
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Randevu türü, notlar veya durum ara..."
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="appointmentType" className="block text-sm font-medium text-gray-700">
              Randevu Türü
            </label>
            <select
              id="appointmentType"
              value={appointmentTypeFilter}
              onChange={(e) => setAppointmentTypeFilter(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Tümü</option>
              {appointmentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
              Tarih Aralığı
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="date"
                id="startDate"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <input
                type="date"
                id="endDate"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {filteredAppointments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Toplam Randevu</p>
                <p className="text-lg font-semibold text-blue-900">{filteredStats.totalAppointments}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-green-600">Yaklaşan Randevular</p>
                <p className="text-lg font-semibold text-green-900">{filteredStats.upcomingAppointments}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-purple-600">En Çok Randevu Türü</p>
                <p className="text-lg font-semibold text-purple-900">
                  {Object.keys(filteredStats.appointmentTypeCounts).length > 0
                    ? Object.entries(filteredStats.appointmentTypeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                    : 'Yok'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12" role="status">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz randevu yok</h3>
          <p className="text-gray-500">
            Bu hastaya henüz randevu oluşturulmamış.
          </p>
        </div>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Hasta randevuları listesi">
          {appointments.map((appointment) => (
            <div key={appointment.id} role="listitem" className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {appointment.appointmentType} - {appointment.date} {appointment.time}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Süre: {appointment.duration} dakika
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {appointment.status === 'completed' ? 'Tamamlandı' :
                   appointment.status === 'scheduled' ? 'Planlandı' :
                   appointment.status === 'cancelled' ? 'İptal Edildi' :
                   appointment.status}
                </span>
              </div>
              {appointment.notes && (
                <p className="mt-2 text-sm text-gray-600">{appointment.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <Button onClick={handleScheduleAppointment} aria-label="Yeni randevu oluştur">
        <Plus className="w-5 h-5" aria-hidden="true" />
        Yeni Randevu Oluştur
      </Button>
      {showSchedulingForm && (
        <AppointmentSchedulingForm
          patientId={patientId}
          isOpen={showSchedulingForm}
          onClose={handleSchedulingFormClose}
          onSave={handleAppointmentSave}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};