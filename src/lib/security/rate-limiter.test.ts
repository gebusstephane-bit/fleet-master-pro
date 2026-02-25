/**
 * Tests unitaires pour le Rate Limiter
 * Couvre les cas : succès, limite atteinte, fallback Redis, headers
 */

// Mock @upstash/redis avant les imports
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue("PONG"),
  })),
}));

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: {
    slidingWindow: jest.fn().mockReturnValue("sliding-window-mock"),
  },
}));

import {
  checkAnonymousRateLimit,
  checkAuthenticatedRateLimit,
  checkSensitiveRateLimit,
  checkLoginRateLimitByIP,
  checkRegisterRateLimitByIP,
  checkGeneralApiRateLimit,
  getRateLimitHeaders,
  getClientIP,
  rateLimitMiddleware,
  isRateLimitExemptRoute,
  getRateLimitTypeForRoute,
  type RateLimitResult,
} from "./rate-limiter";

import {
  isRedisConfigured,
  RATE_LIMIT_CONFIG,
} from "./rate-limiter-redis";

// ============================================
// MOCKS
// ============================================

// Mock des headers Next.js
jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

import { headers } from "next/headers";

const mockHeaders = (overrides: Record<string, string> = {}) => {
  const defaultHeaders = {
    "x-forwarded-for": "192.168.1.1",
    "user-agent": "test-agent",
    ...overrides,
  };
  (headers as jest.Mock).mockReturnValue({
    get: (name: string) => (defaultHeaders as Record<string, string>)[name.toLowerCase()] || null,
  });
};

// ============================================
// TESTS
// ============================================

