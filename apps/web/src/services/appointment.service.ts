import {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentFilters,
  AppointmentStats,
  AppointmentType,
  AppointmentSearchResult,
  AvailabilityRequest,
  AvailabilityResponse,
  TimeSlot,
  AppointmentConflict,
  RescheduleRequest,
  BulkAppointmentOperation,
  BulkOperationResult,
  AppointmentValidation
} from '../types/appointment';
import { APPOINTMENTS } from '../constants/storage-keys';
import { outbox } from '../utils/outbox';

class AppointmentService {
  private appointments: Appointment[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadAppointments();
    this.setupStorageListener();
    // If there are no local appointments, try to bootstrap from server
    if (!this.appointments || this.appointments.length === 0) {
      // Fire-and-forget bootstrap; failures should not block app
      this.bootstrapFromServer();
    }
  }

  // Try to load appointments from backend and populate local storage
  private async bootstrapFromServer(): Promise<void> {
    try {
      // Use the generated API client
      const { appointmentsApi } = await import('../api/appointments');
      const items = await appointmentsApi.getAppointments({ limit: '1000' } as any);

      if (!Array.isArray(items) || items.length === 0) return;

      // Try to fetch patient names to enrich appointments (best-effort)
      let patientMap: Record<string, string> = {};
      try {
        const { patientApiService } = await import('./patient/patient-api.service');
        const patients = await patientApiService.fetchAllPatients(1000);
        patientMap = patients.reduce((acc: Record<string, string>, p: any) => {
          if (p && p.id) acc[p.id] = p.name || '';
          return acc;
        }, {});
      } catch (err) {
        console.warn('Could not fetch patients for bootstrap:', err);
      }

      // Map backend shape to local Appointment type
      this.appointments = items.map((d: any) => ({
        id: d.id,
        patientId: d.patient_id || d.patientId,
        patientName: d.patient_name || d.patientName || patientMap[d.patient_id || d.patientId] || '',
        date: d.date,
        time: d.time,
        startTime: d.startTime || (d.date && d.time ? `${d.date}T${d.time}:00.000Z` : ''),
        endTime: d.endTime || (d.date && d.time ? this.calculateEndTime(d.date, d.time, d.duration || 30) : ''),
        duration: d.duration || 30,
        title: d.title || this.generateTitle(d.appointment_type || d.type || 'consultation'),
        type: d.appointment_type || d.type || 'consultation',
        status: (d.status || 'scheduled').toLowerCase(),
        notes: d.notes,
        clinician: d.clinician || undefined,
        clinicianId: d.clinician_id || d.clinicianId || undefined,
        location: d.location || undefined,
        branchId: d.branch_id || d.branchId || undefined,
        reminderSent: d.reminderSent || false,
        createdBy: d.created_by || d.createdBy || undefined,
        createdAt: d.created_at || d.createdAt || new Date().toISOString(),
        updatedAt: d.updated_at || d.updatedAt || new Date().toISOString()
      }));

      this.saveAppointments();
      this.notify();
    } catch (error) {
      console.error('Failed to bootstrap appointments from server:', error);
    }
  }

