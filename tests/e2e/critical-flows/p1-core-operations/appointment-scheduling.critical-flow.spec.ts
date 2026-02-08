/**
 * FLOW-06: Appointment Scheduling - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Core clinic workflow, patient experience, resource planning
 * 
 * API Endpoints:
 * - POST /api/parties (createParties)
 * - POST /api/appointments (createAppointment)
 * - GET /api/appointments (listAppointments)
 * - GET /api/appointments/{appointment_id} (getAppointment)
 */

import { test, expect } from '../../fixtures/fixtures';
import { validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-06: Appointment Scheduling', () => {
  test('should schedule appointment successfully', async ({ apiContext }) => {
    test.setTimeout(60000);
    
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // STEP 1: Create test party
    console.log('[FLOW-06] Step 1: Create test party');
    const partyResponse = await apiContext.post('/api/parties', {
      data: {
        firstName: `Mehmet${uniqueId.slice(-5)}`,
        lastName: 'Kaya',
        phone: `+90555${uniqueId.slice(-7)}`,
        email: `test${uniqueId}@example.com`
      },
      headers: { 'Idempotency-Key': `test-party-${uniqueId}` }
    });
    
    if (!partyResponse.ok()) {
      const errorBody = await partyResponse.text();
      console.error('[FLOW-06] Party creation failed:', partyResponse.status(), errorBody);
      throw new Error(`Party creation failed: ${partyResponse.status()} - ${errorBody}`);
    }
    
    const partyData = await partyResponse.json();
    validateResponseEnvelope(partyData);
    const partyId = partyData.data.id;
    console.log('[FLOW-06] Created party:', partyId);

    // STEP 2: Create appointment
    console.log('[FLOW-06] Step 2: Create appointment');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = '14:00'; // 2 PM
    
    const appointmentData = {
      partyId: partyId,
      date: dateString,
      time: timeString,
      serviceType: 'consultation',
      duration: 30,
      notes: 'E2E test appointment',
      status: 'scheduled'
    };
    
    const appointmentResponse = await apiContext.post('/api/appointments', {
      data: appointmentData,
      headers: { 'Idempotency-Key': `test-appointment-${uniqueId}` }
    });
    
    if (!appointmentResponse.ok()) {
      const errorBody = await appointmentResponse.text();
      console.error('[FLOW-06] Appointment creation failed:', appointmentResponse.status(), errorBody);
      throw new Error(`Appointment creation failed: ${appointmentResponse.status()} - ${errorBody}`);
    }
    
    const appointmentResponseData = await appointmentResponse.json();
    validateResponseEnvelope(appointmentResponseData);
    const appointmentId = appointmentResponseData.data.id;
    console.log('[FLOW-06] Created appointment:', appointmentId);

    // STEP 3: Verify appointment via GET
    console.log('[FLOW-06] Step 3: Verify appointment via GET');
    const getResponse = await apiContext.get(`/api/appointments/${appointmentId}`);
    
    if (!getResponse.ok()) {
      const errorBody = await getResponse.text();
      console.error('[FLOW-06] Get appointment failed:', getResponse.status(), errorBody);
      throw new Error(`Get appointment failed: ${getResponse.status()} - ${errorBody}`);
    }
    
    const getResponseData = await getResponse.json();
    validateResponseEnvelope(getResponseData);
    
    const appointment = getResponseData.data;
    expect(appointment.id).toBe(appointmentId);
    expect(appointment.partyId).toBe(partyId);
    expect(appointment.status).toBe('scheduled');
    
    console.log('[FLOW-06] Appointment verified');

    // STEP 4: Verify appointment in list
    console.log('[FLOW-06] Step 4: Verify appointment in list');
    const listResponse = await apiContext.get('/api/appointments?page=1&perPage=50');
    
    if (!listResponse.ok()) {
      const errorBody = await listResponse.text();
      console.error('[FLOW-06] List appointments failed:', listResponse.status(), errorBody);
      throw new Error(`List appointments failed: ${listResponse.status()} - ${errorBody}`);
    }
    
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const foundAppointment = listData.data.find((a: any) => a.id === appointmentId);
    expect(foundAppointment, 'Appointment should be in list').toBeTruthy();
    
    console.log('[FLOW-06] ✅ Appointment scheduling completed successfully');
    console.log('[FLOW-06] Party:', partyId);
    console.log('[FLOW-06] Appointment:', appointmentId);
    console.log('[FLOW-06] Date:', appointment.date);
    console.log('[FLOW-06] Status:', appointment.status);
  });
});
