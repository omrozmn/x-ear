import { Button } from '@x-ear/ui-web';
import React, { useState } from 'react';
import { Appointment, CalendarView } from '../../types/appointment';
import { patientApiService } from '../../services/patient/patient-api.service';
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
  showCreateButton?: boolean;
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  className = '',
  onAppointmentClick,
  onDateClick,
  view = 'month',
  selectedDate = new Date(),
  showCreateButton = true
}) => {
  const { appointments, loading } = useAppointments();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [currentView, setCurrentView] = useState<CalendarView>(view);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create'>('view');
  const [quickAppointmentData, setQuickAppointmentData] = useState<{
    date: string;
    time: string;
  } | null>(null);

  // Keep selectedAppointment in sync when underlying appointments list updates
  React.useEffect(() => {
    if (!selectedAppointment) return;
    const updated = appointments.find(a => a.id === selectedAppointment.id);
    if (updated) setSelectedAppointment(updated);
  }, [appointments, selectedAppointment]);

  // Handle appointment click — open modal immediately and enrich patient name asynchronously
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setQuickAppointmentData(null);
    // Open the modal directly in edit mode so form fields are prefilled
    setModalMode('edit');
    setShowModal(true);
    onAppointmentClick?.(appointment);

    // Best-effort: fetch patient name and update the selected appointment afterwards
    (async () => {
      try {
        if (!appointment.patientName && appointment.patientId) {
          const patient = await patientApiService.fetchPatient(appointment.patientId);
          if (patient) {
            setSelectedAppointment(prev => prev && prev.id === appointment.id ? { ...prev, patientName: patient.name } : prev);
          }
        }
      } catch (err) {
        // ignore failures
      }
    })();
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    // navigate user to day view for clicked date
    setCurrentDate(date);
    setCurrentView('day');
    onDateClick?.(dateStr);
  };

  // Handle time slot click (for day/week views) - Quick appointment creation
  const handleTimeSlotClick = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    setCurrentDate(date);
    setSelectedAppointment(null);
    setQuickAppointmentData({
      date: dateStr,
      time: time
    });
    setModalMode('create');
    setShowModal(true);
  };

  // Handle date change from calendar navigation
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  // Handle day double click (for month view) - Quick appointment creation
  const handleDayDoubleClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setCurrentDate(date);
    setSelectedAppointment(null);
    setQuickAppointmentData({
      date: dateStr,
      time: '09:00' // Default time for double-click
    });
    setModalMode('create');
    setShowModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedAppointment(null);
    setQuickAppointmentData(null);
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
        
        {showCreateButton && (
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
        )}
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
        onClose={handleModalClose}
        mode={modalMode}
        quickAppointmentData={quickAppointmentData}
        initialDate={quickAppointmentData?.date || selectedAppointment?.date || currentDate.toISOString().split('T')[0]}
        initialTime={quickAppointmentData?.time || selectedAppointment?.time}
      />
    </div>
  );
};