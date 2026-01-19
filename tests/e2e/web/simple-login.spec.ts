import { test, expect } from '@playwright/test';
import { login } from './helpers/test-utils';

test('Simple Login Test', async ({ request }) => {
    console.log('Starting simple login test...');
    try {
        const tokens = await login(request, '+905551234567', '123456');
        console.log('Login successful!', tokens);
        expect(tokens.accessToken).toBeTruthy();
    } catch (e) {
        console.error('Login failed:', e);
        throw e;
    }
});
