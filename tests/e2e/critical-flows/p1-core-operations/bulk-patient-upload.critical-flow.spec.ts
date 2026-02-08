/**
 * FLOW-10: Bulk Patient Upload - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Data migration, efficiency, onboarding large clinics
 * 
 * API Endpoints:
 * - POST /api/parties/bulk-upload (bulkUploadParties)
 * - GET /api/parties (listParties)
 */

import { test, expect } from '../../fixtures/fixtures';
import { validateResponseEnvelope } from '../../web/helpers/test-utils';
import * as fs from 'fs';
import * as path from 'path';

test.describe('FLOW-10: Bulk Patient Upload', () => {
  test('should upload patients in bulk successfully', async ({ apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // STEP 1: Create test CSV file with Turkish data
    console.log('[FLOW-10] Step 1: Create test CSV file');
    const testPatients = [
      {
        firstName: `Ahmet${uniqueId.slice(-5)}`,
        lastName: 'Yılmaz',
        phone: `+90555${uniqueId.slice(-7)}1`,
        email: `ahmet${uniqueId}@example.com`,
        tcNumber: `${uniqueId}001`
      },
      {
        firstName: `Ayşe${uniqueId.slice(-5)}`,
        lastName: 'Demir',
        phone: `+90555${uniqueId.slice(-7)}2`,
        email: `ayse${uniqueId}@example.com`,
        tcNumber: `${uniqueId}002`
      },
      {
        firstName: `Mehmet${uniqueId.slice(-5)}`,
        lastName: 'Kaya',
        phone: `+90555${uniqueId.slice(-7)}3`,
        email: `mehmet${uniqueId}@example.com`,
        tcNumber: `${uniqueId}003`
      }
    ];
    
    // Create CSV content
    const csvHeader = 'firstName,lastName,phone,email,tcNumber\n';
    const csvRows = testPatients.map(p => 
      `${p.firstName},${p.lastName},${p.phone},${p.email},${p.tcNumber}`
    ).join('\n');
    const csvContent = csvHeader + csvRows;
    
    // Write CSV file to temp location
    const tempDir = path.join(process.cwd(), 'test-results', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const csvFilePath = path.join(tempDir, `bulk-upload-${uniqueId}.csv`);
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8');
    console.log('[FLOW-10] Created CSV file:', csvFilePath);

    // STEP 2: Upload CSV file via API
    console.log('[FLOW-10] Step 2: Upload CSV file via API');
    
    // Read file as buffer for multipart upload
    const fileBuffer = fs.readFileSync(csvFilePath);
    const fileName = `bulk-upload-${uniqueId}.csv`;
    
    const uploadResponse = await apiContext.post('/api/parties/bulk-upload', {
      headers: {
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-bulk-upload-${uniqueId}`
      },
      multipart: {
        file: {
          name: fileName,
          mimeType: 'text/csv',
          buffer: fileBuffer
        }
      }
    });
    
    if (!uploadResponse.ok()) {
      const errorBody = await uploadResponse.text();
      console.error('[FLOW-10] Bulk upload failed:', uploadResponse.status(), errorBody);
    }
    expect(uploadResponse.ok(), `Bulk upload should succeed (status: ${uploadResponse.status()})`).toBeTruthy();
    
    const uploadData = await uploadResponse.json();
    validateResponseEnvelope(uploadData);
    
    console.log('[FLOW-10] Upload response:', JSON.stringify(uploadData.data, null, 2));
    
    // STEP 3: Verify upload summary
    console.log('[FLOW-10] Step 3: Verify upload summary');
    expect(uploadData.data.success).toBeTruthy();
    expect(uploadData.data.created).toBeGreaterThan(0);
    console.log('[FLOW-10] Created:', uploadData.data.created);
    console.log('[FLOW-10] Updated:', uploadData.data.updated || 0);
    console.log('[FLOW-10] Errors:', uploadData.data.errors?.length || 0);

    // STEP 4: Verify parties appear in list via API
    console.log('[FLOW-10] Step 4: Verify parties appear in list via API');
    const listResponse = await apiContext.get('/api/parties?page=1&perPage=100', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    // Count how many of our test patients were created
    const createdPatients = listData.data.filter((p: any) => 
      testPatients.some(tp => tp.phone === p.phone)
    );
    
    expect(createdPatients.length).toBe(testPatients.length);
    console.log('[FLOW-10] Verified', createdPatients.length, 'patients created');
    
    // STEP 5: Verify each patient has correct data
    console.log('[FLOW-10] Step 5: Verify each patient data');
    for (const testPatient of testPatients) {
      const createdPatient = createdPatients.find((p: any) => p.phone === testPatient.phone);
      expect(createdPatient, `Patient with phone ${testPatient.phone} should exist`).toBeTruthy();
      expect(createdPatient.firstName).toBe(testPatient.firstName);
      expect(createdPatient.lastName).toBe(testPatient.lastName);
      expect(createdPatient.email).toBe(testPatient.email);
      console.log('[FLOW-10] Verified patient:', testPatient.firstName, testPatient.lastName);
    }

    // STEP 6: Cleanup temp file
    console.log('[FLOW-10] Step 6: Cleanup temp file');
    try {
      fs.unlinkSync(csvFilePath);
      console.log('[FLOW-10] Deleted temp CSV file');
    } catch (e) {
      console.log('[FLOW-10] Could not delete temp file:', e);
    }
    
    console.log('[FLOW-10] ✅ Bulk patient upload flow completed successfully');
    console.log('[FLOW-10] Total patients uploaded:', testPatients.length);
    console.log('[FLOW-10] All patients verified in database');
  });
});
