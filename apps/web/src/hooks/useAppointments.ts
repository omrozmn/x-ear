import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Appointment, 
  AppointmentFilters, 
  AppointmentStats, 
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentSearchResult,
  AvailabilityRequest,
  AvailabilityResponse,
  RescheduleRequest,
  BulkAppointmentOperation,
  BulkOperationResult,
  AppointmentValidation
} from '../types/appointment';
import { appointmentService } from '../services/appointment.service';

export interface UseAppointmentsOptions {
  filters?: AppointmentFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseAppointmentsReturn {
  // Data
  appointments: Appointment[];
  appointment: Appointment | null;
  stats: AppointmentStats;
  
  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  createAppointment: (data: CreateAppointmentData) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<UpdateAppointmentData>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointment: (id: string) => void;
  refreshAppointments: () => void;
  clearError: () => void;
  
  // Filtering and search
  setFilters: (filters: AppointmentFilters) => void;
  searchAppointments: (query: string, limit?: number) => AppointmentSearchResult;
  
  // Specialized queries
  getAppointmentsByPatient: (patientId: string) => Appointment[];
  getAppointmentsByDate: (date: string) => Appointment[];
  getTodaysAppointments: () => Appointment[];
  getUpcomingAppointments: (days?: number) => Appointment[];
  
  // Availability and scheduling
  checkAvailability: (request: AvailabilityRequest) => Promise<AvailabilityResponse>;
  rescheduleAppointment: (request: RescheduleRequest) => Promise<Appointment>;
  
  // Status operations
  cancelAppointment: (id: string, reason?: string) => Promise<Appointment>;
  completeAppointment: (id: string, notes?: string) => Promise<Appointment>;
  markNoShow: (id: string) => Promise<Appointment>;
  
  // Bulk operations
  bulkOperation: (operation: BulkAppointmentOperation) => Promise<BulkOperationResult>;
  
  // Validation
  validateAppointment: (appointment: Appointment) => AppointmentValidation;
}

export function useAppointments(options: UseAppointmentsOptions = {}): UseAppointmentsReturn {
  const { filters, autoRefresh = false, refreshInterval = 120000 } = options; // 2 minutes instead of 30 seconds
  
  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [currentFilters, setCurrentFilters] = useState<AppointmentFilters>(filters || {});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load appointments
  const loadAppointments = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const filteredAppointments = appointmentService.getAppointments(currentFilters);
      setAppointments(filteredAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  // Subscribe to appointment changes
  useEffect(() => {
    const unsubscribe = appointmentService.subscribe(() => {
      loadAppointments();
    });

    // Initial load
    loadAppointments();

    return unsubscribe;
  }, [loadAppointments]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAppointments();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadAppointments]);

  // Actions
  const createAppointment = useCallback(async (data: CreateAppointmentData): Promise<Appointment> => {
    try {
      setCreating(true);
      setError(null);
      const newAppointment = await appointmentService.createAppointment(data);
      return newAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setCreating(false);
    }
  }, []);

  const updateAppointment = useCallback(async (id: string, data: Partial<UpdateAppointmentData>): Promise<Appointment> => {
    try {
      setUpdating(true);
      setError(null);
      const updatedAppointment = await appointmentService.updateAppointment(id, data);
      return updatedAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    try {
      setDeleting(true);
      setError(null);
      await appointmentService.deleteAppointment(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }, []);

  const getAppointment = useCallback((id: string) => {
    try {
      const foundAppointment = appointmentService.getAppointment(id);
      setAppointment(foundAppointment || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get appointment');
    }
  }, []);

  const refreshAppointments = useCallback(() => {
    loadAppointments();
  }, [loadAppointments]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setFilters = useCallback((newFilters: AppointmentFilters) => {
    setCurrentFilters(newFilters);
  }, []);

  const searchAppointments = useCallback((query: string, limit?: number): AppointmentSearchResult => {
    return appointmentService.searchAppointments(query, limit);
  }, []);

  // Specialized queries
  const getAppointmentsByPatient = useCallback((patientId: string): Appointment[] => {
    return appointmentService.getAppointmentsByPatient(patientId);
  }, []);

  const getAppointmentsByDate = useCallback((date: string): Appointment[] => {
    return appointmentService.getAppointmentsByDate(date);
  }, []);

  const getTodaysAppointments = useCallback((): Appointment[] => {
    return appointmentService.getTodaysAppointments();
  }, []);

  const getUpcomingAppointments = useCallback((days?: number): Appointment[] => {
    return appointmentService.getUpcomingAppointments(days);
  }, []);

  // Availability and scheduling
  const checkAvailability = useCallback(async (request: AvailabilityRequest): Promise<AvailabilityResponse> => {
    try {
      setError(null);
      return await appointmentService.checkAvailability(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check availability';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const rescheduleAppointment = useCallback(async (request: RescheduleRequest): Promise<Appointment> => {
    try {
      setUpdating(true);
      setError(null);
      const rescheduledAppointment = await appointmentService.rescheduleAppointment(request);
      return rescheduledAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reschedule appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  // Status operations
  const cancelAppointment = useCallback(async (id: string, reason?: string): Promise<Appointment> => {
    try {
      setUpdating(true);
      setError(null);
      const cancelledAppointment = await appointmentService.cancelAppointment(id, reason);
      return cancelledAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  const completeAppointment = useCallback(async (id: string, notes?: string): Promise<Appointment> => {
    try {
      setUpdating(true);
      setError(null);
      const completedAppointment = await appointmentService.completeAppointment(id, notes);
      return completedAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete appointment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  const markNoShow = useCallback(async (id: string): Promise<Appointment> => {
    try {
      setUpdating(true);
      setError(null);
      const noShowAppointment = await appointmentService.markNoShow(id);
      return noShowAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark no-show';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  // Bulk operations
  const bulkOperation = useCallback(async (operation: BulkAppointmentOperation): Promise<BulkOperationResult> => {
    try {
      setUpdating(true);
      setError(null);
      const result = await appointmentService.bulkOperation(operation);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform bulk operation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  // Validation
  const validateAppointment = useCallback((appointment: Appointment): AppointmentValidation => {
    return appointmentService['validateAppointment'](appointment);
  }, []);

  // Computed stats
  const stats = useMemo((): AppointmentStats => {
    return appointmentService.getAppointmentStats(currentFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters]); // appointments is intentionally excluded - stats come from service

  return {
    // Data
    appointments,
    appointment,
    stats,
    
    // Loading states
    loading,
    creating,
    updating,
    deleting,
    
    // Error states
    error,
    
    // Actions
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,
    refreshAppointments,
    clearError,
    
    // Filtering and search
    setFilters,
    searchAppointments,
    
    // Specialized queries
    getAppointmentsByPatient,
    getAppointmentsByDate,
    getTodaysAppointments,
    getUpcomingAppointments,
    
    // Availability and scheduling
    checkAvailability,
    rescheduleAppointment,
    
    // Status operations
    cancelAppointment,
    completeAppointment,
    markNoShow,
    
    // Bulk operations
    bulkOperation,
    
    // Validation
    validateAppointment
  };
}

// Specialized hooks for common use cases
export function useAppointmentsByPatient(patientId: string) {
  return useAppointments({ 
    filters: { patientId },
    autoRefresh: false // Disable auto-refresh for patient-specific appointments
  });
}

export function useTodaysAppointments() {
  const today = new Date().toISOString().split('T')[0];
  return useAppointments({ 
    filters: { startDate: today, endDate: today },
    autoRefresh: true,
    refreshInterval: 300000 // Refresh every 5 minutes instead of 1 minute
  });
}

export function useUpcomingAppointments(days: number = 7) {
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return useAppointments({ 
    filters: { 
      startDate: today, 
      endDate: endDate.toISOString().split('T')[0],
      status: 'scheduled'
    },
    autoRefresh: false // Disable auto-refresh for upcoming appointments
  });
}

export function useAppointmentStats(filters?: AppointmentFilters) {
  const { stats } = useAppointments({ filters });
  return stats;
}