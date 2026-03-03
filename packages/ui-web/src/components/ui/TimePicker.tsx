import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return clsx(classes);
};

interface TimePickerProps {
  value?: string; // HH:MM format
  onChange?: (time: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  minuteStep?: number; // 1, 5, 15, 30
  locale?: 'tr' | 'en';
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = '09:00',
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  className,
  minuteStep = 15,
  locale = 'tr',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    if (value) {
      const [h] = value.split(':').map(Number);
      return h;
    }
    return 9;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    if (value) {
      const [, m] = value.split(':').map(Number);
      return m;
    }
    return 0;
  });
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);

  const displayPlaceholder = placeholder || (locale === 'tr' ? 'Saat seçin' : 'Select time');

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

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setSelectedHour(h);
      setSelectedMinute(m);
    }
  }, [value]);

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    setMode('minute');
  };

  const handleMinuteClick = (minute: number) => {
    setSelectedMinute(minute);
    const timeString = `${selectedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange?.(timeString);
    setIsOpen(false);
    setMode('hour');
  };

  const getClockPosition = (index: number, total: number, radius: number) => {
    const angle = (index * 360) / total - 90;
    const radian = (angle * Math.PI) / 180;
    const x = radius + radius * Math.cos(radian);
    const y = radius + radius * Math.sin(radian);
    return { x, y };
  };

  const outerHours = Array.from({ length: 12 }, (_, i) => i);
  const innerHours = Array.from({ length: 12 }, (_, i) => i + 12);
  const minutesArr = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  const clockRadius = 110;
  const outerRadius = 80;
  const innerRadius = 50;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={displayPlaceholder}
          disabled={disabled}
          readOnly
          ref={inputRef}
          onClick={() => {
            if (disabled) return;
            const next = !isOpen;
            setIsOpen(next);
            if (next && inputRef.current) {
              const rect = inputRef.current.getBoundingClientRect();
              setPopupStyle({
                position: 'absolute',
                left: rect.left + window.scrollX,
                top: rect.bottom + window.scrollY + 8,
                zIndex: 9999
              });
            }
          }}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400',
            error ? 'border-red-300 dark:border-red-600' : 'border-gray-300',
            disabled ? 'bg-gray-50 dark:bg-gray-900 cursor-not-allowed opacity-50' : 'bg-white'
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {isOpen && (() => {
        const popup = (
          <div
            ref={popupRef}
            style={popupStyle as any}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4"
          >
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMode('hour')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    mode === 'hour'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {selectedHour.toString().padStart(2, '0')}
                </button>
                <span className="text-gray-400">:</span>
                <button
                  type="button"
                  onClick={() => setMode('minute')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    mode === 'minute'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {selectedMinute.toString().padStart(2, '0')}
                </button>
              </div>

              <div className="flex justify-center">
                <div className="relative" style={{ width: clockRadius * 2, height: clockRadius * 2 }}>
                  <svg width={clockRadius * 2} height={clockRadius * 2} className="absolute inset-0">
                    <circle cx={clockRadius} cy={clockRadius} r={clockRadius - 2} fill="transparent" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-gray-700" />
                    {mode === 'hour' && (
                      <line x1={clockRadius} y1={clockRadius} x2={clockRadius + (selectedHour >= 12 ? innerRadius : outerRadius) * Math.cos(((selectedHour % 12) * 30 - 90) * Math.PI / 180)} y2={clockRadius + (selectedHour >= 12 ? innerRadius : outerRadius) * Math.sin(((selectedHour % 12) * 30 - 90) * Math.PI / 180)} stroke="currentColor" strokeWidth="2" className="text-blue-500" />
                    )}
                    {mode === 'minute' && (
                      <line x1={clockRadius} y1={clockRadius} x2={clockRadius + outerRadius * Math.cos((selectedMinute * 6 - 90) * Math.PI / 180)} y2={clockRadius + outerRadius * Math.sin((selectedMinute * 6 - 90) * Math.PI / 180)} stroke="currentColor" strokeWidth="2" className="text-blue-500" />
                    )}
                    <circle cx={clockRadius} cy={clockRadius} r="4" fill="currentColor" className="text-blue-500" />
                  </svg>

                  {mode === 'hour' && outerHours.map((hour) => {
                    const pos = getClockPosition(hour, 12, outerRadius);
                    return (
                      <button key={hour} type="button" onClick={() => handleHourClick(hour)} className={cn('absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', hour === selectedHour ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300')} style={{ left: pos.x - 16, top: pos.y - 16 }}>{hour === 0 ? '00' : hour}</button>
                    );
                  })}
                  {mode === 'hour' && innerHours.map((hour) => {
                    const pos = getClockPosition(hour % 12, 12, innerRadius);
                    return (
                      <button key={hour} type="button" onClick={() => handleHourClick(hour)} className={cn('absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors', hour === selectedHour ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300')} style={{ left: pos.x - 16, top: pos.y - 16 }}>{hour}</button>
                    );
                  })}
                  {mode === 'minute' && minutesArr.map((minute) => {
                    const pos = getClockPosition(minute / 5, 12, outerRadius);
                    return (
                      <button key={minute} type="button" onClick={() => handleMinuteClick(minute)} className={cn('absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', minute === selectedMinute ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300')} style={{ left: pos.x - 16, top: pos.y - 16 }}>{minute.toString().padStart(2, '0')}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
        return typeof document !== 'undefined' ? createPortal(popup, document.body) : popup;
      })()}

      {error && (
        <div className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default TimePicker;
