/**
 * Generated API Client - Placeholder Implementation
 * This file serves as a placeholder until the actual client generation is resolved.
 */
export interface ApiResponse<T = any> {
    data: T;
    success: boolean;
    message?: string;
    error?: string;
}
export interface Patient {
    id?: string;
    tcNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    birthDate?: string;
    gender?: 'M' | 'F';
    addressCity?: string;
    addressDistrict?: string;
    addressFull?: string;
    status?: 'active' | 'inactive';
    sgkInfo?: Record<string, any>;
    customData?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}
export interface Appointment {
    id?: string;
    patientId: string;
    date: string;
    time: string;
    duration?: number;
    appointmentType?: string;
    status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface Device {
    id?: string;
    patientId?: string;
    serialNumber: string;
    brand: string;
    model: string;
    deviceType?: string;
    category?: string;
    ear?: 'left' | 'right' | 'both';
    status?: 'available' | 'assigned' | 'maintenance' | 'retired';
    price?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface HearingTest {
    id?: string;
    patientId: string;
    testDate: string;
    testType?: string;
    results?: Record<string, any>;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface PatientNote {
    id?: string;
    patientId: string;
    content: string;
    noteType?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface Configuration {
    basePath?: string;
    apiKey?: string;
    accessToken?: string;
    headers?: Record<string, string>;
}
export declare class PatientApi {
    private configuration?;
    constructor(configuration?: Configuration | undefined);
    getPatients(params?: any): Promise<ApiResponse<Patient[]>>;
    getPatient(id: string): Promise<ApiResponse<Patient>>;
    createPatient(patient: Omit<Patient, 'id'>): Promise<ApiResponse<Patient>>;
    updatePatient(id: string, patient: Partial<Patient>): Promise<ApiResponse<Patient>>;
    deletePatient(id: string): Promise<ApiResponse<void>>;
}
export declare class AppointmentApi {
    private configuration?;
    constructor(configuration?: Configuration | undefined);
    getAppointments(params?: any): Promise<ApiResponse<Appointment[]>>;
    getAppointment(id: string): Promise<ApiResponse<Appointment>>;
    createAppointment(appointment: Omit<Appointment, 'id'>): Promise<ApiResponse<Appointment>>;
    updateAppointment(id: string, appointment: Partial<Appointment>): Promise<ApiResponse<Appointment>>;
    deleteAppointment(id: string): Promise<ApiResponse<void>>;
}
export declare class DeviceApi {
    private configuration?;
    constructor(configuration?: Configuration | undefined);
    getDevices(params?: any): Promise<ApiResponse<Device[]>>;
    getDevice(id: string): Promise<ApiResponse<Device>>;
    createDevice(device: Omit<Device, 'id'>): Promise<ApiResponse<Device>>;
    updateDevice(id: string, device: Partial<Device>): Promise<ApiResponse<Device>>;
    deleteDevice(id: string): Promise<ApiResponse<void>>;
}
export declare class HearingTestApi {
    private configuration?;
    constructor(configuration?: Configuration | undefined);
    getHearingTests(params?: any): Promise<ApiResponse<HearingTest[]>>;
    getHearingTest(id: string): Promise<ApiResponse<HearingTest>>;
    createHearingTest(test: Omit<HearingTest, 'id'>): Promise<ApiResponse<HearingTest>>;
    updateHearingTest(id: string, test: Partial<HearingTest>): Promise<ApiResponse<HearingTest>>;
    deleteHearingTest(id: string): Promise<ApiResponse<void>>;
}
export declare class PatientNoteApi {
    private configuration?;
    constructor(configuration?: Configuration | undefined);
    getPatientNotes(patientId: string): Promise<ApiResponse<PatientNote[]>>;
    getPatientNote(id: string): Promise<ApiResponse<PatientNote>>;
    createPatientNote(note: Omit<PatientNote, 'id'>): Promise<ApiResponse<PatientNote>>;
    updatePatientNote(id: string, note: Partial<PatientNote>): Promise<ApiResponse<PatientNote>>;
    deletePatientNote(id: string): Promise<ApiResponse<void>>;
}
declare const _default: {
    PatientApi: typeof PatientApi;
    AppointmentApi: typeof AppointmentApi;
    DeviceApi: typeof DeviceApi;
    HearingTestApi: typeof HearingTestApi;
    PatientNoteApi: typeof PatientNoteApi;
};
export default _default;
