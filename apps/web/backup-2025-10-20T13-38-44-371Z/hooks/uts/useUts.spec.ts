import { vi, describe, it, expect } from 'vitest';

vi.mock('@/services/uts/uts.service', () => ({
  default: {
    startBulkRegistration: vi.fn(() => Promise.resolve({ jobId: 'job-123' }))
  }
}));

import utsService from '@/services/uts/uts.service';

describe('uts.service (mock)', () => {
  it('startBulkRegistration is callable', async () => {
    const res = await (utsService as any).startBulkRegistration({ rows: [{ serial: 's1' }] });
    expect((utsService as any).startBulkRegistration).toHaveBeenCalled();
    expect(res).toEqual({ jobId: 'job-123' });
  });
});
