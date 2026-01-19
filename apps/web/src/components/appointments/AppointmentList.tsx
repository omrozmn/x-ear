import { Button, Input, Select } from '@x-ear/ui-web';
import React, { useState, useMemo } from 'react';
import { Appointment, AppointmentFilters, AppointmentStatus, AppointmentType } from '../../types/appointment';
import { useAppointments } from '../../hooks/useAppointments';
import { useAppointmentListKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

interface AppointmentListProps {
  partyId?: string;
  showFilters?: boolean;
  showActions?: boolean;
  onAppointmentClick?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (appointment: Appointment) => void;
  className?: string;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  partyId,
  showFilters = true,
  showActions = true,
  onAppointmentClick,
  onEditAppointment,
  onDeleteAppointment,
  className = ''
}) => {
  const [filters, setFilters] = useState<AppointmentFilters>({
    partyId,
    status: undefined,
    type: undefined,
    startDate: '',
    endDate: '',
    search: ''
  });

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const {
    appointments,
    loading,
    error: _error,
    createAppointmentCancel,
    createAppointmentComplete,
    markNoShow,
    rescheduleAppointment: _rescheduleAppointment
  } = useAppointments({ filters });

  const handleFilterChange = (key: keyof AppointmentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: AppointmentStatus): string => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      rescheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatusLabel = (status: AppointmentStatus): string => {
    const labels = {
      scheduled: 'Planlandı',
      confirmed: 'Onaylandı',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
      no_show: 'Gelmedi',
      rescheduled: 'Ertelendi'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: AppointmentType): string => {
    const labels = {
      consultation: 'Konsültasyon',
      follow_up: 'Kontrol',
      trial: 'Deneme',
      delivery: 'Teslim',
      control_visit: 'Kontrol Ziyareti',
      battery_renewal: 'Pil Yenileme',
      repair: 'Tamir',
      fitting: 'Ayar',
      assessment: 'Değerlendirme'
    };
    return labels[type] || type;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (time: string): string => {
    return time.substring(0, 5); // HH:MM format
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: AppointmentStatus) => {
    try {
      switch (newStatus) {
        case 'cancelled':
          await createAppointmentCancel(appointment.id, 'Kullanıcı tarafından iptal edildi');
          break;
        case 'completed':
          await createAppointmentComplete(appointment.id, 'Randevu tamamlandı');
          break;
        case 'no_show':
          await markNoShow(appointment.id);
          break;
      }
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [appointments]);

  // Keyboard navigation
  useAppointmentListKeyboardNavigation({
    appointments: sortedAppointments,
    selectedIndex,
    onSelectionChange: setSelectedIndex,
    onAppointmentSelect: (appointment) => onAppointmentClick?.(appointment),
    onAppointmentEdit: (appointment) => onEditAppointment?.(appointment),
    onAppointmentDelete: (appointment) => onDeleteAppointment?.(appointment),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Randevular yükleniyor...</span>
      </div>
    );
  }

  if (_error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Hata</h3>
            <div className="mt-2 text-sm text-red-700">{_error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`appointment-list ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Select
                label="Durum"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                options={[
                  { value: "", label: "Tümü" },
                  { value: "scheduled", label: "Planlandı" },
                  { value: "confirmed", label: "Onaylandı" },
                  { value: "completed", label: "Tamamlandı" },
                  { value: "cancelled", label: "İptal Edildi" },
                  { value: "no_show", label: "Gelmedi" }
                ]}
                fullWidth
              />
            </div>

            <div>
              <Select
                label="Tür"
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                options={[
                  { value: "", label: "Tümü" },
                  { value: "consultation", label: "Konsültasyon" },
                  { value: "follow_up", label: "Kontrol" },
                  { value: "trial", label: "Deneme" },
                  { value: "delivery", label: "Teslim" },
                  { value: "control_visit", label: "Kontrol Ziyareti" },
                  { value: "battery_renewal", label: "Pil Yenileme" },
                  { value: "repair", label: "Tamir" },
                  { value: "fitting", label: "Ayar" },
                  { value: "assessment", label: "Değerlendirme" }
                ]}
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Başlangıç Tarihi
              </label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bitiş Tarihi
              </label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arama
            </label>
            <Input
              type="text"
              placeholder="Hasta adı, doktor, notlar..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
      {/* Appointment List */}
      {sortedAppointments.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Randevu bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Belirtilen kriterlere uygun randevu bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tarih & Saat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Doktor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Süre
                  </th>
                  {showActions && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      İşlemler
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedAppointments.map((appointment, index) => (
                  <tr
                    key={appointment.id}
                    className={`
                      hover:bg-gray-50 dark:hover:bg-gray-700
                      ${onAppointmentClick ? 'cursor-pointer' : ''} 
                      ${selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}
                    `}
                    onClick={() => onAppointmentClick?.(appointment)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              {appointment.partyName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {appointment.partyName || 'İsimsiz Hasta'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {appointment.partyId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(appointment.date)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(appointment.time)} ({appointment.duration} dk)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getTypeLabel(appointment.type)}
                      </div>
                      {appointment.title && appointment.title !== getTypeLabel(appointment.type) && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {appointment.title}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {appointment.clinician || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {appointment.duration} dakika
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {appointment.status === 'scheduled' && (
                            <>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(appointment, 'completed');
                                }}
                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 text-xs"
                                title="Tamamla"
                                variant='default'>
                                Tamamla
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(appointment, 'no_show');
                                }}
                                className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 text-xs"
                                title="Gelmedi"
                                variant='default'>
                                Gelmedi
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(appointment, 'cancelled');
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-xs"
                                title="İptal Et"
                                variant='default'>
                                İptal
                              </Button>
                            </>
                          )}
                          {onEditAppointment && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditAppointment(appointment);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-xs"
                              title="Düzenle"
                              variant='default'>
                              Düzenle
                            </Button>
                          )}
                          {onDeleteAppointment && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAppointment(appointment);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-xs"
                              title="Sil"
                              variant='default'>
                              Sil
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
        Toplam {sortedAppointments.length} randevu gösteriliyor
      </div>
    </div>
  );
};