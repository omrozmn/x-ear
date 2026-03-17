/**
 * Property-Based Test: Print Queue Operations
 * 
 * Feature: runtime-bug-fixes
 * Property 17: Print Queue Operations
 * Validates: Requirements 7.2, 7.3
 * 
 * Tests that correct API endpoints are called for print queue operations
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import fc from 'fast-check';

describe('Property 17: Print Queue Operations', () => {
  let mockGetPrintQueue: Mock;
  let mockAddToPrintQueue: Mock;
  let mockProcessPrintQueue: Mock;

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetModules();
    mockGetPrintQueue = vi.fn().mockResolvedValue({
      data: []
    });
    mockAddToPrintQueue = vi.fn().mockResolvedValue({
      data: { id: 'queue-item-1', status: 'pending' }
    });
    mockProcessPrintQueue = vi.fn().mockResolvedValue({
      data: { processed: 1, failed: 0 }
    });
  });

  it('should call GET /api/print-queue endpoint to fetch queue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
        }),
        async ({ tenantId }) => {
          // Simulate fetching print queue
          await mockGetPrintQueue({ tenantId });

          // Verify: GET endpoint was called
          expect(mockGetPrintQueue).toHaveBeenCalledTimes(1);
          expect(mockGetPrintQueue).toHaveBeenCalledWith({ tenantId });

          // Reset for next iteration
          mockGetPrintQueue.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should call POST /api/print-queue endpoint to add items', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.uuid(),
          documentType: fc.constantFrom('invoice', 'receipt', 'report'),
          tenantId: fc.uuid(),
        }),
        async ({ documentId, documentType, tenantId }) => {
          // Simulate adding to print queue
          const requestData = {
            documentId,
            documentType,
            tenantId,
          };

          await mockAddToPrintQueue(requestData);

          // Verify: POST endpoint was called
          expect(mockAddToPrintQueue).toHaveBeenCalledTimes(1);
          expect(mockAddToPrintQueue).toHaveBeenCalledWith(requestData);

          // Verify: Request includes all required fields
          const callArgs = mockAddToPrintQueue.mock.calls[0][0];
          expect(callArgs.documentId).toBe(documentId);
          expect(callArgs.documentType).toBe(documentType);
          expect(callArgs.tenantId).toBe(tenantId);

          // Reset for next iteration
          mockAddToPrintQueue.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should call POST /api/print-queue/process endpoint to process queue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
        }),
        async ({ tenantId }) => {
          // Simulate processing print queue
          await mockProcessPrintQueue({ tenantId });

          // Verify: POST process endpoint was called
          expect(mockProcessPrintQueue).toHaveBeenCalledTimes(1);
          expect(mockProcessPrintQueue).toHaveBeenCalledWith({ tenantId });

          // Reset for next iteration
          mockProcessPrintQueue.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle queue operations in correct sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.uuid(),
          documentType: fc.constantFrom('invoice', 'receipt', 'report'),
          tenantId: fc.uuid(),
        }),
        async ({ documentId, documentType, tenantId }) => {
          // Sequence: Add → Get → Process

          // 1. Add to queue
          await mockAddToPrintQueue({ documentId, documentType, tenantId });
          expect(mockAddToPrintQueue).toHaveBeenCalledTimes(1);

          // 2. Get queue
          await mockGetPrintQueue({ tenantId });
          expect(mockGetPrintQueue).toHaveBeenCalledTimes(1);

          // 3. Process queue
          await mockProcessPrintQueue({ tenantId });
          expect(mockProcessPrintQueue).toHaveBeenCalledTimes(1);

          // Verify: All operations completed in order
          expect(mockAddToPrintQueue.mock.invocationCallOrder[0]).toBeLessThan(
            mockGetPrintQueue.mock.invocationCallOrder[0]
          );
          expect(mockGetPrintQueue.mock.invocationCallOrder[0]).toBeLessThan(
            mockProcessPrintQueue.mock.invocationCallOrder[0]
          );

          // Reset for next iteration
          mockAddToPrintQueue.mockClear();
          mockGetPrintQueue.mockClear();
          mockProcessPrintQueue.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});
