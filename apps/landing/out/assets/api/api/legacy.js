"use strict";
// Legacy API Client Functions
// These functions maintain the existing fetch-based implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyGetPatients = legacyGetPatients;
exports.legacyGetPatient = legacyGetPatient;
exports.legacyCreatePatient = legacyCreatePatient;
exports.legacyUpdatePatient = legacyUpdatePatient;
exports.legacyDeletePatient = legacyDeletePatient;
exports.legacyGetAppointments = legacyGetAppointments;
exports.legacyGetHearingTests = legacyGetHearingTests;
exports.legacyGetPatientNotes = legacyGetPatientNotes;
exports.legacyCreatePatientNote = legacyCreatePatientNote;
exports.legacyUpdatePatientNote = legacyUpdatePatientNote;
exports.legacyDeletePatientNote = legacyDeletePatientNote;
exports.legacyGetDevices = legacyGetDevices;
const config_1 = require("./config");
const utils_1 = require("./utils");
const config = (0, config_1.getApiConfig)();
// Legacy fetch wrapper with error handling
async function legacyFetch(url, options = {}) {
    const headers = (0, utils_1.buildHeaders)(options.headers);
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });
    if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
    }
    return response.json();
}
// Legacy Patient API functions
async function legacyGetPatients(params) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/patients', params);
        const data = await legacyFetch(url);
        // Handle different response formats from backend
        let patients = [];
        if (Array.isArray(data)) {
            patients = data;
        }
        else if (data.patients && Array.isArray(data.patients)) {
            patients = data.patients;
        }
        else if (data.data && Array.isArray(data.data)) {
            patients = data.data;
        }
        return {
            success: true,
            data: patients,
            meta: data.meta,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
async function legacyGetPatient(id) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/patients/${id}`);
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.patient || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
async function legacyCreatePatient(patient) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/patients');
        const data = await legacyFetch(url, {
            method: 'POST',
            body: JSON.stringify(patient)
        });
        return {
            success: true,
            data: data.patient || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
async function legacyUpdatePatient(id, patient) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/patients/${id}`);
        const data = await legacyFetch(url, {
            method: 'PUT',
            body: JSON.stringify(patient)
        });
        return {
            success: true,
            data: data.patient || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
async function legacyDeletePatient(id) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/patients/${id}`);
        await legacyFetch(url, { method: 'DELETE' });
        return {
            success: true,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
// Legacy Appointments API
async function legacyGetAppointments(params) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/appointments', params);
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.appointments || data,
            meta: data.meta,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
// Legacy Hearing Tests API
async function legacyGetHearingTests(patientId) {
    try {
        const endpoint = patientId ? `/api/patients/${patientId}/hearing-tests` : '/api/hearing-tests';
        const url = (0, utils_1.buildUrl)(config.baseUrl, endpoint);
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.hearingTests || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
// Legacy Patient Notes API
async function legacyGetPatientNotes(patientId) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/patients/${patientId}/notes`);
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.notes || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
async function legacyCreatePatientNote(patientId, note) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/patients/${patientId}/notes`);
        const data = await legacyFetch(url, {
            method: 'POST',
            body: JSON.stringify(note)
        });
        return {
            success: true,
            data: data.note || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
async function legacyUpdatePatientNote(patientId, noteId, note) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/patients/${patientId}/notes/${noteId}`);
        const data = await legacyFetch(url, {
            method: 'PUT',
            body: JSON.stringify(note)
        });
        return {
            success: true,
            data: data.note || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
async function legacyDeletePatientNote(patientId, noteId) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/patients/${patientId}/notes/${noteId}`);
        await legacyFetch(url, { method: 'DELETE' });
        return {
            success: true,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
// Legacy Devices API
async function legacyGetDevices() {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/devices');
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.devices || data,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            success: false,
            error: (0, utils_1.normalizeError)(error).message,
            timestamp: new Date().toISOString()
        };
    }
}
