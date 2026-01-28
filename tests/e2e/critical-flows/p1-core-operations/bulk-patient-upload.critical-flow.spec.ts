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
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';
import * as fs from 'fs';
import * as path from 'path';

test.describe('FLOW-10: Bulk Patient Upload', () => {
  test('should upload patients in bulk successfully', async ({ tenantPage, apiContext, authTokens }) => {
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

    // STEP 2: Navigate to parties page
    console.log('[FLOW-10] Step 2: Navigate to parties page');
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify parties page loads
    await expect(tenantPage.locator('h1, h2').filter({ hasText: /Hasta|Party/i })).toBeVisible({ timeout: 10000 });

    // STEP 3: Click "Toplu Yükleme"
    console.log('[FLOW-10] Step 3: Click bulk upload button');
    const bulkUploadButton = tenantPage.getByRole('button', { name: /Toplu|Bulk|İçe Aktar|Import/i }).first();
    await bulkUploadButton.click();
    
    // Wait for upload dialog/form to appear
    await tenantPage.waitForSelector('input[type="file"], button:has-text("Dosya Seç")', { timeout: 5000 });

    // STEP 4: Upload CSV file
    console.log('[FLOW-10] Step 4: Upload CSV file');
    const fileInput = tenantPage.locator('input[type="file"]').first();
    await fileInput.setInputFiles(csvFilePath);
    
    // Wait for file to be processed
    await tenantPage.waitForTimeout(1000);

    // STEP 5: Verify validation messages
    console.log('[FLOW-10] Step 5: Verify validation preview');
    // Look for validation summary or preview
    await expect(tenantPage.locator('text=/3|Üç|Three/i').and(
      tenantPage.locator('text=/Kayıt|Record|Hasta|Patient/i')
    )).toBeVisible({ timeout: 5000 });
    
    // Verify no critical errors
    const errorText = tenantPage.locator('text=/Hata|Error|Geçersiz|Invalid/i').first();
    const hasErrors = await errorText.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasErrors) {
      console.log('[FLOW-10] Warning: Validation errors detected, but continuing...');
    }

    // STEP 6: Submit bulk upload
    console.log('[FLOW-10] Step 6: Submit bulk upload');
    const submitButton = tenantPage.getByRole('button', { name: /Yükle|Upload|Kaydet|Save|İçe Aktar|Import/i }).first();
    await submitButton.click();
    
    // Wait for API call (may take longer for bulk operations)
    await waitForApiCall(tenantPage, '/api/parties', 15000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 7: Verify success/error summary
    console.log('[FLOW-10] Step 7: Verify upload summary');
    // Look for success message or summary
    await expect(tenantPage.locator('text=/Başarılı|Success|Tamamlandı|Complete/i').or(
      tenantPage.locator('text=/3|Üç/i')
    )).toBeVisible({ timeout: 10000 });

    // STEP 8: Verify parties appear in list
    console.log('[FLOW-10] Step 8: Verify parties appear in list');
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify each patient appears
    for (const patient of testPatients) {
      await expect(tenantPage.locator(`text=${patient.phone}`)).toBeVisible({ timeout: 5000 });
      console.log('[FLOW-10] Verified patient:', patient.firstName, patient.lastName);
    }

    // STEP 9: Verify created/updated counts via API
    console.log('[FLOW-10] Step 9: Verify counts via API');
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
    
    // Verify each patient has correct data
    for (const testPatient of testPatients) {
      const createdPatient = createdPatients.find((p: any) => p.phone === testPatient.phone);
      expect(createdPatient).toBeTruthy();
      expect(createdPatient.firstName).toBe(testPatient.firstName);
      expect(createdPatient.lastName).toBe(testPatient.lastName);
      expect(createdPatient.email).toBe(testPatient.email);
    }

    // STEP 10: Cleanup temp file
    console.log('[FLOW-10] Step 10: Cleanup temp file');
    try {
      fs.unlinkSync(csvFilePath);
      console.log('[FLOW-10] Deleted temp CSV file');
    } catch (e) {
      console.log('[FLOW-10] Could not delete temp file:', e);
    }
    
    console.log('[FLOW-10] ✅ Bulk patient upload flow completed successfully');
  });
});
