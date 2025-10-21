import { patientApiService } from '../services/patient/patient-api.service';

async function testApiIntegration() {
  console.log('🧪 Testing Patient API Integration...\n');

  try {
    // Test 1: Get Sales
    console.log('1️⃣ Testing getSales...');
    const salesResult = await patientApiService.getSales('test-patient-id');
    console.log('✅ Sales API Response:', salesResult);
    console.log('');

    // Test 2: Get Timeline
    console.log('2️⃣ Testing getTimeline...');
    const timelineResult = await patientApiService.getTimeline('test-patient-id');
    console.log('✅ Timeline API Response:', timelineResult);
    console.log('');

    // Test 3: Get Appointments
    console.log('3️⃣ Testing getAppointments...');
    const appointmentsResult = await patientApiService.getAppointments('test-patient-id');
    console.log('✅ Appointments API Response:', appointmentsResult);
    console.log('');

    // Test 4: Get Documents (mock data)
    console.log('4️⃣ Testing getDocuments (mock data)...');
    const documentsResult = await patientApiService.getDocuments('test-patient-id');
    console.log('✅ Documents API Response:', documentsResult);
    console.log('');

    // Test 5: Get Hearing Tests (mock data)
    console.log('5️⃣ Testing getHearingTests (mock data)...');
    const hearingTestsResult = await patientApiService.getHearingTests('test-patient-id');
    console.log('✅ Hearing Tests API Response:', hearingTestsResult);
    console.log('');

    // Test 6: Get Notes (mock data)
    console.log('6️⃣ Testing getNotes (mock data)...');
    const notesResult = await patientApiService.getNotes('test-patient-id');
    console.log('✅ Notes API Response:', notesResult);
    console.log('');

    console.log('🎉 All API tests completed!');

  } catch (error) {
    console.error('❌ API Test failed:', error);
  }
}

// Run the test
testApiIntegration();