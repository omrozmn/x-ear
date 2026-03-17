import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';

test('Smoke test: Create Party', async ({ page }) => {
  await login(page, {
    identifier: 'e2etest',
    password: 'Test123!'
  });
  
  const partyId = await createParty(page, {
    firstName: 'Smoke',
    lastName: 'Test',
    phone: '5550009999'
  });
  
  console.log('Successfully created party:', partyId);
  expect(partyId).toBeDefined();
});
