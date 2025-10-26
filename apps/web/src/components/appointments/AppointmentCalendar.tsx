import { Button } from '@x-ear/ui-web';
import React, { useState, useMemo } from 'react';
import { Appointment, CalendarView } from '../../types/appointment';
import { useAppointments } from '../../hooks/useAppointments';
import { AppointmentModal } from './AppointmentModal';
import { CalendarMonth } from './CalendarView/CalendarMonth';
import { CalendarWeek } from './CalendarView/CalendarWeek';
import { CalendarDay } from './CalendarView/CalendarDay';
import { CalendarList } from './CalendarView/CalendarList';

interface AppointmentCalendarProps {
  className?: string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateClick?: (date: string) => void;
  view?: CalendarView;
  selectedDate?: Date;
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  className = '',
  onAppointmentClick,
  onDateClick,
  view = 'month',
  selectedDate = new Date()
}) => {
  const { appointments, loading } = useAppointments();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [currentView, setCurrentView] = useState<CalendarView>(view);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create'>('view');

  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setModalMode('view');
    setShowModal(true);
    onAppointmentClick?.(appointment);
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    onDateClick?.(dateStr);
  };

  // Handle time slot click (for day/week views)
  const handleTimeSlotClick = (date: Date, time: string) => {
    setCurrentDate(date);
    setModalMode('create');
    setShowModal(true);
  };

  // Handle date change from calendar navigation
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  // Handle day double click (for month view)
  const handleDayDoubleClick = (date: Date) => {
    setCurrentDate(date);
    setModalMode('create');
    setShowModal(true);
  };

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
      {/* View Switcher */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              onClick={() => setCurrentView('day')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                currentView === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              variant='ghost'>
              Gün
            </Button>
            <Button
              onClick={() => setCurrentView('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                currentView === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              variant='ghost'>
              Hafta
            </Button>
            <Button
              onClick={() => setCurrentView('month')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                currentView === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              variant='ghost'>
              Ay
            </Button>
            <Button
              onClick={() => setCurrentView('list')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                currentView === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              variant='ghost'>
              Liste
            </Button>
          </div>
        </div>
        
        <Button
          onClick={() => {
            setModalMode('create');
            setShowModal(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          variant='default'>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Yeni Randevu
        </Button>
      </div>

      {/* Calendar Views */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {currentView === 'month' && (
          <CalendarMonth
            selectedDate={currentDate}
            appointments={appointments}
            onDateChange={handleDateChange}
            onDateClick={handleDateClick}
            onAppointmentClick={handleAppointmentClick}
            onDayDoubleClick={handleDayDoubleClick}
          />
        )}
        
        {currentView === 'week' && (
          <CalendarWeek
            selectedDate={currentDate}
            appointments={appointments}
            onDateChange={handleDateChange}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        )}
        
        {currentView === 'day' && (
          <CalendarDay
            selectedDate={currentDate}
            appointments={appointments}
            onDateChange={handleDateChange}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        )}
        
        {currentView === 'list' && (
          <CalendarList
            selectedDate={currentDate}
            appointments={appointments}
            onDateChange={handleDateChange}
            onAppointmentClick={handleAppointmentClick}
            onDateClick={handleDateClick}
          />
        )}
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        appointment={selectedAppointment || undefined}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
        initialDate={selectedAppointment?.date || currentDate.toISOString().split('T')[0]}
        initialTime={selectedAppointment?.time}
      />
    </div>
  );
};