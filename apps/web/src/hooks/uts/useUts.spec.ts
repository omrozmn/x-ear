import { vi, describe, it, expect } from 'vitest';

vi.mock('@/services/uts/uts.service', () => ({
  default: {
    createUtRegistrationBulk: vi.fn(() => Promise.resolve({ jobId: 'job-123' }))
  }
}));

import utsService from '@/services/uts/uts.service';

describe('uts.service (mock)', () => {
  it('createUtRegistrationBulk is callable', async () => {
    const res = await (utsService as any).createUtRegistrationBulk({ rows: [{ serial: 's1' }] });
    expect((utsService as any).createUtRegistrationBulk).toHaveBeenCalled();
    expect(res).toEqual({ jobId: 'job-123' });
  });
});
