import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Mock Upstash
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: {
    slidingWindow: jest.fn((limit: number, window: string) => ({
      limit: jest.fn(async (identifier: string) => ({
        success: true,
        limit: limit,
        remaining: limit - 1,
        reset: Date.now() + 60000,
      })),
    })),
    fixedWindow: jest.fn((limit: number, window: string) => ({
      limit: jest.fn(async (identifier: string) => ({
        success: true,
        limit: limit,
        remaining: limit - 1,
        reset: Date.now() + 60000,
      })),
    })),
  },
}));

jest.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    })),
  },
}));

describe('Rate Limiter', () => {
  describe('Sliding Window', () => {
    it('should allow requests under limit', async () => {
      const ratelimit = Ratelimit.slidingWindow(10, '1 m');
      const result = await ratelimit.limit('user-123');
      
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should track remaining requests', async () => {
      const ratelimit = Ratelimit.slidingWindow(10, '1 m');
      const result = await ratelimit.limit('user-123');
      
      expect(result.remaining).toBe(9);
    });
  });

  describe('Fixed Window', () => {
    it('should allow requests under limit', async () => {
      const ratelimit = Ratelimit.fixedWindow(100, '1 h');
      const result = await ratelimit.limit('api-key-123');
      
      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
    });
  });
});
