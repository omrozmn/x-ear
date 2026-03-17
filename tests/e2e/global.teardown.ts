import { FullConfig, request } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface CleanupRecord {
  type: 'party' | 'sale' | 'device' | 'appointment' | 'invoice';
  id: string;
  createdAt: number;
}

const cleanupRecords: CleanupRecord[] = [];

/**
 * Register an entity for cleanup after tests
 */
export function registerForCleanup(record: CleanupRecord) {
  cleanupRecords.push(record);
}

/**
 * Get all registered cleanup records
 */
export function getCleanupRecords(): CleanupRecord[] {
  return [...cleanupRecords];
}

/**
 * Clear all cleanup records (useful for isolated tests)
 */
export function clearCleanupRecords() {
  cleanupRecords.length = 0;
}

async function globalTeardown(config: FullConfig) {
  const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:5003';
  console.log(`\n🧹 GLOBAL TEARDOWN: Cleaning up test data...`);

  if (cleanupRecords.length === 0) {
    console.log('ℹ️ No test data to clean up');
    return;
  }

  // Create API context
  const api = await request.newContext({
    baseURL: apiBase,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    }
  });

  // Get admin token
  const adminIdentifier = process.env.TEST_USER_EMAIL || 'admin@x-ear.com';
  const adminPassword = process.env.TEST_USER_PASSWORD || 'password123';
  let adminToken = '';

  try {
    const loginRes = await api.post('/api/auth/login', {
      data: { identifier: adminIdentifier, password: adminPassword },
      headers: { 'Idempotency-Key': 'global-teardown-login' }
    });

    const loginJson = await loginRes.json();
    if (loginJson.success && loginJson.data?.accessToken) {
      adminToken = loginJson.data.accessToken;
    }
  } catch (e) {
    console.warn('⚠️ Could not login for cleanup:', e);
    return;
  }

  if (!adminToken) {
    console.warn('🚨 No admin token, skipping cleanup');
    return;
  }

  // Cleanup each registered entity
  for (const record of cleanupRecords) {
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      
      switch (record.type) {
        case 'party':
          await api.delete(`/api/parties/${record.id}`, { headers });
          console.log(`🗑️ Deleted party: ${record.id}`);
          break;
        case 'sale':
          await api.delete(`/api/sales/${record.id}`, { headers });
          console.log(`🗑️ Deleted sale: ${record.id}`);
          break;
        case 'device':
          await api.delete(`/api/devices/${record.id}`, { headers });
          console.log(`🗑️ Deleted device: ${record.id}`);
          break;
        case 'appointment':
          await api.delete(`/api/appointments/${record.id}`, { headers });
          console.log(`🗑️ Deleted appointment: ${record.id}`);
          break;
        case 'invoice':
          await api.delete(`/api/invoices/${record.id}`, { headers });
          console.log(`🗑️ Deleted invoice: ${record.id}`);
          break;
      }
    } catch (e) {
      console.warn(`⚠️ Failed to delete ${record.type} ${record.id}:`, e);
    }
  }

  // Clear records after cleanup
  clearCleanupRecords();
  
  console.log('\n✅ Global Teardown Complete.\n');
}

export default globalTeardown;
