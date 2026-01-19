import { chromium, FullConfig, request } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function globalSetup(config: FullConfig) {
    const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:5003';
    console.log(`\n🚀 GLOBAL SETUP: Seeding Data to ${apiBase}...\n`);

    // 1. Create Request Context
    const api = await request.newContext({
        baseURL: apiBase,
        extraHTTPHeaders: {
            'Content-Type': 'application/json',
        }
    });

    // 2. Login or Bootstrap as Super Admin
    // Using created test user which is TENANT_ADMIN
    const adminPhone = process.env.TEST_USER_PHONE || '+905551234567';
    const adminPassword = process.env.TEST_USER_PASSWORD || '123456';
    let adminToken = '';

    try {
        const loginRes = await api.post('/api/auth/login', {
            data: { identifier: adminPhone, password: adminPassword },
            headers: { 'Idempotency-Key': 'global-setup-login' }
        });

        const loginJson = await loginRes.json();
        if (loginJson.success && loginJson.data?.accessToken) {
            adminToken = loginJson.data.accessToken;
            console.log('✅ Admin Token Acquired');
        } else {
            console.warn('⚠️ Could not acquire Admin Token. Seeding might be limited.', loginJson);
        }
    } catch (e) {
        console.warn('⚠️ Admin Login Failed:', e);
    }

    if (adminToken) {
        // 3. Seed Inventory for POS Tests
        // POS Test expects an item with barcode '1234567890123'
        const seedInventoryItem = {
            name: 'E2E Test Product',
            brand: 'TestBrand',
            model: 'X1',
            price: 100,
            barcode: '1234567890123',
            availableInventory: 50,
            category: 'hearing_aid'
        };

        try {
            const createRes = await api.post('/api/inventory', {
                data: seedInventoryItem,
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (createRes.ok()) {
                console.log('✅ Seeding: E2E Test Product Created');
            } else {
                // It might already exist, which is fine
                // console.log('ℹ️ E2E Product might already exist');
            }
        } catch (e) {
            console.warn('⚠️ Inventory Seeding Failed', e);
        }

        // 4. Seed Test Supplier for Purchases
        try {
            await api.post('/api/suppliers', {
                data: { name: 'E2E Supplier', email: 'supplier@test.com', phone: '5551112233' },
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            console.log('✅ Seeding: E2E Supplier Created');
        } catch (e) { }

    } else {
        console.warn('🚨 SKIP SEEDING: Authentication failed. Tests rely on existing data.');
    }

    console.log('\n✅ Global Setup Complete.\n');
}

export default globalSetup;
