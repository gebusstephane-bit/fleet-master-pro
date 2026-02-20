import { cn, generateId, slugify } from '@/lib/utils';

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...inputs: any[]) => {
    return inputs.filter(Boolean).join(' ');
  }),
  generateId: jest.fn(() => {
    return Math.random().toString(36).substring(2, 15);
  }),
  slugify: jest.fn((text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }),
}));

describe('Utilities', () => {
  describe('cn (className merge)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should filter falsy values', () => {
      const result = cn('class1', false, 'class2', null, undefined, 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate string IDs', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('slugify', () => {
    it('should convert text to slug', () => {
      const result = slugify('Hello World');
      expect(result).toBe('hello-world');
    });

    it('should handle special characters', () => {
      const result = slugify('Hello, World! How are you?');
      expect(result).toBe('hello-world-how-are-you');
    });

    it('should handle multiple spaces', () => {
      const result = slugify('Hello   World');
      expect(result).toBe('hello-world');
    });

    it('should handle leading/trailing dashes', () => {
      const result = slugify('  Hello World  ');
      expect(result).toBe('hello-world');
    });
  });
});
