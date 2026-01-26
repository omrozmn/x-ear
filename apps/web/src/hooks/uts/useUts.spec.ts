import { vi, describe, it, expect } from 'vitest';

vi.mock('@/services/uts/uts.service', () => ({
  default: {
    createUtRegistrationBulk: vi.fn(() => Promise.resolve({ jobId: 'job-123' }))
  }
}));

import utsService from '@/services/uts/uts.service';

interface MockedUtsService {
  createUtRegistrationBulk: ReturnType<typeof vi.fn>;
}

describe('uts.service (mock)', () => {
  it('createUtRegistrationBulk is callable', async () => {
    const res = await (utsService as unknown as MockedUtsService).createUtRegistrationBulk({ rows: [{ serial: 's1' }] });
    expect((utsService as unknown as MockedUtsService).createUtRegistrationBulk).toHaveBeenCalled();
    expect(res).toEqual({ jobId: 'job-123' });
  });
});
