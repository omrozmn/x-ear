"use strict";
/**
 * Generated API Client Integration
 * This module provides the interface to the generated TypeScript client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatedClient = void 0;
exports.hasGeneratedClient = hasGeneratedClient;
const index_js_1 = require("../js/generated/index.js");
const config_js_1 = require("./config.js");
// Create configuration for generated client
function createConfiguration() {
    const config = (0, config_js_1.getApiConfig)();
    return {
        basePath: config.baseUrl,
        headers: {
            'Content-Type': 'application/json'
        }
    };
}
// Initialize API clients
const configuration = createConfiguration();
const patientApi = new index_js_1.PatientApi(configuration);
const appointmentApi = new index_js_1.AppointmentApi(configuration);
const deviceApi = new index_js_1.DeviceApi(configuration);
const hearingTestApi = new index_js_1.HearingTestApi(configuration);
const patientNoteApi = new index_js_1.PatientNoteApi(configuration);
// Implementation of the generated client
exports.generatedClient = {
    // Patient operations
    async getPatients(params) {
        try {
            const response = await patientApi.getPatients(params);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getPatients - ${error}`);
        }
    },
    async getPatient(id) {
        try {
            const response = await patientApi.getPatient(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getPatient - ${error}`);
        }
    },
    async createPatient(patient) {
        try {
            const response = await patientApi.createPatient(patient);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: createPatient - ${error}`);
        }
    },
    async updatePatient(id, patient) {
        try {
            const response = await patientApi.updatePatient(id, patient);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: updatePatient - ${error}`);
        }
    },
    async deletePatient(id) {
        try {
            const response = await patientApi.deletePatient(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: deletePatient - ${error}`);
        }
    },
    // Appointment operations
    async getAppointments(params) {
        try {
            const response = await appointmentApi.getAppointments(params);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getAppointments - ${error}`);
        }
    },
    async getAppointment(id) {
        try {
            const response = await appointmentApi.getAppointment(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getAppointment - ${error}`);
        }
    },
    async createAppointment(appointment) {
        try {
            const response = await appointmentApi.createAppointment(appointment);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: createAppointment - ${error}`);
        }
    },
    async updateAppointment(id, appointment) {
        try {
            const response = await appointmentApi.updateAppointment(id, appointment);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: updateAppointment - ${error}`);
        }
    },
    async deleteAppointment(id) {
        try {
            const response = await appointmentApi.deleteAppointment(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: deleteAppointment - ${error}`);
        }
    },
    // Hearing test operations
    async getHearingTests(patientId) {
        try {
            const response = await hearingTestApi.getHearingTests({ patientId });
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getHearingTests - ${error}`);
        }
    },
    async getHearingTest(id) {
        try {
            const response = await hearingTestApi.getHearingTest(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getHearingTest - ${error}`);
        }
    },
    async createHearingTest(test) {
        try {
            const response = await hearingTestApi.createHearingTest(test);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: createHearingTest - ${error}`);
        }
    },
    async updateHearingTest(id, test) {
        try {
            const response = await hearingTestApi.updateHearingTest(id, test);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: updateHearingTest - ${error}`);
        }
    },
    async deleteHearingTest(id) {
        try {
            const response = await hearingTestApi.deleteHearingTest(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: deleteHearingTest - ${error}`);
        }
    },
    // Patient note operations
    async getPatientNotes(patientId) {
        try {
            const response = await patientNoteApi.getPatientNotes(patientId);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getPatientNotes - ${error}`);
        }
    },
    async getPatientNote(id) {
        try {
            const response = await patientNoteApi.getPatientNote(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getPatientNote - ${error}`);
        }
    },
    async createPatientNote(patientId, note) {
        try {
            const response = await patientNoteApi.createPatientNote({ ...note, patientId });
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: createPatientNote - ${error}`);
        }
    },
    async updatePatientNote(patientId, noteId, note) {
        try {
            const response = await patientNoteApi.updatePatientNote(noteId, { ...note, patientId });
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: updatePatientNote - ${error}`);
        }
    },
    async deletePatientNote(patientId, noteId) {
        try {
            const response = await patientNoteApi.deletePatientNote(noteId);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: deletePatientNote - ${error}`);
        }
    },
    // Device operations
    async getDevices(params) {
        try {
            const response = await deviceApi.getDevices(params);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getDevices - ${error}`);
        }
    },
    async getDevice(id) {
        try {
            const response = await deviceApi.getDevice(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: getDevice - ${error}`);
        }
    },
    async createDevice(device) {
        try {
            const response = await deviceApi.createDevice(device);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: createDevice - ${error}`);
        }
    },
    async updateDevice(id, device) {
        try {
            const response = await deviceApi.updateDevice(id, device);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: updateDevice - ${error}`);
        }
    },
    async deleteDevice(id) {
        try {
            const response = await deviceApi.deleteDevice(id);
            return response;
        }
        catch (error) {
            throw new Error(`Generated client not implemented: deleteDevice - ${error}`);
        }
    }
};
// Check if generated client is available
function hasGeneratedClient() {
    return true; // Now using the actual generated client
}
