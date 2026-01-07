import React, { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday as isDateToday
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { useDroppable } from '@dnd-kit/core';
import { Button, Card, Text, Badge } from '@x-ear/ui-web';
import { Appointment } from '../../../types/appointment';
import { useCalendarKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';

interface CalendarMonthProps {
  selectedDate: Date;
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onDayDoubleClick?: (date: Date) => void;
  isCompactView?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  selectedDate,
  appointments,
  onDateChange,
  onDateClick,
  onAppointmentClick,
  onDayDoubleClick,
  isCompactView = false,
}) => {
  // Generate calendar days (6 weeks)
  const calendarDays = useMemo((): CalendarDay[] => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: CalendarDay[] = [];
    let currentDate = calendarStart;

    while (currentDate <= calendarEnd) {
      const dayAppointments = appointments.filter(apt =>
        isSameDay(new Date(apt.date), currentDate)
      );

      days.push({
        date: new Date(currentDate),
        isCurrentMonth: isSameMonth(currentDate, selectedDate),
        isToday: isDateToday(currentDate),
        appointments: dayAppointments,
      });

      currentDate = addDays(currentDate, 1);
    }

    return days;
  }, [selectedDate, appointments]);

  // Keyboard navigation
  useCalendarKeyboardNavigation({
    currentDate: selectedDate,
    onDateChange,
    viewMode: 'month',
  });

  const DayCell: React.FC<{ day: CalendarDay }> = ({ day }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `month-day-${format(day.date, 'yyyy-MM-dd')}`,
      data: {
        type: 'calendar-day',
        date: day.date,
      },
    });

    const handleDoubleClick = () => {
      if (onDayDoubleClick) {
        onDayDoubleClick(day.date);
      }
    };

    const appointmentsByStatus = useMemo(() => {
      return day.appointments.reduce((acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }, [day.appointments]);

    return (
      <div
        ref={setNodeRef}
        className={`
          min-h-[120px] border border-gray-200 dark:border-gray-700 p-2 cursor-pointer transition-all
          ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''}
          ${day.isToday ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : ''}
          ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600' : ''}
          hover:bg-gray-50 dark:hover:bg-gray-800
        `}
        onClick={() => onDateClick(day.date)}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex flex-col h-full">
          {/* Day number */}
          <div className="flex items-center justify-between mb-2">
            <Text
              className={`
                text-sm font-medium
                ${day.isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-gray-100'}
                ${!day.isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : ''}
              `}
            >
              {format(day.date, 'd')}
            </Text>
            {day.appointments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {day.appointments.length}
              </Badge>
            )}
          </div>

          {/* Appointments */}
          <div className="flex-1 space-y-1 overflow-hidden">
            {isCompactView ? (
              // Compact view - show status dots
              <div className="flex flex-wrap gap-1">
                {Object.entries(appointmentsByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className={`
                      w-2 h-2 rounded-full
                      ${status === 'scheduled' ? 'bg-blue-500' : ''}
                      ${status === 'confirmed' ? 'bg-green-500' : ''}
                      ${status === 'cancelled' ? 'bg-red-500' : ''}
                      ${status === 'completed' ? 'bg-gray-500' : ''}
                    `}
                    title={`${count} ${status} appointments`}
                  />
                ))}
              </div>
            ) : (
              // Full view - show appointment cards with patient names
              day.appointments.slice(0, 3).map((appointment) => (
                <div
                  key={appointment.id}
                  className="text-xs p-1 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 truncate text-gray-900 dark:text-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppointmentClick(appointment);
                  }}
                >
                  <div className="font-medium truncate">
                    {appointment.time} {appointment.patientName || 'Hasta bilgisi yok'}
                  </div>
                </div>
              ))
            )}

            {day.appointments.length > 3 && !isCompactView && (
              <Text className="text-xs text-gray-500 text-center">
                +{day.appointments.length - 3} daha
              </Text>
            )}
          </div>
        </div>
      </div>
    );
  };

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const prevMonth = new Date(selectedDate);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              onDateChange(prevMonth);
            }}
          >
            ←
          </Button>
          <Text className="text-lg font-semibold dark:text-white">
            {format(selectedDate, 'MMMM yyyy', { locale: tr })}
          </Text>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextMonth = new Date(selectedDate);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              onDateChange(nextMonth);
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
          Bu Ay
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center bg-gray-50 dark:bg-gray-800">
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">{day}</Text>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {calendarDays.map((day) => (
            <DayCell key={day.date.toISOString()} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarMonth;