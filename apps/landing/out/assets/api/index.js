"use strict";
// Main API Adapter - Strangler Pattern Implementation
// This serves as the single entry point for all API calls
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMigrationFlags = exports.getMigrationFlags = exports.MIGRATION_PHASES = exports.emergencyRollback = exports.setMigrationPhase = void 0;
exports.getPatients = getPatients;
exports.getPatient = getPatient;
exports.createPatient = createPatient;
exports.updatePatient = updatePatient;
exports.deletePatient = deletePatient;
exports.getAppointments = getAppointments;
exports.getHearingTests = getHearingTests;
exports.getPatientNotes = getPatientNotes;
exports.createPatientNote = createPatientNote;
exports.updatePatientNote = updatePatientNote;
exports.deletePatientNote = deletePatientNote;
exports.getDevices = getDevices;
exports.getAdminPlans = getAdminPlans;
exports.getAdminFeatures = getAdminFeatures;
exports.updateAdminFeatures = updateAdminFeatures;
exports.getPermissions = getPermissions;
exports.createPermission = createPermission;
exports.getRoles = getRoles;
exports.createRole = createRole;
exports.assignRolePermission = assignRolePermission;
exports.removeRolePermission = removeRolePermission;
exports.getAuditLog = getAuditLog;
exports.createApp = createApp;
exports.getApps = getApps;
exports.assignAppRole = assignAppRole;
exports.searchUsers = searchUsers;
exports.getApiStatus = getApiStatus;
exports.enableGeneratedClient = enableGeneratedClient;
exports.enableShadowValidation = enableShadowValidation;
const config_1 = require("./config");
const utils_1 = require("./utils");
const legacy_1 = require("./legacy");
const generated_1 = require("./generated");
const migration_flags_1 = require("./migration-flags");
Object.defineProperty(exports, "getMigrationFlags", { enumerable: true, get: function () { return migration_flags_1.getMigrationFlags; } });
Object.defineProperty(exports, "setMigrationFlags", { enumerable: true, get: function () { return migration_flags_1.setMigrationFlags; } });
Object.defineProperty(exports, "setMigrationPhase", { enumerable: true, get: function () { return migration_flags_1.setMigrationPhase; } });
Object.defineProperty(exports, "emergencyRollback", { enumerable: true, get: function () { return migration_flags_1.emergencyRollback; } });
Object.defineProperty(exports, "MIGRATION_PHASES", { enumerable: true, get: function () { return migration_flags_1.MIGRATION_PHASES; } });
// Get current configuration
const config = (0, config_1.getApiConfig)();

// Patient Operations
async function getPatients(params) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'patients');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getPatients(params);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetPatients)(params);
            (0, utils_1.shadowValidation)('getPatients', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetPatients)(params);
}
async function getPatient(id) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'patients');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getPatient(id);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetPatient)(id);
            (0, utils_1.shadowValidation)('getPatient', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetPatient)(id);
}
async function createPatient(patient) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('POST', 'patients');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.createPatient(patient);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyCreatePatient)(patient);
            (0, utils_1.shadowValidation)('createPatient', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyCreatePatient)(patient);
}
async function updatePatient(id, patient) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('PUT', 'patients');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.updatePatient(id, patient);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyUpdatePatient)(id, patient);
            (0, utils_1.shadowValidation)('updatePatient', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyUpdatePatient)(id, patient);
}
async function deletePatient(id) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('DELETE', 'patients');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.deletePatient(id);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyDeletePatient)(id);
            (0, utils_1.shadowValidation)('deletePatient', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyDeletePatient)(id);
}

// Appointment Operations
async function getAppointments(params) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getAppointments(params);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetAppointments)(params);
            (0, utils_1.shadowValidation)('getAppointments', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetAppointments)(params);
}

// Hearing Tests Operations
async function getHearingTests(patientId) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getHearingTests(patientId);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetHearingTests)(patientId);
            (0, utils_1.shadowValidation)('getHearingTests', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetHearingTests)(patientId);
}

