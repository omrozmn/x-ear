"use strict";
// Main API Adapter - Strangler Pattern Implementation
// This serves as the single entry point for all API calls
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.getApiStatus = getApiStatus;
exports.enableGeneratedClient = enableGeneratedClient;
exports.enableShadowValidation = enableShadowValidation;
const config_1 = require("./config");
const utils_1 = require("./utils");
const legacy_1 = require("./legacy");
const generated_1 = require("./generated");
// Get current configuration
const config = (0, config_1.getApiConfig)();
// Public API - These are the functions that the UI will call
// Patient Operations
async function getPatients(params) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getPatients(params);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetPatients)(params);
            (0, utils_1.shadowValidation)('getPatients', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetPatients)(params);
}
async function getPatient(id) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.getPatient(id);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyGetPatient)(id);
            (0, utils_1.shadowValidation)('getPatient', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyGetPatient)(id);
}
async function createPatient(patient) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.createPatient(patient);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyCreatePatient)(patient);
            (0, utils_1.shadowValidation)('createPatient', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyCreatePatient)(patient);
}
async function updatePatient(id, patient) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.updatePatient(id, patient);
        if (config.enableShadowValidation) {
            const legacyPromise = (0, legacy_1.legacyUpdatePatient)(id, patient);
            (0, utils_1.shadowValidation)('updatePatient', generatedPromise, legacyPromise);
        }
        return generatedPromise;
    }
    return (0, legacy_1.legacyUpdatePatient)(id, patient);
}
async function deletePatient(id) {
    if (config.useGeneratedClient && (0, generated_1.hasGeneratedClient)()) {
        const generatedPromise = generated_1.generatedClient.deletePatient(id);
        if (config.enableShadowValidation) {
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
// Configuration and status functions
function getApiStatus() {
    return {
        useGeneratedClient: config.useGeneratedClient,
        hasGeneratedClient: (0, generated_1.hasGeneratedClient)(),
        enableShadowValidation: config.enableShadowValidation,
        timestamp: new Date().toISOString()
    };
}
function enableGeneratedClient(enable = true) {
    (0, config_1.updateApiConfig)({ useGeneratedClient: enable });
}
function enableShadowValidation(enable = true) {
    (0, config_1.updateApiConfig)({ enableShadowValidation: enable });
}
