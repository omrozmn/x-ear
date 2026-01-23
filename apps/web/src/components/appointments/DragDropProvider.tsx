import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Appointment } from '../../types/appointment';
import { AppointmentCard } from './AppointmentCard';
import { DragData, DropData } from './DragDropUtils';

interface DragDropProviderProps {
  children: React.ReactNode;
  onAppointmentMove: (appointmentId: string, newDate: Date, newTime: string) => Promise<void>;
  onAppointmentReorder?: (appointmentId: string, newIndex: number) => Promise<void>;
}



export function DragDropProvider({
  children,
  onAppointmentMove,
  onAppointmentReorder,
}: DragDropProviderProps) {
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance to start dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current as DragData;

    if (dragData?.type === 'appointment') {
      setActiveAppointment(dragData.appointment);
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over logic if needed for visual feedback
    const { over } = event;

    if (over) {
      const dropData = over.data.current as DropData;
      // Add visual feedback for valid drop zones
      if (dropData?.type === 'time-slot' || dropData?.type === 'day') {
        // Could add hover effects here
      }
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveAppointment(null);
    setIsDragging(false);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropData;

    if (!dragData || !dropData) return;

    try {
      if (dragData.type === 'appointment') {
        const appointment = dragData.appointment;

        if (dropData.type === 'time-slot' && dropData.time) {
          // Move appointment to specific time slot
          await onAppointmentMove(appointment.id, dropData.date, dropData.time);
        } else if (dropData.type === 'day') {
          // Move appointment to day (keep original time or use default)
          const originalTime = appointment.time || '09:00';
          await onAppointmentMove(appointment.id, dropData.date, originalTime);
        } else if (dropData.type === 'appointment-area' && onAppointmentReorder && dropData.index !== undefined) {
          // Reorder appointments within the same time slot/day
          await onAppointmentReorder(appointment.id, dropData.index);
        }
      }
    } catch (error) {
      console.error('Failed to move appointment:', error);
      // Could show error toast here
    }
  }, [onAppointmentMove, onAppointmentReorder]);

  const handleDragCancel = useCallback(() => {
    setActiveAppointment(null);
    setIsDragging(false);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={isDragging ? 'dragging' : ''}>
        {children}
      </div>

      <DragOverlay>
        {activeAppointment && (
          <div className="opacity-90 transform rotate-3 shadow-lg">
            <AppointmentCard
              appointment={activeAppointment}
              isDragging={true}
              onClick={() => { }}
              onEdit={() => { }}
              onDelete={() => { }}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
