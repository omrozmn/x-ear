import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useDroppable } from '@dnd-kit/core';
import { Button, Card, Text, VStack } from '@x-ear/ui-web';
import { Appointment } from '../../../types/appointment';
import { useCalendarKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';

interface CalendarWeekProps {
  selectedDate: Date;
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  isCompactView?: boolean;
}

interface WeekDay {
  date: Date;
  isToday: boolean;
  appointments: Appointment[];
}

interface TimeSlot {
  time: string;
  hour: number;
}

export const CalendarWeek: React.FC<CalendarWeekProps> = ({
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

  // Generate week days
  const weekDays = useMemo((): WeekDay[] => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    const days: WeekDay[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      const dayAppointments = appointments.filter(apt =>
        isSameDay(new Date(apt.date), date)
      );

      days.push({
        date,
        isToday: isSameDay(date, new Date()),
        appointments: dayAppointments,
      });
    }

    return days;
  }, [selectedDate, appointments]);

  // Generate time slots (8:00 - 18:00)
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 18;

    for (let hour = startHour; hour <= endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      slots.push({ time, hour });
    }

    return slots;
  }, []);

  // Keyboard navigation
  useCalendarKeyboardNavigation({
    currentDate: selectedDate,
    onDateChange,
    viewMode: 'week',
  });

  const getAppointmentsForTimeSlot = (day: WeekDay, hour: number): Appointment[] => {
    return day.appointments.filter(apt => {
      const aptHour = parseInt(apt.time.split(':')[0]);
      return aptHour === hour;
    });
  };

  const isCurrentHour = (day: WeekDay, hour: number) => {
    return day.isToday && currentTime.getHours() === hour;
  };

  const TimeSlotCell: React.FC<{ day: WeekDay; slot: TimeSlot }> = ({ day, slot }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `week-time-slot-${format(day.date, 'yyyy-MM-dd')}-${slot.hour}`,
      data: {
        type: 'time-slot',
        date: day.date,
        time: slot.time,
      },
    });

    const slotAppointments = getAppointmentsForTimeSlot(day, slot.hour);

    return (
      <div
        ref={setNodeRef}
        className={`
          min-h-[60px] border-r border-b border-gray-200 dark:border-gray-700 p-1 transition-colors
          ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''}
          ${isCurrentHour(day, slot.hour) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
          hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer
        `}
        onClick={() => onTimeSlotClick(day.date, slot.time)}
      >
        <div className="space-y-1">
          {slotAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="text-xs p-1 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50"
              onClick={(e) => {
                e.stopPropagation();
                onAppointmentClick(appointment);
              }}
            >
              <div className="font-medium truncate text-gray-900 dark:text-gray-200">
                {appointment.partyName || 'Hasta bilgisi yok'}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                {appointment.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const prevWeek = new Date(selectedDate);
              prevWeek.setDate(prevWeek.getDate() - 7);
              onDateChange(prevWeek);
            }}
          >
            ←
          </Button>
          <Text className="text-lg font-semibold dark:text-white">
            {format(weekStart, 'dd MMM', { locale: tr })} - {format(weekEnd, 'dd MMM yyyy', { locale: tr })}
          </Text>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextWeek = new Date(selectedDate);
              nextWeek.setDate(nextWeek.getDate() + 7);
              onDateChange(nextWeek);
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
          Bu Hafta
        </Button>
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 min-w-full">
          {/* Time column header */}
          <div className="border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">Saat</Text>
          </div>

          {/* Day headers */}
          {weekDays.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`
                border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 text-center cursor-pointer
                ${day.isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
              `}
              onClick={() => onDateChange(day.date)}
            >
              <Text className="text-sm font-medium dark:text-gray-300">
                {format(day.date, 'EEE', { locale: tr })}
              </Text>
              <Text className={`text-lg ${day.isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'dark:text-white'}`}>
                {format(day.date, 'dd')}
              </Text>
            </div>
          ))}

          {/* Time slots and appointments */}
          {timeSlots.map((slot) => (
            <React.Fragment key={slot.time}>
              {/* Time label */}
              <div className="border-r border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 text-center">
                <Text className="text-xs text-gray-600 dark:text-gray-400">{slot.time}</Text>
              </div>

              {/* Day cells */}
              {weekDays.map((day) => (
                <TimeSlotCell
                  key={`${day.date.toISOString()}-${slot.time}`}
                  day={day}
                  slot={slot}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Current time indicator removed as requested */}
    </div>
  );
};

export default CalendarWeek;