  // Event handling
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (e) => {
      if (e.key === APPOINTMENTS) {
        this.loadAppointments();
        this.notify();
      }
    });
  }

  // Data persistence
  private loadAppointments(): void {
    try {
      const stored = localStorage.getItem(APPOINTMENTS);
      this.appointments = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load appointments:', error);
      this.appointments = [];
    }
  }

  private saveAppointments(): void {
    try {
      localStorage.setItem(APPOINTMENTS, JSON.stringify(this.appointments));
    } catch (error) {
      console.error('Failed to save appointments:', error);
    }
  }

  // CRUD Operations
  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    console.log('📝 Creating appointment:', data);

    try {
      // Call backend API directly instead of using outbox
      const { appointmentsApi } = await import('../api/appointments');
      const idempotencyKey = `appt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const backendAppointment = await appointmentsApi.createAppointment(data, idempotencyKey);
      console.log('✅ Backend created appointment:', backendAppointment);

      // Also save to localStorage for offline access
      const appointment: Appointment = {
        id: backendAppointment.id,
        patientId: backendAppointment.patientId,
        patientName: backendAppointment.patientName,
        date: backendAppointment.date,
        time: backendAppointment.time,
        startTime: backendAppointment.startTime || `${backendAppointment.date}T${backendAppointment.time}:00.000Z`,
        endTime: backendAppointment.endTime || this.calculateEndTime(backendAppointment.date, backendAppointment.time, backendAppointment.duration),
        duration: backendAppointment.duration || 30,
        title: backendAppointment.title || this.generateTitle(backendAppointment.type),
        type: backendAppointment.type,
        status: backendAppointment.status || 'scheduled',
        notes: backendAppointment.notes,
        clinician: backendAppointment.clinician,
        clinicianId: backendAppointment.clinicianId,
        location: backendAppointment.location,
        branchId: backendAppointment.branchId,
        reminderSent: false,
        createdBy: backendAppointment.createdBy,
        createdAt: backendAppointment.createdAt || new Date().toISOString(),
        updatedAt: backendAppointment.updatedAt || new Date().toISOString()
      };

      this.appointments.push(appointment);
      this.saveAppointments();
      this.notify();

      return appointment;
    } catch (error) {
      console.error('❌ Failed to create appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, data: Partial<UpdateAppointmentData>): Promise<Appointment> {
    const index = this.appointments.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    const updatedAppointment: Appointment = {
      ...this.appointments[index],
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    // Validate updated appointment
    const validation = this.validateAppointment(updatedAppointment);
    if (!validation.isValid) {
      throw new Error(`Appointment validation failed: ${validation.errors.join(', ')}`);
    }

    // Update local storage
    this.appointments[index] = updatedAppointment;
    this.saveAppointments();

    try {
      const { appointmentsApi } = await import('../api/appointments');
      const idempotencyKey = `appt-upd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await appointmentsApi.updateAppointment(id, updatedAppointment, idempotencyKey);
    } catch (error) {
      console.warn('API update failed, falling back to outbox:', error);
      await outbox.addOperation({
        method: 'PUT',
        endpoint: `/api/appointments/${id}`,
        data: updatedAppointment,
        priority: 'normal'
      });
    }

    this.notify();
    return updatedAppointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    const index = this.appointments.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    // Remove from local storage immediately (optimistic UI)
    const deletedAppointment = this.appointments[index];
    this.appointments.splice(index, 1);
    this.saveAppointments();
    this.notify();

    try {
      const { appointmentsApi } = await import('../api/appointments');
      const idempotencyKey = `appt-del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await appointmentsApi.deleteAppointment(id, idempotencyKey);
    } catch (error) {
      console.warn('API delete failed, falling back to outbox:', error);
      // Revert local changes if critical failure? No, we want optimistic UI.
      // But actually, if we use outbox fallback, we should just queue it.

      await outbox.addOperation({
        method: 'DELETE',
        endpoint: `/api/appointments/${id}`,
        priority: 'normal'
      });
    }
  }

  // Query methods
  getAppointment(id: string): Appointment | undefined {
    return this.appointments.find(a => a.id === id);
  }

  getAppointments(filters?: AppointmentFilters): Appointment[] {
    let filtered = [...this.appointments];

    if (filters) {
      if (filters.patientId) {
        filtered = filtered.filter(a => a.patientId === filters.patientId);
      }
      if (filters.status) {
        filtered = filtered.filter(a => a.status === filters.status);
      }
      if (filters.type) {
        filtered = filtered.filter(a => a.type === filters.type);
      }
      if (filters.clinician) {
        filtered = filtered.filter(a => a.clinician?.toLowerCase().includes(filters.clinician!.toLowerCase()));
      }
      if (filters.branchId) {
        filtered = filtered.filter(a => a.branchId === filters.branchId);
      }
      if (filters.startDate) {
        filtered = filtered.filter(a => a.date >= filters.startDate!);
      }
      if (filters.endDate) {
        filtered = filtered.filter(a => a.date <= filters.endDate!);
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(a =>
          a.patientName?.toLowerCase().includes(searchTerm) ||
          a.title?.toLowerCase().includes(searchTerm) ||
          a.notes?.toLowerCase().includes(searchTerm) ||
          a.clinician?.toLowerCase().includes(searchTerm)
        );
      }
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }

  getAppointmentsByPatient(patientId: string): Appointment[] {
    return this.getAppointments({ patientId });
  }

  getAppointmentsByDate(date: string): Appointment[] {
    return this.appointments.filter(a => a.date === date);
  }

  getAppointmentsByDateRange(startDate: string, endDate: string): Appointment[] {
    return this.getAppointments({ startDate, endDate });
  }

  getTodaysAppointments(): Appointment[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getAppointmentsByDate(today);
  }

  getUpcomingAppointments(days: number = 7): Appointment[] {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    return this.getAppointmentsByDateRange(
      today.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ).filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  }

  // Statistics
  getAppointmentStats(filters?: AppointmentFilters): AppointmentStats {
    const appointments = this.getAppointments(filters);

    const stats: AppointmentStats = {
      total: appointments.length,
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      byType: {} as Record<AppointmentType, number>,
      byClinician: {}
    };

    appointments.forEach(appointment => {
      // Count by status
      switch (appointment.status) {
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'confirmed':
          stats.confirmed++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'no_show':
          stats.no_show++;
          break;
      }

      // Count by type
      stats.byType[appointment.type] = (stats.byType[appointment.type] || 0) + 1;

      // Count by clinician
      if (appointment.clinician) {
        stats.byClinician[appointment.clinician] = (stats.byClinician[appointment.clinician] || 0) + 1;
      }
    });

    return stats;
  }

  // Search functionality
  searchAppointments(query: string, limit: number = 50): AppointmentSearchResult {
    const appointments = this.getAppointments({ search: query });

    return {
      appointments: appointments.slice(0, limit),
      total: appointments.length,
      hasMore: appointments.length > limit
    };
  }

  // Availability checking
  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    const { date, duration = 30, clinicianId, branchId } = request;

    // Get appointments for the date
    let dayAppointments = this.getAppointmentsByDate(date);

    // Filter by clinician if specified
    if (clinicianId) {
      dayAppointments = dayAppointments.filter(a => a.clinicianId === clinicianId);
    }

    // Filter by branch if specified
    if (branchId) {
      dayAppointments = dayAppointments.filter(a => a.branchId === branchId);
    }

    // Generate time slots (9 AM to 6 PM, 30-minute intervals)
    const timeSlots: TimeSlot[] = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Check if this slot conflicts with existing appointments
        const hasConflict = dayAppointments.some(appointment => {
          const appointmentStart = this.timeToMinutes(appointment.time);
          const appointmentEnd = appointmentStart + appointment.duration;
          const slotStart = this.timeToMinutes(time);
          const slotEnd = slotStart + duration;

          return (slotStart < appointmentEnd && slotEnd > appointmentStart);
        });

        timeSlots.push({
          time,
          available: !hasConflict,
          appointmentId: hasConflict ? dayAppointments.find(a =>
            this.timeToMinutes(a.time) <= this.timeToMinutes(time) &&
            this.timeToMinutes(a.time) + a.duration > this.timeToMinutes(time)
          )?.id : undefined
        });
      }
    }

    return {
      date,
      timeSlots,
      workingHours: {
        start: '09:00',
        end: '18:00'
      }
    };
  }

  // Appointment operations
  async rescheduleAppointment(request: RescheduleRequest): Promise<Appointment> {
    const { appointmentId, newDate, newTime, reason } = request;

    const appointment = this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error(`Appointment with id ${appointmentId} not found`);
    }

    // Check availability for new time
    const availability = await this.checkAvailability({
      date: newDate,
      duration: appointment.duration,
      clinicianId: appointment.clinicianId,
      branchId: appointment.branchId
    });

    const newTimeSlot = availability.timeSlots.find(slot => slot.time === newTime);
    if (!newTimeSlot?.available) {
      throw new Error('The requested time slot is not available');
    }

    // Update appointment
    return this.updateAppointment(appointmentId, {
      date: newDate,
      time: newTime,
      startTime: `${newDate}T${newTime}:00.000Z`,
      endTime: this.calculateEndTime(newDate, newTime, appointment.duration),
      status: 'rescheduled',
      notes: appointment.notes ? `${appointment.notes}\n\nRescheduled: ${reason || 'No reason provided'}` : `Rescheduled: ${reason || 'No reason provided'}`
    });
  }

  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    return this.updateAppointment(id, {
      status: 'cancelled',
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
    });
  }

  async completeAppointment(id: string, notes?: string): Promise<Appointment> {
    return this.updateAppointment(id, {
      status: 'completed',
      notes: notes || 'Appointment completed'
    });
  }

  async markNoShow(id: string): Promise<Appointment> {
    return this.updateAppointment(id, {
      status: 'no_show',
      notes: 'Patient did not show up'
    });
  }

  // Bulk operations
  async bulkOperation(operation: BulkAppointmentOperation): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const appointmentId of operation.appointmentIds) {
      try {
        switch (operation.operation) {
          case 'cancel':
            await this.cancelAppointment(appointmentId, operation.data?.reason);
            break;
          case 'complete':
            await this.completeAppointment(appointmentId, operation.data?.reason);
            break;
          case 'reschedule':
            if (operation.data?.newDate && operation.data?.newTime) {
              await this.rescheduleAppointment({
                appointmentId,
                newDate: operation.data.newDate,
                newTime: operation.data.newTime,
                reason: operation.data.reason
              });
            }
            break;
          case 'send_reminder':
            // TODO: Implement reminder sending
            break;
        }
        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          appointmentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  // Validation
  private validateAppointment(appointment: Appointment): AppointmentValidation {
    const validation: AppointmentValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      conflicts: []
    };

    // Required fields
    if (!appointment.patientId) {
      validation.errors.push('Patient ID is required');
    }
    if (!appointment.date) {
      validation.errors.push('Date is required');
    }
    if (!appointment.time) {
      validation.errors.push('Time is required');
    }
    if (!appointment.type) {
      validation.errors.push('Appointment type is required');
    }

    // Date validation
    if (appointment.date) {
      const appointmentDate = new Date(appointment.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        validation.warnings.push('Appointment is scheduled in the past');
      }
    }

    // Time validation
    if (appointment.time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(appointment.time)) {
      validation.errors.push('Invalid time format (use HH:MM)');
    }

    // Duration validation
    if (appointment.duration <= 0) {
      validation.errors.push('Duration must be greater than 0');
    }

    // Check for conflicts
    const conflicts = this.findConflicts(appointment);
    validation.conflicts = conflicts;
    if (conflicts.length > 0) {
      validation.warnings.push(`Found ${conflicts.length} potential conflict(s)`);
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  private findConflicts(appointment: Appointment): AppointmentConflict[] {
    const conflicts: AppointmentConflict[] = [];

    // Find overlapping appointments
    const overlapping = this.appointments.filter(existing =>
      existing.id !== appointment.id &&
      existing.date === appointment.date &&
      existing.status !== 'cancelled' &&
      this.timesOverlap(
        existing.time, existing.duration,
        appointment.time, appointment.duration
      )
    );

    overlapping.forEach(existing => {
      conflicts.push({
        appointmentId: appointment.id,
        conflictType: 'time_overlap',
        conflictingAppointmentId: existing.id,
        message: `Time overlaps with appointment ${existing.id}`
      });
    });

    return conflicts;
  }

  // Utility methods
  private calculateEndTime(date: string, time: string, duration: number): string {
    const startDateTime = new Date(`${date}T${time}:00.000Z`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    return endDateTime.toISOString();
  }

  private generateTitle(type: AppointmentType): string {
    const titles: Record<AppointmentType, string> = {
      consultation: 'Konsültasyon',
      'follow-up': 'Kontrol Muayenesi',
      'hearing-test': 'İşitme Testi',
      'device-trial': 'Cihaz Denemesi'
    };
    return titles[type] || 'Randevu';
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private timesOverlap(time1: string, duration1: number, time2: string, duration2: number): boolean {
    const start1 = this.timeToMinutes(time1);
    const end1 = start1 + duration1;
    const start2 = this.timeToMinutes(time2);
    const end2 = start2 + duration2;

    return start1 < end2 && end1 > start2;
  }
}

export const appointmentService = new AppointmentService();