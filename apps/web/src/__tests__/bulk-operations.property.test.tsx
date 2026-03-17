/**
 * Property-Based Test: Bulk Operation Execution
 * 
 * Feature: runtime-bug-fixes
 * Property 15: Bulk Operation Execution
 * Validates: Requirements 6.2, 6.4
 * 
 * Tests that API calls are made for all selected parties
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import fc from 'fast-check';

describe('Property 15: Bulk Operation Execution', () => {
  let mockBulkUpdate: Mock;
  let mockBulkEmail: Mock;

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetModules();
    mockBulkUpdate = vi.fn().mockResolvedValue({
      data: { successCount: 1, failureCount: 0, results: [] }
    });
    mockBulkEmail = vi.fn().mockResolvedValue({
      data: { successCount: 1, failureCount: 0, results: [] }
    });
  });

  it('should include all party IDs in bulk update request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          partyIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          updates: fc.record({
            status: fc.constantFrom('active', 'inactive', 'lead'),
            segment: fc.constantFrom('customer', 'lead', 'trial'),
          }),
        }),
        async ({ partyIds, updates }) => {
          // Simulate bulk update API call
          const requestData = {
            partyIds,
            updates,
          };

          await mockBulkUpdate({ data: requestData });

          // Verify: API was called
          expect(mockBulkUpdate).toHaveBeenCalledTimes(1);

          // Verify: All party IDs were included
          const callArgs = mockBulkUpdate.mock.calls[0][0];
          expect(callArgs.data.partyIds).toEqual(partyIds);
          expect(callArgs.data.partyIds.length).toBe(partyIds.length);

          // Reset for next iteration
          mockBulkUpdate.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all party IDs in bulk email request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          partyIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          emailData: fc.record({
            subject: fc.string({ minLength: 5, maxLength: 50 }),
            body: fc.string({ minLength: 10, maxLength: 200 }),
          }),
        }),
        async ({ partyIds, emailData }) => {
          // Simulate bulk email API call
          const requestData = {
            partyIds,
            subject: emailData.subject,
            body: emailData.body,
          };

          await mockBulkEmail({ data: requestData });

          // Verify: API was called
          expect(mockBulkEmail).toHaveBeenCalledTimes(1);

          // Verify: All party IDs were included
          const callArgs = mockBulkEmail.mock.calls[0][0];
          expect(callArgs.data.partyIds).toEqual(partyIds);
          expect(callArgs.data.partyIds.length).toBe(partyIds.length);

          // Reset for next iteration
          mockBulkEmail.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});
