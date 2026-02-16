import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import {
  assignDevice,
  returnDevice,
  replaceDevice,
  viewDeviceHistory,
  searchDeviceBySerial,
  filterDevicesByStatus,
  filterDevicesByBrand,
  exportDevices,
  hasStockAlert,
  viewDeviceWarranty
} from '../../helpers/device';
import { waitForApiCall } from '../../helpers/wait';
import { generateRandomParty } from '../../fixtures/parties';
import { testDevices } from '../../fixtures/devices';

function getRequiredDeviceId(deviceKey: keyof typeof testDevices): string {
  const deviceId = testDevices[deviceKey].id;
  if (!deviceId) {
    throw new Error(`Missing fixture id for ${String(deviceKey)}`);
  }
  return deviceId;
}

test.describe('Device Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('DEVICE-001: Assign device (sale)', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const deviceId = getRequiredDeviceId('device1');

    // Act: Assign device for sale
    const assignmentId = await assignDevice(page, {
      partyId,
      deviceId,
      reason: 'sale',
      notes: 'Sale assignment'
    });

    // Assert: Device assigned successfully
    expect(assignmentId).toBeTruthy();
    await page.goto(`/parties/${partyId}`);
    await expect(page.locator('[data-testid="party-devices"]')).toContainText(testDevices.device1.serialNumber);
  });

  test('DEVICE-002: Assign device (trial)', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const deviceId = getRequiredDeviceId('device2');
    const returnDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now

    // Act: Assign device for trial
    const assignmentId = await assignDevice(page, {
      partyId,
      deviceId,
      reason: 'trial',
      returnDate,
      notes: 'Trial period'
    });

    // Assert: Device assigned with return date
    expect(assignmentId).toBeTruthy();
    await page.goto(`/device-assignments/${assignmentId}`);
    await expect(page.locator('[data-testid="assignment-return-date"]')).toContainText(returnDate);
  });

  test('DEVICE-003: Assign device (loaner)', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const deviceId = getRequiredDeviceId('device3');

    // Act: Assign device as loaner
    const assignmentId = await assignDevice(page, {
      partyId,
      deviceId,
      reason: 'loaner',
      notes: 'Loaner while device in repair'
    });

    // Assert: Device assigned as loaner
    expect(assignmentId).toBeTruthy();
    await page.goto(`/device-assignments/${assignmentId}`);
    await expect(page.locator('[data-testid="assignment-reason"]')).toContainText('loaner');
  });

  test('DEVICE-004: Assign device (repair)', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const deviceId = getRequiredDeviceId('device1');

    // Act: Assign device for repair
    const assignmentId = await assignDevice(page, {
      partyId,
      deviceId,
      reason: 'repair',
      notes: 'Device needs repair'
    });

    // Assert: Device assigned for repair
    expect(assignmentId).toBeTruthy();
    await page.goto(`/device-assignments/${assignmentId}`);
    await expect(page.locator('[data-testid="assignment-reason"]')).toContainText('repair');
  });

  test('DEVICE-005: Assign device (replacement)', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const deviceId = getRequiredDeviceId('device2');

    // Act: Assign device as replacement
    const assignmentId = await assignDevice(page, {
      partyId,
      deviceId,
      reason: 'replacement',
      notes: 'Replacement for defective device'
    });

    // Assert: Device assigned as replacement
    expect(assignmentId).toBeTruthy();
    await page.goto(`/device-assignments/${assignmentId}`);
    await expect(page.locator('[data-testid="assignment-reason"]')).toContainText('replacement');
  });

  test('DEVICE-006: Return device', async ({ page }) => {
    // Arrange: Assign device for trial
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const deviceId = getRequiredDeviceId('device3');
    const assignmentId = await assignDevice(page, {
      partyId,
      deviceId,
      reason: 'trial'
    });

    // Act: Return device
    await returnDevice(page, assignmentId);

    // Assert: Device returned
    await page.goto(`/device-assignments/${assignmentId}`);
    await expect(page.locator('[data-testid="assignment-status"]')).toContainText('returned');
  });

  test('DEVICE-007: Replace device', async ({ page }) => {
    // Arrange: Assign device
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const deviceId = getRequiredDeviceId('device1');
    const assignmentId = await assignDevice(page, {
      partyId,
      deviceId,
      reason: 'sale'
    });

    // Act: Replace with new device
    const newDeviceId = getRequiredDeviceId('device2');
    const newAssignmentId = await replaceDevice(page, assignmentId, newDeviceId);

    // Assert: Device replaced
    expect(newAssignmentId).toBeTruthy();
    await page.goto(`/parties/${partyId}`);
    await expect(page.locator('[data-testid="party-devices"]')).toContainText(testDevices.device2.serialNumber);
  });

  test('DEVICE-008: View device history', async ({ page }) => {
    // Arrange: Device with history
    const deviceId = getRequiredDeviceId('device1');

    // Act: View history
    await viewDeviceHistory(page, deviceId);

    // Assert: History displayed
    await expect(page.locator('[data-testid="device-history-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="device-history-item"]')).toHaveCount(1);
  });

  test('DEVICE-009: Search device by serial number', async ({ page }) => {
    // Arrange: Known device serial number
    const serialNumber = testDevices.device1.serialNumber;

    // Act: Search by serial
    await searchDeviceBySerial(page, serialNumber);

    // Assert: Device found
    await expect(page.locator('[data-testid="device-list-item"]').first()).toContainText(serialNumber);
  });

  test('DEVICE-010: Filter devices by status', async ({ page }) => {
    // Act: Filter by available status
    await filterDevicesByStatus(page, 'available');

    // Assert: Only available devices shown
    await expect(page.locator('[data-testid="device-list-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="device-status-badge"]').first()).toContainText('available');
  });

  test('DEVICE-011: Filter devices by brand', async ({ page }) => {
    // Act: Filter by brand
    await filterDevicesByBrand(page, 'Phonak');

    // Assert: Only Phonak devices shown
    await expect(page.locator('[data-testid="device-list-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="device-brand"]').first()).toContainText('Phonak');
  });

  test('DEVICE-012: Export devices to CSV', async ({ page }) => {
    // Act: Export devices
    await exportDevices(page, 'csv');

    // Assert: File downloaded (verified by helper)
  });

  test('DEVICE-013: Device stock alert', async ({ page }) => {
    // Act: Check for stock alert
    const hasAlert = await hasStockAlert(page);

    // Assert: Alert shown if stock is low
    if (hasAlert) {
      await expect(page.locator('[data-testid="device-stock-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="device-stock-alert"]')).toContainText('Low stock');
    }
  });

  test('DEVICE-014: Device warranty tracking', async ({ page }) => {
    // Arrange: Device with warranty
    const deviceId = getRequiredDeviceId('device1');

    // Act: View warranty info
    await viewDeviceWarranty(page, deviceId);

    // Assert: Warranty info displayed
    await expect(page.locator('[data-testid="device-warranty-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="device-warranty-expiry"]')).toBeVisible();
  });

  test('DEVICE-015: Device pagination', async ({ page }) => {
    // Arrange: Navigate to devices page
    await page.goto('/devices');

    // Act: Navigate to page 2
    await page.locator('[data-testid="pagination-next"]').click();
    await waitForApiCall(page, '/devices', 'GET');

    // Assert: Page 2 loaded
    await expect(page.locator('[data-testid="pagination-current"]')).toContainText('2');
  });
});