// Patient Notes Operations
async function getPatientNotes(patientId) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getPatientNotes(patientId);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetPatientNotes)(patientId);
            (0, utils_1.shadowValidation)('getPatientNotes', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetPatientNotes)(patientId);
}
async function createPatientNote(patientId, note) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.createPatientNote(patientId, note);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyCreatePatientNote)(patientId, note);
            (0, utils_1.shadowValidation)('createPatientNote', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyCreatePatientNote)(patientId, note);
}
async function updatePatientNote(patientId, noteId, note) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.updatePatientNote(patientId, noteId, note);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyUpdatePatientNote)(patientId, noteId, note);
            (0, utils_1.shadowValidation)('updatePatientNote', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyUpdatePatientNote)(patientId, noteId, note);
}
async function deletePatientNote(patientId, noteId) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.deletePatientNote(patientId, noteId);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyDeletePatientNote)(patientId, noteId);
            (0, utils_1.shadowValidation)('deletePatientNote', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyDeletePatientNote)(patientId, noteId);
}

// Device Operations
async function getDevices() {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getDevices();
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetDevices)();
            (0, utils_1.shadowValidation)('getDevices', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetDevices)();
}

// Admin Operations
async function getAdminPlans() {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'admin/plans');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getAdminPlans();
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetAdminPlans)();
            (0, utils_1.shadowValidation)('getAdminPlans', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetAdminPlans)();
}

async function getAdminFeatures() {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'admin/features');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getAdminFeatures();
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetAdminFeatures)();
            (0, utils_1.shadowValidation)('getAdminFeatures', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetAdminFeatures)();
}

async function updateAdminFeatures(data) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('PATCH', 'admin/features');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.updateAdminFeatures(data);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyUpdateAdminFeatures)(data);
            (0, utils_1.shadowValidation)('updateAdminFeatures', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyUpdateAdminFeatures)(data);
}

async function getPermissions() {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'permissions');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getPermissions();
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetPermissions)();
            (0, utils_1.shadowValidation)('getPermissions', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetPermissions)();
}

async function createPermission(data) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('POST', 'permissions');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.createPermission(data);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyCreatePermission)(data);
            (0, utils_1.shadowValidation)('createPermission', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyCreatePermission)(data);
}

async function getRoles() {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'roles');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getRoles();
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetRoles)();
            (0, utils_1.shadowValidation)('getRoles', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetRoles)();
}

async function createRole(data) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('POST', 'roles');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.createRole(data);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyCreateRole)(data);
            (0, utils_1.shadowValidation)('createRole', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyCreateRole)(data);
}

async function assignRolePermission(roleId, data) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('POST', 'roles');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.assignRolePermission(roleId, data);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyAssignRolePermission)(roleId, data);
            (0, utils_1.shadowValidation)('assignRolePermission', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyAssignRolePermission)(roleId, data);
}

async function removeRolePermission(roleId, permissionId) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('DELETE', 'roles');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.removeRolePermission(roleId, permissionId);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyRemoveRolePermission)(roleId, permissionId);
            (0, utils_1.shadowValidation)('removeRolePermission', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyRemoveRolePermission)(roleId, permissionId);
}

async function getAuditLog(params = {}) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'audit');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getAuditLog(params);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetAuditLog)(params);
            (0, utils_1.shadowValidation)('getAuditLog', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetAuditLog)(params);
}

// App Operations
async function createApp(data) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('POST', 'apps');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.createApp(data);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyCreateApp)(data);
            (0, utils_1.shadowValidation)('createApp', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyCreateApp)(data);
}

async function getApps() {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'apps');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getApps();
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetApps)();
            (0, utils_1.shadowValidation)('getApps', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetApps)();
}

async function assignAppRole(appId, data) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('POST', 'apps');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.assignAppRole(appId, data);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyAssignAppRole)(appId, data);
            (0, utils_1.shadowValidation)('assignAppRole', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyAssignAppRole)(appId, data);
}

async function searchUsers(params) {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    const useGenerated = (0, migration_flags_1.shouldUseGeneratedClient)('GET', 'users');
    if (useGenerated && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.searchUsers(params);
        if (flags.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacySearchUsers)(params);
            (0, utils_1.shadowValidation)('searchUsers', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacySearchUsers)(params);
}

// Configuration and status functions
function getApiStatus() {
    const flags = (0, migration_flags_1.getMigrationFlags)();
    return {
        useGeneratedClient: flags.useGeneratedClient,
        hasGeneratedClient: (0, generated_1.hasGeneratedClient)(),
        enableShadowValidation: flags.enableShadowValidation,
        timestamp: new Date().toISOString()
    };
}
// Migration control functions
function enableGeneratedClient(enable = true) {
    (0, migration_flags_1.setMigrationFlags)({ useGeneratedClient: enable });
}
function enableShadowValidation(enable = true) {
    (0, migration_flags_1.setMigrationFlags)({ enableShadowValidation: enable });
}
