import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, addHours, isSameHour } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useDroppable } from '@dnd-kit/core';
import { Button, Card, Text, VStack } from '@x-ear/ui-web';
import { Appointment } from '../../../types/appointment';
import { useCalendarKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';

interface CalendarDayProps {
  selectedDate: Date;
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  isCompactView?: boolean;
}

interface TimeSlot {
  time: string;
  hour: number;
  appointments: Appointment[];
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  selectedDate,
  appointments,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  isCompactView = false,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate time slots (8:00 - 18:00)
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 18;

    // Only consider appointments for the currently selected date
    const dayAppointments = appointments.filter(apt => {
      try {
        return startOfDay(new Date(apt.date)).getTime() === startOfDay(selectedDate).getTime();
      } catch {
        return false;
      }
    });

    for (let hour = startHour; hour <= endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const slotAppointments = dayAppointments.filter(apt => {
        const aptHour = parseInt(apt.time.split(':')[0]);
        return aptHour === hour;
      });

      slots.push({
        time,
        hour,
        appointments: slotAppointments,
      });
    }

    return slots;
  }, [appointments, selectedDate]);

  // Keyboard navigation
  useCalendarKeyboardNavigation({
    currentDate: selectedDate,
    onDateChange,
    viewMode: 'day',
  });

  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();
  const isCurrentHour = (hour: number) => {
    return isToday && currentTime.getHours() === hour;
  };

  const TimeSlotComponent: React.FC<{ slot: TimeSlot }> = ({ slot }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `time-slot-${slot.hour}`,
      data: {
        type: 'time-slot',
        date: selectedDate,
        time: slot.time,
      },
    });

    return (
      <div
        ref={setNodeRef}
        className={`
          min-h-[80px] border-b border-gray-200 p-2 transition-colors
          ${isOver ? 'bg-blue-50 border-blue-300' : ''}
          ${isCurrentHour(slot.hour) ? 'bg-yellow-50' : ''}
          hover:bg-gray-50 cursor-pointer
        `}
        onClick={() => onTimeSlotClick(selectedDate, slot.time)}
      >
        <div className="flex">
          <div className="w-16 text-sm text-gray-600 font-medium">
            {slot.time}
          </div>
          <div className="flex-1 space-y-1">
            {slot.appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="text-sm p-2 rounded bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick(appointment);
                }}
              >
                <div className="font-medium">
                  {appointment.patientName || 'Hasta bilgisi yok'}
                </div>
                <div className="text-xs text-gray-500">
                  {appointment.time} ({appointment.duration} dk)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const prevDay = new Date(selectedDate);
              prevDay.setDate(prevDay.getDate() - 1);
              onDateChange(prevDay);
            }}
          >
            ←
          </Button>
          <Text className="text-lg font-semibold">
            {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
          </Text>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextDay = new Date(selectedDate);
              nextDay.setDate(nextDay.getDate() + 1);
              onDateChange(nextDay);
            }}
          >
            →
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(new Date())}
        >
          Bugün
        </Button>
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto">
        {timeSlots.map((slot) => (
          <TimeSlotComponent key={slot.time} slot={slot} />
        ))}
      </div>

      {/* Current time indicator removed as requested */}
    </div>
  );
};

export default CalendarDay;