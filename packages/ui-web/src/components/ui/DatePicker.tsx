import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return clsx(classes);
};

interface DatePickerProps {
  /** Called when user changes month or year via header selects (year, monthIndex 0-11) */
  onMonthYearChange?: (year: number, monthIndex: number) => void;
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
  showTime?: boolean;
  fullWidth?: boolean;
  className?: string;
  required?: boolean;
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  onMonthYearChange,
  placeholder = 'Tarih seçin',
  label,
  error,
  helperText,
  disabled = false,
  minDate,
  maxDate,
  dateFormat = 'dd/MM/yyyy',
  showTime = false,
  fullWidth = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [availableYears, setAvailableYears] = useState<number[]>(() => {
    const cur = new Date().getFullYear();
    const yearsArr: number[] = [];
    for (let y = cur - 5; y <= cur + 1; y++) yearsArr.push(y);
    return yearsArr;
  });
  const [timeValue, setTimeValue] = useState(
    value ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : '00:00'
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideContainer = containerRef.current && containerRef.current.contains(target);
      const clickedInsidePopup = popupRef.current && popupRef.current.contains(target);
      if (!clickedInsideContainer && !clickedInsidePopup) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    if (showTime) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    return `${day}/${month}/${year}`;
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get first day of week (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert to Monday = 0
    
    const days: Date[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(new Date(year, month, -firstDayOfWeek + i + 1));
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add days from next month to fill the grid
    const remainingCells = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    let selectedDate = new Date(date);
    
    if (showTime && timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      selectedDate.setHours(hours, minutes);
    }
    
    onChange?.(selectedDate);
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    if (value) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(value);
      newDate.setHours(hours, minutes);
      onChange?.(newDate);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const currentMonthNumber = currentMonth.getMonth();

  return (
    <div ref={containerRef} className={cn('relative', fullWidth ? 'w-full' : 'w-auto', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={formatDate(value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          ref={inputRef}
          onClick={() => {
            if (disabled) return;
            const next = !isOpen;
            setIsOpen(next);
            if (next && inputRef.current) {
              const rect = inputRef.current.getBoundingClientRect();
              setPopupStyle({ position: 'absolute', left: rect.left + window.scrollX, top: rect.bottom + window.scrollY + 8, zIndex: 9999 });
            }
          }}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer',
            error ? 'border-red-300' : 'border-gray-300',
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white',
            fullWidth ? 'w-full' : ''
          )}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Calendar className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isOpen && (() => {
        const popup = (
          <div style={popupStyle as any} className="bg-white border border-gray-200 rounded-md shadow-lg p-4 min-w-[280px]">
            {/* attach ref so outside clicks inside popup won't immediately close it */}
            <div ref={popupRef}>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Ay seçin"
                  value={currentMonth.getMonth()}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10);
                    setCurrentMonth(prev => {
                      const newDate = new Date(prev.getFullYear(), m, 1);
                      onMonthYearChange?.(newDate.getFullYear(), newDate.getMonth());
                      return newDate;
                    });
                  }}
                  className="text-sm px-2 py-1 border rounded"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>

                <select
                  aria-label="Yıl seçin"
                  value={currentMonth.getFullYear()}
                  onChange={(e) => {
                    const y = parseInt(e.target.value, 10);
                    setCurrentMonth(prev => {
                      const newDate = new Date(y, prev.getMonth(), 1);
                      onMonthYearChange?.(newDate.getFullYear(), newDate.getMonth());
                      return newDate;
                    });
                  }}
                  className="text-sm px-2 py-1 border rounded"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-xs font-medium text-gray-500 text-center p-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentMonthNumber;
                const isSelected = value ? isSameDay(date, value) : false;
                const isToday = isSameDay(date, new Date());
                const disabled = isDateDisabled(date);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    disabled={disabled}
                    className={cn(
                      'p-1 text-sm rounded hover:bg-gray-100 transition-colors',
                      !isCurrentMonth && 'text-gray-300',
                      isCurrentMonth && 'text-gray-900',
                      isSelected && 'bg-blue-500 text-white hover:bg-blue-600',
                      isToday && !isSelected && 'bg-blue-50 text-blue-600',
                      disabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Time Picker */}
            {showTime && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Saat
                </label>
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
            </div>
        );
        return typeof document !== 'undefined' ? createPortal(popup, document.body) : popup;
      })()}

      {(error || helperText) && (
        <div className="mt-1 text-sm">
          {error ? (
            <span className="text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </span>
          ) : (
            <span className="text-gray-500">{helperText}</span>
          )}
        </div>
      )}
    </div>
  );
};