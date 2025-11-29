"use strict";
// Smoke Test for API Migration
// This module provides E2E smoke tests to validate the API migration
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSmokeTests = runSmokeTests;
exports.quickSmokeTest = quickSmokeTest;
const index_1 = require("./index");
// Individual test functions
async function testGetPatients() {
    const start = Date.now();
    const testName = 'getPatients';
    try {
        const response = await (0, index_1.getPatients)({ page: 1, limit: 10 });
        if (!response.success) {
            throw new Error(response.error || 'API returned success: false');
        }
        if (!Array.isArray(response.data)) {
            throw new Error('Expected data to be an array');
        }
        return {
            testName,
            success: true,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            testName,
            success: false,
            error: error.message,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
}
async function testGetPatient() {
    const start = Date.now();
    const testName = 'getPatient';
    try {
        // First get a list of patients to get a valid ID
        const patientsResponse = await (0, index_1.getPatients)({ limit: 1 });
        if (!patientsResponse.success || !patientsResponse.data?.length) {
            throw new Error('No patients available for testing');
        }
        const patientId = patientsResponse.data[0].id;
        if (!patientId) {
            throw new Error('Patient ID not found');
        }
        const response = await (0, index_1.getPatient)(patientId);
        if (!response.success) {
            throw new Error(response.error || 'API returned success: false');
        }
        if (!response.data || typeof response.data !== 'object') {
            throw new Error('Expected data to be an object');
        }
        return {
            testName,
            success: true,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            testName,
            success: false,
            error: error.message,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
}
async function testCreatePatient() {
    const start = Date.now();
    const testName = 'createPatient';
    try {
        const testPatient = {
            firstName: 'Test',
            lastName: 'Patient',
            tcNumber: '12345678901',
            phone: '+90 555 123 4567',
            email: 'test@example.com',
            birthDate: '1990-01-01',
            gender: 'M'
        };
        const response = await (0, index_1.createPatient)(testPatient);
        if (!response.success) {
            throw new Error(response.error || 'API returned success: false');
        }
        if (!response.data || typeof response.data !== 'object') {
            throw new Error('Expected data to be an object');
        }
        // Clean up - delete the test patient
        if (response.data.id) {
            try {
                await (0, index_1.deletePatient)(response.data.id);
            }
            catch (cleanupError) {
                console.warn('Failed to clean up test patient:', cleanupError);
            }
        }
        return {
            testName,
            success: true,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            testName,
            success: false,
            error: error.message,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
}
async function testApiStatus() {
    const start = Date.now();
    const testName = 'apiStatus';
    try {
        const status = (0, index_1.getApiStatus)();
        if (typeof status !== 'object' || !status.timestamp) {
            throw new Error('Invalid API status response');
        }
        return {
            testName,
            success: true,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            testName,
            success: false,
            error: error.message,
            duration: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
}
// Main smoke test suite
async function runSmokeTests(options = {}) {
    const suiteStart = Date.now();
    const suiteName = 'API Migration Smoke Tests';
    console.log(`🧪 Starting ${suiteName}...`);
    // Configure test environment
    if (options.enableShadowMode) {
        (0, index_1.enableShadowValidation)(true);
        console.log('✅ Shadow validation enabled');
    }
    if (options.useGeneratedClient) {
        (0, index_1.enableGeneratedClient)(true);
        console.log('✅ Generated client enabled');
    }
    // Log current API status
    const status = (0, index_1.getApiStatus)();
    console.log('📊 API Status:', status);
    // Run tests
    const tests = [
        testApiStatus,
        testGetPatients,
        testGetPatient,
        testCreatePatient,
    ];
    const results = [];
    for (const test of tests) {
        console.log(`🔄 Running ${test.name}...`);
        const result = await test();
        results.push(result);
        if (result.success) {
            console.log(`✅ ${result.testName} passed (${result.duration}ms)`);
        }
        else {
            console.log(`❌ ${result.testName} failed: ${result.error} (${result.duration}ms)`);
        }
    }
    // Calculate suite results
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;
    const totalDuration = Date.now() - suiteStart;
    const success = failedTests === 0;
    const suite = {
        suiteName,
        results,
        totalTests: results.length,
        passedTests,
        failedTests,
        totalDuration,
        success
    };
    // Log summary
    console.log(`\n📋 ${suiteName} Summary:`);
    console.log(`   Total Tests: ${suite.totalTests}`);
    console.log(`   Passed: ${suite.passedTests}`);
    console.log(`   Failed: ${suite.failedTests}`);
    console.log(`   Duration: ${suite.totalDuration}ms`);
    console.log(`   Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    return suite;
}
// Quick smoke test for development
async function quickSmokeTest() {
    try {
        console.log('🚀 Running quick smoke test...');
        const suite = await runSmokeTests({
            enableShadowMode: false,
            useGeneratedClient: false
        });
        return suite.success;
    }
    catch (error) {
        console.error('💥 Quick smoke test failed:', error);
        return false;
    }
}
// Export for browser console usage
if (typeof window !== 'undefined') {
    window.apiSmokeTest = {
        run: runSmokeTests,
        quick: quickSmokeTest,
        status: index_1.getApiStatus
    };
}
