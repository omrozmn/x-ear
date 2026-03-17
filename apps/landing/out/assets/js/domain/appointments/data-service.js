// Complete Appointments Data Service - Migrated from appointments-data.js
// This file replaces /public/assets/appointments-data.js functionality
// Sample appointments data migrated from legacy
export const initialAppointmentsData = [
    {
        id: 'apt_1',
        patientId: 'p1',
        title: 'Kontrol Muayenesi',
        startTime: '2024-02-01T10:00:00Z',
        endTime: '2024-02-01T11:00:00Z',
        date: '2024-02-01',
        time: '10:00',
        status: 'SCHEDULED',
        type: 'follow_up',
        clinician: 'Dr. Ahmet Yılmaz',
        location: 'Kadıköy Şubesi',
        notes: 'Cihaz adaptasyonu kontrolü',
        reminderSent: false,
        createdBy: 'Dr. Ahmet Yılmaz',
        createdAt: '2024-01-25T14:30:00Z',
        updatedAt: '2024-01-25T14:30:00Z'
    },
    {
        id: 'apt_2',
        patientId: 'p2',
        title: 'İlk Değerlendirme',
        startTime: '2024-02-02T14:00:00Z',
        endTime: '2024-02-02T15:00:00Z',
        date: '2024-02-02',
        time: '14:00',
        status: 'SCHEDULED',
        type: 'consultation',
        clinician: 'Dr. Fatma Aksoy',
        location: 'Beşiktaş Şubesi',
        notes: 'İşitme testi ve cihaz önerisi',
        reminderSent: true,
        createdBy: 'Dr. Fatma Aksoy',
        createdAt: '2024-01-22T09:15:00Z',
        updatedAt: '2024-01-28T16:00:00Z'
    },
    {
        id: 'apt_3',
        patientId: 'p3',
        title: 'Cihaz Teslimi',
        startTime: '2024-01-18T11:00:00Z',
        endTime: '2024-01-18T12:00:00Z',
        date: '2024-01-18',
        time: '11:00',
        status: 'completed',
        type: 'delivery',
        clinician: 'Dr. Can Özdemir',
        location: 'Şişli Şubesi',
        notes: 'Bilateral işitme cihazı teslimi tamamlandı',
        reminderSent: true,
        createdBy: 'Dr. Can Özdemir',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-18T12:00:00Z'
    },
    {
        id: 'apt_4',
        patientId: 'p1',
        title: 'Deneme Başlangıç',
        startTime: '2024-01-20T10:00:00Z',
        endTime: '2024-01-20T11:30:00Z',
        date: '2024-01-20',
        time: '10:00',
        status: 'completed',
        type: 'trial',
        clinician: 'Dr. Ahmet Yılmaz',
        location: 'Kadıköy Şubesi',
        notes: 'Deneme cihazı başlatıldı, adaptasyon süreci başladı',
        reminderSent: true,
        createdBy: 'Dr. Ahmet Yılmaz',
        createdAt: '2024-01-18T15:00:00Z',
        updatedAt: '2024-01-20T11:30:00Z'
    }
];
// Appointments service class
export class AppointmentsDataService {
    constructor() {
        this.appointmentsStorageKey = 'xear_crm_appointments';
        this.calendarStorageKey = window.STORAGE_KEYS?.CRM_CALENDAR_APPOINTMENTS || 'xear_crm_calendar_appointments'; // Legacy compatibility
    }
    // Initialize with legacy data if needed
    initialize() {
        const existing = this.getAll();
        if (existing.length === 0) {
            localStorage.setItem(this.appointmentsStorageKey, JSON.stringify(initialAppointmentsData));
            console.log(`✅ Initialized appointments storage with ${initialAppointmentsData.length} appointments`);
        }
        // Also initialize calendar appointments for legacy compatibility
        const calendarAppointments = this.getCalendarAppointments();
        if (calendarAppointments.length === 0) {
            const calendarData = initialAppointmentsData.map(apt => ({
                id: apt.id,
                patientId: apt.patientId,
                patientName: this.getPatientNameById(apt.patientId),
                title: apt.title,
                start: apt.startTime,
                end: apt.endTime,
                date: apt.date,
                time: apt.time,
                status: apt.status,
                type: apt.type,
                clinician: apt.clinician,
                branch: apt.location,
                notes: apt.notes,
                reminderSent: apt.reminderSent
            }));
            localStorage.setItem(this.calendarStorageKey, JSON.stringify(calendarData));
        }
    }
    // Core CRUD operations
    getAll() {
        try {
            const stored = localStorage.getItem(this.appointmentsStorageKey);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    }
    getById(id) {
        const appointments = this.getAll();
        return appointments.find(a => a.id === id) || null;
    }
    getByPatient(patientId) {
        const appointments = this.getAll();
        return appointments.filter(a => a.patientId === patientId);
    }
    getByDate(date) {
        const appointments = this.getAll();
        return appointments.filter(a => a.date === date || a.startTime?.startsWith(date));
    }
    getByStatus(status) {
        const appointments = this.getAll();
        return appointments.filter(a => a.status === status);
    }
    getByDateRange(startDate, endDate) {
        const appointments = this.getAll();
        return appointments.filter(a => {
            const appointmentDate = a.date || a.startTime?.split('T')[0];
            return appointmentDate && appointmentDate >= startDate && appointmentDate <= endDate;
        });
    }
    save(appointment) {
        try {
            const appointments = this.getAll();
            const existingIndex = appointments.findIndex(a => a.id === appointment.id);
            appointment.updatedAt = new Date().toISOString();
            if (existingIndex >= 0) {
                appointments[existingIndex] = appointment;
            }
            else {
                appointments.push(appointment);
            }
            localStorage.setItem(this.appointmentsStorageKey, JSON.stringify(appointments));
            // Also update calendar appointments for legacy compatibility
            this.updateCalendarAppointment(appointment);
            return { success: true, data: appointment };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Save failed' };
        }
    }
    delete(id) {
        try {
            const appointments = this.getAll();
            const filteredAppointments = appointments.filter(a => a.id !== id);
            localStorage.setItem(this.appointmentsStorageKey, JSON.stringify(filteredAppointments));
            // Also remove from calendar appointments
            const calendarAppointments = this.getCalendarAppointments();
            const filteredCalendarAppointments = calendarAppointments.filter(a => a.id !== id);
            localStorage.setItem(this.calendarStorageKey, JSON.stringify(filteredCalendarAppointments));
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
        }
    }
    // Legacy calendar compatibility
    getCalendarAppointments() {
        try {
            const stored = localStorage.getItem(this.calendarStorageKey);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    }
    updateCalendarAppointment(appointment) {
        try {
            const calendarAppointments = this.getCalendarAppointments();
            const existingIndex = calendarAppointments.findIndex(a => a.id === appointment.id);
            const calendarData = {
                id: appointment.id,
                patientId: appointment.patientId,
                patientName: this.getPatientNameById(appointment.patientId),
                title: appointment.title,
                start: appointment.startTime,
                end: appointment.endTime,
                date: appointment.date,
                time: appointment.time,
                status: appointment.status,
                type: appointment.type,
                clinician: appointment.clinician,
                branch: appointment.location,
                notes: appointment.notes,
                reminderSent: appointment.reminderSent
            };
            if (existingIndex >= 0) {
                calendarAppointments[existingIndex] = calendarData;
            }
            else {
                calendarAppointments.push(calendarData);
            }
            localStorage.setItem(this.calendarStorageKey, JSON.stringify(calendarAppointments));
        }
        catch (error) {
            console.error('Failed to update calendar appointment:', error);
        }
    }
    // Utility functions
    getPatientNameById(patientId) {
        try {
            const patients = JSON.parse(localStorage.getItem('xear_crm_patients') || '[]');
            const patient = patients.find((p) => p.id === patientId);
            return patient ? `${patient.firstName} ${patient.lastName}` : 'Bilinmeyen Hasta';
        }
        catch {
            return 'Bilinmeyen Hasta';
        }
    }
    // Search and filter
    search(query) {
        const appointments = this.getAll();
        const searchTerm = query.toLowerCase();
        return appointments.filter(a => (a.title && a.title.toLowerCase().includes(searchTerm)) ||
            (a.notes && a.notes.toLowerCase().includes(searchTerm)) ||
            (a.clinician && a.clinician.toLowerCase().includes(searchTerm)) ||
            (a.location && a.location.toLowerCase().includes(searchTerm)) ||
            this.getPatientNameById(a.patientId).toLowerCase().includes(searchTerm));
    }
    // Statistics
    getStatistics(startDate, endDate) {
        let appointments = this.getAll();
        if (startDate && endDate) {
            appointments = this.getByDateRange(startDate, endDate);
        }
        const stats = {
            total: appointments.length,
            scheduled: 0,
            completed: 0,
            cancelled: 0,
            no_show: 0,
            byType: {},
            byClinician: {}
        };
        appointments.forEach(apt => {
            // Count by status - handle both uppercase and lowercase
            const normalizedStatus = apt.status?.toLowerCase();
            if (normalizedStatus === 'scheduled')
                stats.scheduled++;
            else if (normalizedStatus === 'completed')
                stats.completed++;
            else if (normalizedStatus === 'cancelled')
                stats.cancelled++;
            else if (apt.status === 'no_show')
                stats.no_show++;
            // Count by type
            if (apt.type) {
                stats.byType[apt.type] = (stats.byType[apt.type] || 0) + 1;
            }
            // Count by clinician
            if (apt.clinician) {
                stats.byClinician[apt.clinician] = (stats.byClinician[apt.clinician] || 0) + 1;
            }
        });
        return stats;
    }
}
// Singleton instance
export const appointmentsDataService = new AppointmentsDataService();
// Legacy compatibility
window.appointmentsData = {
    appointments: initialAppointmentsData,
    initialized: true
};
window.AppointmentsDataService = AppointmentsDataService;
window.appointmentsDataService = appointmentsDataService;
// Legacy function compatibility
window.loadAppointmentsData = () => appointmentsDataService.getAll();
window.saveAppointment = (appointment) => {
    appointmentsDataService.save(appointment);
};
window.getPatientNameById = (patientId) => appointmentsDataService.getPatientNameById(patientId);
// Initialize on load
appointmentsDataService.initialize();
console.log('✅ Appointments Data Service loaded with full legacy compatibility');
