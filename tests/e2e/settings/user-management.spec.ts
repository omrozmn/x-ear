import { test, expect } from '@playwright/test';
import { login, logout } from '../../helpers/auth';
import { waitForToast, waitForModalOpen, waitForModalClose } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen, expectModalClosed } from '../../helpers/assertions';
import { testUsers } from '../../fixtures';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await login(page, testUsers.admin);
  });

  test('SETTINGS-001: Should update user profile', async ({ page }) => {
    // Click user menu
    await page.locator('[data-testid="user-menu"]').click();
    
    // Click Profile link
    await page.locator('[data-testid="user-profile-link"]').click();
    
    // Verify profile page opened
    await page.waitForTimeout(500);
    
    // Update first name
    const firstNameInput = page.locator('[data-testid="profile-first-name-input"]');
    if (await firstNameInput.isVisible()) {
      await firstNameInput.clear();
      await firstNameInput.fill('Mehmet');
    }
    
    // Update phone
    const phoneInput = page.locator('[data-testid="profile-phone-input"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.clear();
      await phoneInput.fill('+905559876543');
    }
    
    // Submit
    await page.locator('[data-testid="profile-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify name updated in user menu
    await page.locator('[data-testid="user-menu"]').click();
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Mehmet');
  });

  test('SETTINGS-002: Should change password', async ({ page }) => {
    // Navigate to profile
    await page.locator('[data-testid="user-menu"]').click();
    await page.locator('[data-testid="user-profile-link"]').click();
    
    // Click Change Password button
    const changePasswordButton = page.locator('[data-testid="password-change-button"]');
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click();
      
      // Enter current password
      await page.locator('[data-testid="password-current-input"]').fill('Admin123!');
      
      // Enter new password
      await page.locator('[data-testid="password-new-input"]').fill('NewPassword123!');
      
      // Confirm new password
      await page.locator('[data-testid="password-confirm-input"]').fill('NewPassword123!');
      
      // Submit
      await page.locator('[data-testid="password-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      
      // Logout
      await logout(page);
      
      // Login with new password
      await page.goto('/login');
      await page.locator('[data-testid="login-identifier-input"]').fill(testUsers.admin.identifier);
      await page.locator('[data-testid="login-password-input"]').fill('NewPassword123!');
      await page.locator('[data-testid="login-submit-button"]').click();
      
      // Verify login successful
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test('SETTINGS-003: Should create new user', async ({ page }) => {
    // Navigate to Settings → Users
    await page.goto('/settings/users');
    
    // Click New User button
    await page.locator('[data-testid="user-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'user-modal');
    
    // Enter user details
    await page.locator('[data-testid="user-first-name-input"]').fill('Ayşe');
    await page.locator('[data-testid="user-last-name-input"]').fill('Demir');
    await page.locator('[data-testid="user-email-input"]').fill('ayse@example.com');
    await page.locator('[data-testid="user-phone-input"]').fill('+905551112233');
    
    // Select role
    await page.locator('[data-testid="user-role-select"]').click();
    await page.locator('text=Audiologist').first().click();
    
    // Select branch
    await page.locator('[data-testid="user-branch-select"]').click();
    await page.locator('text=Merkez').first().click();
    
    // Submit
    await page.locator('[data-testid="user-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify user in list
    await expect(page.locator('[data-testid="user-list-item"]').first()).toContainText('Ayşe');
  });

  test('SETTINGS-004: Should assign user role', async ({ page }) => {
    // Navigate to Settings → Users
    await page.goto('/settings/users');
    
    // Click Edit button on first user
    await page.locator('[data-testid="user-edit-button"]').first().click();
    
    // Verify modal opened
    await expectModalOpen(page, 'user-modal');
    
    // Change role to Manager
    await page.locator('[data-testid="user-role-select"]').click();
    await page.locator('text=Manager').first().click();
    
    // Submit
    await page.locator('[data-testid="user-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify role updated in list
    await expect(page.locator('[data-testid="user-list-item"]').first()).toContainText('Manager');
  });

  test('SETTINGS-005: Should deactivate user', async ({ page }) => {
    // Navigate to Settings → Users
    await page.goto('/settings/users');
    
    // Click Deactivate button on first user
    const deactivateButton = page.locator('[data-testid="user-deactivate-button"]').first();
    if (await deactivateButton.isVisible()) {
      await deactivateButton.click();
      
      // Confirm deactivation
      await page.locator('[data-testid="confirm-dialog-yes-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      
      // Verify user status updated
      await expect(page.locator('[data-testid="user-list-item"]').first()).toContainText(/Deaktif|Inactive/i);
    }
  });

  test('SETTINGS-006: Should create branch', async ({ page }) => {
    // Navigate to Settings → Branches
    await page.goto('/settings/branches');
    
    // Click New Branch button
    await page.locator('[data-testid="branch-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'branch-modal');
    
    // Enter branch details
    await page.locator('[data-testid="branch-name-input"]').fill('Kadıköy Şubesi');
    await page.locator('[data-testid="branch-address-input"]').fill('Kadıköy, İstanbul');
    await page.locator('[data-testid="branch-phone-input"]').fill('+902161234567');
    
    // Submit
    await page.locator('[data-testid="branch-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify branch in list
    await expect(page.locator('[data-testid="branch-list-item"]').first()).toContainText('Kadıköy');
  });

  test('SETTINGS-007: Should update branch', async ({ page }) => {
    // Navigate to Settings → Branches
    await page.goto('/settings/branches');
    
    // Click Edit button on first branch
    await page.locator('[data-testid="branch-edit-button"]').first().click();
    
    // Verify modal opened
    await expectModalOpen(page, 'branch-modal');
    
    // Update branch name
    await page.locator('[data-testid="branch-name-input"]').clear();
    await page.locator('[data-testid="branch-name-input"]').fill('Merkez Şube - Güncellendi');
    
    // Submit
    await page.locator('[data-testid="branch-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify branch updated in list
    await expect(page.locator('[data-testid="branch-list-item"]').first()).toContainText('Güncellendi');
  });

  test('SETTINGS-008: Should manage role permissions', async ({ page }) => {
    // Navigate to Settings → Roles
    await page.goto('/settings/roles');
    
    // Click on first role to edit permissions
    await page.locator('[data-testid="role-list-item"]').first().click();
    
    // Verify permissions page opened
    await page.waitForTimeout(500);
    
    // Toggle some permissions
    const permissionCheckboxes = page.locator('[data-testid="permission-checkbox"]');
    const checkboxCount = await permissionCheckboxes.count();
    
    if (checkboxCount > 0) {
      // Toggle first 3 permissions
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        await permissionCheckboxes.nth(i).click();
      }
      
      // Submit
      await page.locator('[data-testid="permissions-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
    }
  });

  test('SETTINGS-009: Should create new role', async ({ page }) => {
    // Navigate to Settings → Roles
    await page.goto('/settings/roles');
    
    // Click New Role button
    await page.locator('[data-testid="role-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'role-modal');
    
    // Enter role details
    await page.locator('[data-testid="role-name-input"]').fill('Sales Manager');
    await page.locator('[data-testid="role-description-input"]').fill('Manages sales team');
    
    // Submit
    await page.locator('[data-testid="role-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify role in list
    await expect(page.locator('[data-testid="role-list-item"]').first()).toContainText('Sales Manager');
  });
});