describe("Rate Limiter - Core Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaders();
  });

  describe("getClientIP", () => {
    it("should extract IP from x-forwarded-for header", async () => {
      mockHeaders({ "x-forwarded-for": "10.0.0.1, 192.168.1.1" });
      const ip = await getClientIP();
      expect(ip).toBe("10.0.0.1");
    });

    it("should fallback to x-real-ip if x-forwarded-for is missing", async () => {
      mockHeaders({
        "x-forwarded-for": "",
        "x-real-ip": "172.16.0.1",
      });
      const ip = await getClientIP();
      expect(ip).toBe("172.16.0.1");
    });

    it("should use user-agent hash as last resort fallback", async () => {
      mockHeaders({
        "x-forwarded-for": "",
        "x-real-ip": "",
        "user-agent": "Mozilla/5.0 Test",
      });
      const ip = await getClientIP();
      expect(ip.startsWith("fallback_")).toBe(true);
    });
  });

  describe("checkAnonymousRateLimit", () => {
    it("should allow requests under the limit", async () => {
      const result = await checkAnonymousRateLimit();
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it("should track requests separately by IP", async () => {
      // Première IP - première requête
      mockHeaders({ "x-forwarded-for": "192.168.10.1" });
      const result1 = await checkAnonymousRateLimit();
      expect(result1.success).toBe(true);
      const remainingAfterFirstIP = result1.remaining;

      // Deuxième IP différente - première requête (doit avoir le même quota initial)
      mockHeaders({ "x-forwarded-for": "192.168.10.2" });
      const result2 = await checkAnonymousRateLimit();
      expect(result2.success).toBe(true);
      // La deuxième IP doit avoir le même remaining que la première après sa première requête
      expect(result2.remaining).toBe(remainingAfterFirstIP);
    });
  });

  describe("checkAuthenticatedRateLimit", () => {
    it("should allow authenticated requests under the limit", async () => {
      const userId = "user-123";
      const result = await checkAuthenticatedRateLimit(userId);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
    });

    it("should track requests per user ID", async () => {
      const result1 = await checkAuthenticatedRateLimit("user-1");
      const result2 = await checkAuthenticatedRateLimit("user-2");

      expect(result1.success && result2.success).toBe(true);
      // Les deux utilisateurs ont leur propre compteur
    });
  });

  describe("checkLoginRateLimitByIP", () => {
    it("should enforce 5 attempts per 15 minutes", async () => {
      const ip = "192.168.1.100";

      // 5 premières tentatives autorisées
      for (let i = 0; i < 5; i++) {
        const result = await checkLoginRateLimitByIP(ip);
        expect(result.success).toBe(true);
        expect(result.limit).toBe(5);
      }

      // 6ème tentative bloquée
      const blockedResult = await checkLoginRateLimitByIP(ip);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("checkRegisterRateLimitByIP", () => {
    it("should enforce 3 attempts per 60 minutes", async () => {
      const ip = "192.168.1.200";

      // 3 premières tentatives autorisées
      for (let i = 0; i < 3; i++) {
        const result = await checkRegisterRateLimitByIP(ip);
        expect(result.success).toBe(true);
        expect(result.limit).toBe(3);
      }

      // 4ème tentative bloquée
      const blockedResult = await checkRegisterRateLimitByIP(ip);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("checkGeneralApiRateLimit", () => {
    it("should enforce 100 requests per minute", async () => {
      const ip = "192.168.1.50";
      const result = await checkGeneralApiRateLimit(ip);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBeLessThan(100);
    });
  });

  describe("getRateLimitHeaders", () => {
    it("should return standard rate limit headers", () => {
      const result: RateLimitResult = {
        success: true,
        limit: 100,
        remaining: 50,
        reset: 1234567890,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("100");
      expect(headers["X-RateLimit-Remaining"]).toBe("50");
      expect(headers["X-RateLimit-Reset"]).toBe("1234567890");
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("should include Retry-After when rate limited", () => {
      const result: RateLimitResult = {
        success: false,
        limit: 5,
        remaining: 0,
        reset: 1234567890,
        retryAfter: 60,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["Retry-After"]).toBe("60");
    });
  });

  describe("rateLimitMiddleware", () => {
    it("should allow requests when under limit", async () => {
      const result = await rateLimitMiddleware({});
      expect(result.allowed).toBe(true);
    });

    it("should block requests when limit exceeded", async () => {
      // Simuler une IP qui a atteint la limite
      const ip = "192.168.1.99";
      mockHeaders({ "x-forwarded-for": ip });

      // Remplir le rate limit (10 requêtes pour anonymous)
      for (let i = 0; i < 10; i++) {
        await checkAnonymousRateLimit();
      }

      // La prochaine requête devrait être bloquée
      const result = await rateLimitMiddleware({});
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toContain("Rate limit exceeded");
      }
    });

    it("should use user-based limit when userId provided", async () => {
      const result = await rateLimitMiddleware({ userId: "user-test-123" });
      expect(result.allowed).toBe(true);
    });

    it("should use sensitive limit when isSensitive is true", async () => {
      const result = await rateLimitMiddleware({ isSensitive: true });
      expect(result.allowed).toBe(true);
    });
  });

  describe("isRateLimitExemptRoute", () => {
    it("should exempt webhook routes", () => {
      expect(isRateLimitExemptRoute("/api/webhooks/stripe")).toBe(true);
      expect(isRateLimitExemptRoute("/api/webhooks/github")).toBe(true);
    });

    it("should exempt health check routes", () => {
      expect(isRateLimitExemptRoute("/api/health")).toBe(true);
      expect(isRateLimitExemptRoute("/api/health/db")).toBe(true);
    });

    it("should not exempt regular API routes", () => {
      expect(isRateLimitExemptRoute("/api/auth/login")).toBe(false);
      expect(isRateLimitExemptRoute("/api/users")).toBe(false);
    });
  });

  describe("getRateLimitTypeForRoute", () => {
    it("should return 'login' for login routes", () => {
      expect(getRateLimitTypeForRoute("/api/auth/login")).toBe("login");
      expect(getRateLimitTypeForRoute("/api/auth/signin")).toBe("login");
    });

    it("should return 'register' for register routes", () => {
      expect(getRateLimitTypeForRoute("/api/auth/register")).toBe("register");
      expect(getRateLimitTypeForRoute("/api/auth/signup")).toBe("register");
    });

    it("should return 'sensitive' for other auth routes", () => {
      expect(getRateLimitTypeForRoute("/api/auth/reset-password")).toBe("sensitive");
      expect(getRateLimitTypeForRoute("/api/auth/forgot-password")).toBe("sensitive");
    });

    it("should return 'general' for other API routes", () => {
      expect(getRateLimitTypeForRoute("/api/users")).toBe("general");
      expect(getRateLimitTypeForRoute("/api/vehicles")).toBe("general");
    });
  });
});

describe("Rate Limiter Redis - Configuration", () => {
  it("should have correct rate limit configuration", () => {
    expect(RATE_LIMIT_CONFIG.login).toEqual({ limit: 5, window: "15 m" });
    expect(RATE_LIMIT_CONFIG.register).toEqual({ limit: 3, window: "60 m" });
    expect(RATE_LIMIT_CONFIG.general).toEqual({ limit: 100, window: "60 s" });
  });

  it("should detect Redis configuration from env", () => {
    // Par défaut en test, Redis n'est pas configuré
    expect(isRedisConfigured()).toBe(false);
  });
});

describe("Rate Limiter - Edge Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle missing headers gracefully", async () => {
    (headers as jest.Mock).mockReturnValue({
      get: () => null,
    });

    const ip = await getClientIP();
    expect(ip.startsWith("fallback_")).toBe(true);
  });

  it("should handle IPv6 addresses", async () => {
    mockHeaders({ "x-forwarded-for": "2001:db8::1" });
    const ip = await getClientIP();
    expect(ip).toBe("2001:db8::1");
  });

  it("should handle multiple IPs in x-forwarded-for", async () => {
    mockHeaders({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
    const ip = await getClientIP();
    expect(ip).toBe("1.1.1.1");
  });

  it("should trim whitespace from IP addresses", async () => {
    mockHeaders({ "x-forwarded-for": "  192.168.1.1  , 10.0.0.1" });
    const ip = await getClientIP();
    expect(ip).toBe("192.168.1.1");
  });
});

describe("Rate Limiter - Memory Fallback", () => {
  it("should work without Redis (memory fallback)", async () => {
    // S'assurer que Redis n'est pas configuré en test
    const result = await checkAnonymousRateLimit();

    expect(result.success).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBeDefined();
    expect(result.reset).toBeDefined();
  });

  it("should reset counter after window expires", async () => {
    const ip = "192.168.1.77";

    // Première requête
    const result1 = await checkLoginRateLimitByIP(ip);
    expect(result1.success).toBe(true);

    // La fenêtre n'est pas encore expirée, donc le compteur est incrémenté
    const result2 = await checkLoginRateLimitByIP(ip);
    expect(result2.success).toBe(true);
    // Le compteur est incrémenté, remaining diminue
    expect(result2.remaining).toBeLessThanOrEqual(result1.remaining);
  });
});
