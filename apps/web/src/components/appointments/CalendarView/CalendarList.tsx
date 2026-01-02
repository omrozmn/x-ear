import React, { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, Text, Badge, Button, VStack, HStack, Input } from '@x-ear/ui-web';
import { Calendar, Clock, User, MapPin, Phone, Search } from 'lucide-react';
import { Appointment } from '../../../types/appointment';
import { AppointmentCard } from '../AppointmentCard';

interface CalendarListProps {
  selectedDate: Date;
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onDateClick?: (date: Date) => void;
  isCompactView?: boolean;
}

interface GroupedAppointments {
  [date: string]: Appointment[];
}

interface MonthGroup {
  monthKey: string; // yyyy-MM
  monthLabel: string; // e.g., Nisan 2026
  dates: Record<string, Appointment[]>; // date -> appointments
}

export const CalendarList: React.FC<CalendarListProps> = ({
  selectedDate,
  appointments,
  onDateChange,
  onAppointmentClick,
  onDateClick,
  isCompactView = false,
}) => {
  const [showAll, setShowAll] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'patient' | 'status'>('date');

  // Get week range for list view
  const weekStart = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 1 });
  }, [selectedDate]);

  const weekEnd = useMemo(() => {
    return endOfWeek(selectedDate, { weekStartsOn: 1 });
  }, [selectedDate]);

  // Filter appointments and group by month -> date
  const groupedByMonth = useMemo((): MonthGroup[] => {
    const filtered = appointments.filter(apt => {
      const aptDate = parseISO(apt.date);
      const isInWeek = aptDate >= weekStart && aptDate <= weekEnd;
      
      // When showAll is true, include all appointments; otherwise restrict to selected week
      if (!showAll && !isInWeek) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesPatient = apt.patientName?.toLowerCase().includes(searchLower);
        const matchesType = apt.type?.toLowerCase().includes(searchLower);
        const matchesNotes = apt.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesPatient && !matchesType && !matchesNotes) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'all' && apt.status !== filterStatus) {
        return false;
      }

      return true;
    });

    // Sort appointments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'patient':
          return (a.patientName || '').localeCompare(b.patientName || '');
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare === 0) {
            return a.time.localeCompare(b.time);
          }
          return dateCompare;
      }
    });

    // Group by month -> date
    const monthsMap: Record<string, MonthGroup> = {};

    filtered.forEach(apt => {
      const dateObj = parseISO(apt.date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = format(dateObj, 'MMMM yyyy', { locale: tr });
      const dateKey = apt.date;

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          monthKey,
          monthLabel,
          dates: {}
        };
      }

      if (!monthsMap[monthKey].dates[dateKey]) {
        monthsMap[monthKey].dates[dateKey] = [];
      }

      monthsMap[monthKey].dates[dateKey].push(apt);
    });

    // Convert to ordered array
    const months = Object.values(monthsMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return months;
  }, [appointments, weekStart, weekEnd, searchTerm, filterStatus, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Onaylandı';
      case 'pending':
        return 'Bekliyor';
      case 'cancelled':
        return 'İptal';
      case 'completed':
        return 'Tamamlandı';
      default:
        return status;
    }
  };

  // Count total appointments across all months/dates
  const totalAppointments = groupedByMonth.reduce((sum, m) => {
    return sum + Object.values(m.dates).flat().length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <Text className="text-lg font-semibold">
                {showAll ? 'Tüm Randevular' : `${format(weekStart, 'd MMMM', { locale: tr })} - ${format(weekEnd, 'd MMMM yyyy', { locale: tr })}`}
              </Text>
            </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Görüntüle:</label>
                  <select value={showAll ? 'all' : 'week'} onChange={(e) => setShowAll(e.target.value === 'all')} className="px-2 py-1 border rounded-md">
                    <option value="all">Tümü</option>
                    <option value="week">Bu Hafta</option>
                  </select>
                </div>

                <Badge variant="secondary">
                  {totalAppointments} randevu
                </Badge>
              </div>
          </div>

          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Hasta, tür veya notlarda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="confirmed">Onaylandı</option>
              <option value="pending">Bekliyor</option>
              <option value="cancelled">İptal</option>
              <option value="completed">Tamamlandı</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'patient' | 'status')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Tarihe Göre</option>
              <option value="patient">Hastaya Göre</option>
              <option value="status">Duruma Göre</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Appointments list */}
      <div className="space-y-4">
        {groupedByMonth.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <Text className="text-gray-600">
              {searchTerm || filterStatus !== 'all' 
                ? 'Filtrelere uygun randevu bulunamadı'
                : 'Bu hafta için randevu bulunmuyor'
              }
            </Text>
          </Card>
        ) : (
          groupedByMonth.map((month) => (
            <div key={month.monthKey} className="space-y-4">
              <div className="flex items-center justify-between">
                <Text className="text-xl font-semibold">{month.monthLabel}</Text>
                <Badge variant="secondary">{Object.values(month.dates).flat().length} randevu</Badge>
              </div>

              {Object.entries(month.dates)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dayAppointments]) => (
                  <Card key={date} className="overflow-hidden">
                    <div className="bg-white px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Text className="font-semibold text-gray-900">
                            {format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: tr })}
                          </Text>
                          {isSameDay(parseISO(date), new Date()) && (
                            <Badge variant="primary" size="sm">Bugün</Badge>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {dayAppointments.length} randevu
                        </Badge>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => onAppointmentClick(appointment)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <Text className="font-medium text-gray-900">
                                  {appointment.time}
                                </Text>
                              </div>

                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <Text className="font-medium">
                                  {appointment.patientName || 'Hasta bilgisi yok'}
                                </Text>
                              </div>

                              <Badge className={getStatusColor(appointment.status)}>
                                {getStatusLabel(appointment.status)}
                              </Badge>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{appointment.location || 'Ana Şube'}</span>
                              </div>
                              
                              <span className="font-medium">
                                {appointment.duration || 30} dk
                              </span>
                              
                              <span className="px-2 py-1 bg-gray-100 rounded-md">
                                {appointment.type}
                              </span>
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <Text>{appointment.notes}</Text>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarList;