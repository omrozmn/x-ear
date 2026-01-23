/**
 * Drag and Drop Utility functions and constants for Appointments
 */

import { Appointment } from '../../types/appointment';

export interface DragData {
    type: 'appointment';
    appointment: Appointment;
}

export interface DropData {
    type: 'time-slot' | 'day' | 'appointment-area';
    date: Date;
    time?: string;
    index?: number;
}

// Helper function to create drag data for appointments
export function createAppointmentDragData(appointment: Appointment): DragData {
    return {
        type: 'appointment',
        appointment,
    };
}

// Helper function to create drop data for time slots
export function createTimeSlotDropData(date: Date, time: string): DropData {
    return {
        type: 'time-slot',
        date,
        time,
    };
}

// Helper function to create drop data for days
export function createDayDropData(date: Date): DropData {
    return {
        type: 'day',
        date,
    };
}

// Helper function to create drop data for appointment areas
export function createAppointmentAreaDropData(date: Date, index: number): DropData {
    return {
        type: 'appointment-area',
        date,
        index,
    };
}

// CSS classes for drag and drop states
export const dragDropStyles = {
    draggable: 'cursor-grab active:cursor-grabbing transition-transform hover:scale-105',
    dragging: 'opacity-50 transform scale-95',
    dropZone: 'transition-colors duration-200',
    dropZoneActive: 'bg-blue-50 border-blue-200 border-dashed',
    dropZoneValid: 'bg-green-50 border-green-200',
    dropZoneInvalid: 'bg-red-50 border-red-200',
};
