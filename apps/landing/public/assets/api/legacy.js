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
exports.legacyGetAdminPlans = legacyGetAdminPlans;
exports.legacyGetAdminFeatures = legacyGetAdminFeatures;
exports.legacyUpdateAdminFeatures = legacyUpdateAdminFeatures;
exports.legacyGetPermissions = legacyGetPermissions;
exports.legacyCreatePermission = legacyCreatePermission;
exports.legacyGetRoles = legacyGetRoles;
exports.legacyRemoveRolePermission = legacyRemoveRolePermission;
exports.legacyCreateRole = legacyCreateRole;
exports.legacyGetAuditLog = legacyGetAuditLog;
exports.legacyCreateApp = legacyCreateApp;
exports.legacyGetApps = legacyGetApps;
exports.legacyAssignAppRole = legacyAssignAppRole;
exports.legacySearchUsers = legacySearchUsers;
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

// Legacy Admin API functions
async function legacyGetAdminPlans() {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/admin/plans');
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.plans || data,
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

async function legacyGetAdminFeatures() {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/admin/features');
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.features || data,
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

async function legacyUpdateAdminFeatures(features) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/admin/features');
        const data = await legacyFetch(url, {
            method: 'PATCH',
            body: JSON.stringify({ features })
        });
        return {
            success: true,
            data: data.features || data,
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

async function legacyGetPermissions() {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/permissions');
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.permissions || data,
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

async function legacyCreatePermission(permission) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/permissions');
        const data = await legacyFetch(url, {
            method: 'POST',
            body: JSON.stringify(permission)
        });
        return {
            success: true,
            data: data.permission || data,
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

async function legacyGetRoles() {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/roles');
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.roles || data,
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

async function legacyRemoveRolePermission(roleId, permId) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/roles/${roleId}/permissions/${permId}`);
        const data = await legacyFetch(url, {
            method: 'DELETE'
        });
        return {
            success: true,
            data: data,
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

async function legacyCreateRole(role) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/roles');
        const data = await legacyFetch(url, {
            method: 'POST',
            body: JSON.stringify(role)
        });
        return {
            success: true,
            data: data.role || data,
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

async function legacyGetAuditLog(params = {}) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/audit', params);
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.auditLog || data,
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

async function legacyCreateApp(data) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/apps');
        const result = await legacyFetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return {
            success: true,
            data: result.app || result,
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

async function legacyGetApps() {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/apps');
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.apps || data,
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

async function legacyAssignAppRole(appId, data) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, `/api/apps/${appId}/assign`);
        const result = await legacyFetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return {
            success: true,
            data: result,
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

async function legacySearchUsers(params) {
    try {
        const url = (0, utils_1.buildUrl)(config.baseUrl, '/api/users', params);
        const data = await legacyFetch(url);
        return {
            success: true,
            data: data.users || data,
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
        
        // Generate idempotency key for patient creation
        const idempotencyKey = 'patient_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const data = await legacyFetch(url, {
            method: 'POST',
            body: JSON.stringify(patient),
            headers: {
                'Idempotency-Key': idempotencyKey
            }
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
