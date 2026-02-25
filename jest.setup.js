import '@testing-library/jest-dom';

// ============================================================================
// Mocks pour API Request/Response (pour les tests de routes API)
// ============================================================================

class MockHeaders {
  constructor(init) {
    this.headers = new Map();
    if (init) {
      if (typeof init === 'object' && !Array.isArray(init)) {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), String(value));
        });
      }
    }
  }
  get(name) {
    return this.headers.get(name.toLowerCase()) || null;
  }
  set(name, value) {
    this.headers.set(name.toLowerCase(), value);
  }
  has(name) {
    return this.headers.has(name.toLowerCase());
  }
}

class MockRequest {
  constructor(input, init = {}) {
    this.input = input;
    this.headers = new MockHeaders(init.headers);
    this.method = init.method || 'GET';
    this.url = typeof input === 'string' ? input : '';
  }
  async text() {
    return typeof this.input === 'string' ? this.input : '';
  }
  async json() {
    return JSON.parse(await this.text());
  }
}

class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || '';
    this.headers = new MockHeaders(init.headers);
  }
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
  static json(body, init = {}) {
    return new MockResponse(body, init);
  }
}

// Définir les mocks globaux
global.MockHeaders = MockHeaders;
global.Request = MockRequest;
global.Response = MockResponse;
global.Headers = MockHeaders;

// Mock Next.js server
jest.mock('next/server', () => {
  class MockNextRequest extends MockRequest {}
  class MockNextResponse extends MockResponse {
    static json(body, init = {}) {
      return new MockNextResponse(body, init);
    }
    static redirect(url, init = {}) {
      return new MockNextResponse(null, { ...init, status: 307, headers: { location: url } });
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

// ============================================================================
// Mock Next.js router
// ============================================================================
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// ============================================================================
// Mock Supabase
// ============================================================================
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      data: null,
      error: null,
    })),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

// ============================================================================
// Mock next/headers
// ============================================================================
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
  })),
}));
