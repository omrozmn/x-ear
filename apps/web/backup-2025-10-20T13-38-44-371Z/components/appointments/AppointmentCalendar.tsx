import { Button } from '@x-ear/ui-web';
import React, { useState, useMemo } from 'react';
import { Appointment, CalendarView } from '../../types/appointment';
import { useAppointments } from '../../hooks/useAppointments';
import { AppointmentModal } from './AppointmentModal';

interface AppointmentCalendarProps {
  className?: string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateClick?: (date: string) => void;
  view?: CalendarView;
  selectedDate?: Date;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  className = '',
  onAppointmentClick,
  onDateClick,
  view: _view,
  selectedDate = new Date()
}) => {
  const { appointments, loading } = useAppointments();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create'>('view');

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first day of the week containing the first day of the month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // End at the last day of the week containing the last day of the month
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const currentDateObj = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    while (currentDateObj <= endDate) {
      const dateStr = currentDateObj.toISOString().split('T')[0];
      const dayAppointments = appointments.filter(apt => apt.date === dateStr);
      
      days.push({
        date: new Date(currentDateObj),
        isCurrentMonth: currentDateObj.getMonth() === month,
        isToday: currentDateObj.getTime() === today.getTime(),
        appointments: dayAppointments
      });
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  }, [currentDate, appointments]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: CalendarDay) => {
    const dateStr = day.date.toISOString().split('T')[0];
    onDateClick?.(dateStr);
    
    if (day.appointments.length === 0) {
      // Create new appointment for this date
      setSelectedAppointment(null);
      setModalMode('create');
      setShowModal(true);
    } else if (day.appointments.length === 1) {
      // Show single appointment
      setSelectedAppointment(day.appointments[0]);
      setModalMode('view');
      setShowModal(true);
    }
    // For multiple appointments, we could show a list or the first one
  };

  const handleAppointmentClick = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(appointment);
    setModalMode('view');
    setShowModal(true);
    onAppointmentClick?.(appointment);
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      scheduled: 'bg-blue-500',
      confirmed: 'bg-green-500',
      completed: 'bg-gray-500',
      cancelled: 'bg-red-500',
      no_show: 'bg-orange-500',
      rescheduled: 'bg-yellow-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const weekDays = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

  if (loading) {
    return (
      <div className={`appointment-calendar ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`appointment-calendar ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {formatMonthYear(currentDate)}
          </h2>
          <Button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            variant='default'>
            Bugün
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            variant='default'>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            variant='default'>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 bg-gray-50">
          {weekDays.map(day => (
            <div key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 divide-y divide-gray-200">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              onClick={() => handleDayClick(day)}
              className={`
                min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition-colors
                ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                ${day.isToday ? 'bg-blue-50' : ''}
              `}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  text-sm font-medium
                  ${day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                `}>
                  {day.date.getDate()}
                </span>
                {day.appointments.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {day.appointments.length}
                  </span>
                )}
              </div>

              {/* Appointments */}
              <div className="space-y-1">
                {day.appointments.slice(0, 3).map((appointment, _aptIndex) => (
                  <div
                    key={appointment.id}
                    onClick={(e) => handleAppointmentClick(appointment, e)}
                    className={`
                      px-2 py-1 rounded text-xs text-white cursor-pointer hover:opacity-80 transition-opacity
                      ${getStatusColor(appointment.status)}
                    `}
                    title={`${appointment.time} - ${appointment.patientName} - ${appointment.title}`}
                  >
                    <div className="truncate">
                      {appointment.time.substring(0, 5)} {appointment.patientName}
                    </div>
                  </div>
                ))}
                
                {day.appointments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.appointments.length - 3} daha
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
          <span>Planlandı</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
          <span>Onaylandı</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
          <span>Tamamlandı</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
          <span>İptal</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
          <span>Gelmedi</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
          <span>Ertelendi</span>
        </div>
      </div>
      {/* Appointment Modal */}
      <AppointmentModal
        appointment={selectedAppointment || undefined}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
        initialDate={selectedAppointment?.date}
        initialTime={selectedAppointment?.time}
      />
    </div>
  );
};