import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions) => {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onSpace,
    onTab,
    onShiftTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
  } = options;

  const elementRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, shiftKey } = event;

    let handled = false;

    switch (key) {
      case 'ArrowUp':
        if (onArrowUp) {
          onArrowUp();
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          onArrowDown();
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          onArrowLeft();
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          onArrowRight();
          handled = true;
        }
        break;
      case 'Enter':
        if (onEnter) {
          onEnter();
          handled = true;
        }
        break;
      case 'Escape':
        if (onEscape) {
          onEscape();
          handled = true;
        }
        break;
      case ' ':
        if (onSpace) {
          onSpace();
          handled = true;
        }
        break;
      case 'Tab':
        if (shiftKey && onShiftTab) {
          onShiftTab();
          handled = true;
        } else if (!shiftKey && onTab) {
          onTab();
          handled = true;
        }
        break;
      case 'Home':
        if (onHome) {
          onHome();
          handled = true;
        }
        break;
      case 'End':
        if (onEnd) {
          onEnd();
          handled = true;
        }
        break;
      case 'PageUp':
        if (onPageUp) {
          onPageUp();
          handled = true;
        }
        break;
      case 'PageDown':
        if (onPageDown) {
          onPageDown();
          handled = true;
        }
        break;
    }

    if (handled) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
    }
  }, [
    enabled,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onSpace,
    onTab,
    onShiftTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault,
    stopPropagation,
  ]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return elementRef;
};

// Calendar-specific keyboard navigation hook
export interface CalendarKeyboardNavigationOptions {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateSelect?: (date: Date) => void;
  onEscape?: () => void;
  enabled?: boolean;
  viewMode?: 'month' | 'week' | 'day';
}

export const useCalendarKeyboardNavigation = (options: CalendarKeyboardNavigationOptions) => {
  const {
    currentDate,
    onDateChange,
    onDateSelect,
    onEscape,
    enabled = true,
    viewMode = 'month',
  } = options;

  const navigateDate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        switch (direction) {
          case 'up':
            newDate.setDate(newDate.getDate() - 7);
            break;
          case 'down':
            newDate.setDate(newDate.getDate() + 7);
            break;
          case 'left':
            newDate.setDate(newDate.getDate() - 1);
            break;
          case 'right':
            newDate.setDate(newDate.getDate() + 1);
            break;
        }
        break;
      case 'week':
        switch (direction) {
          case 'up':
            newDate.setHours(newDate.getHours() - 1);
            break;
          case 'down':
            newDate.setHours(newDate.getHours() + 1);
            break;
          case 'left':
            newDate.setDate(newDate.getDate() - 1);
            break;
          case 'right':
            newDate.setDate(newDate.getDate() + 1);
            break;
        }
        break;
      case 'day':
        switch (direction) {
          case 'up':
            newDate.setHours(newDate.getHours() - 1);
            break;
          case 'down':
            newDate.setHours(newDate.getHours() + 1);
            break;
          case 'left':
            newDate.setDate(newDate.getDate() - 1);
            break;
          case 'right':
            newDate.setDate(newDate.getDate() + 1);
            break;
        }
        break;
    }

    onDateChange(newDate);
  }, [currentDate, onDateChange, viewMode]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    onDateChange(newDate);
  }, [currentDate, onDateChange]);

  const navigateToToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  return useKeyboardNavigation({
    onArrowUp: () => navigateDate('up'),
    onArrowDown: () => navigateDate('down'),
    onArrowLeft: () => navigateDate('left'),
    onArrowRight: () => navigateDate('right'),
    onEnter: () => onDateSelect?.(currentDate),
    onEscape,
    onPageUp: () => navigateMonth('prev'),
    onPageDown: () => navigateMonth('next'),
    onHome: navigateToToday,
    enabled,
  });
};

// Appointment list keyboard navigation hook
// Appointment list keyboard navigation hook
export interface AppointmentListKeyboardNavigationOptions<T = unknown> {
  appointments: T[];
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
  onAppointmentSelect?: (appointment: T) => void;
  onAppointmentEdit?: (appointment: T) => void;
  onAppointmentDelete?: (appointment: T) => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export const useAppointmentListKeyboardNavigation = <T = unknown>(options: AppointmentListKeyboardNavigationOptions<T>) => {
  const {
    appointments,
    selectedIndex,
    onSelectionChange,
    onAppointmentSelect,
    onAppointmentEdit,
    onAppointmentDelete,
    onEscape,
    enabled = true,
  } = options;

  const navigateSelection = useCallback((direction: 'up' | 'down') => {
    if (appointments.length === 0) return;

    let newIndex = selectedIndex;
    if (direction === 'up') {
      newIndex = selectedIndex > 0 ? selectedIndex - 1 : appointments.length - 1;
    } else {
      newIndex = selectedIndex < appointments.length - 1 ? selectedIndex + 1 : 0;
    }

    onSelectionChange(newIndex);
  }, [appointments.length, selectedIndex, onSelectionChange]);

  const handleEnter = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < appointments.length) {
      onAppointmentSelect?.(appointments[selectedIndex]);
    }
  }, [selectedIndex, appointments, onAppointmentSelect]);

  // const handleEdit = useCallback(() => {
  //   if (selectedIndex >= 0 && selectedIndex < appointments.length) {
  //     onAppointmentEdit?.(appointments[selectedIndex]);
  //   }
  // }, [selectedIndex, appointments, onAppointmentEdit]);

  // const handleDelete = useCallback(() => {
  //   if (selectedIndex >= 0 && selectedIndex < appointments.length) {
  //     onAppointmentDelete?.(appointments[selectedIndex]);
  //   }
  // }, [selectedIndex, appointments, onAppointmentDelete]);

  return useKeyboardNavigation({
    onArrowUp: () => navigateSelection('up'),
    onArrowDown: () => navigateSelection('down'),
    onEnter: handleEnter,
    onEscape,
    onSpace: handleEnter,
    // E key for edit
    enabled,
  });
};