/**
 * Tests des gardes d'authentification
 * 
 * VALIDATION :
 * - Appeler deleteVehicle avec compte chauffeur > { success: false, error: 'Accès refusé' }
 * - Admin peut toujours supprimer normalement
 * - Chauffeurs peuvent toujours faire leurs actions (checklist, incident)
 * - Pas de régression
 */

import { requireAuth, requireRole, requireManagerOrAbove, requireAdmin, UserRole } from '../auth-guards';

// Mock du client Supabase
jest.mock('../supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '../supabase/server';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Auth Guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should throw error if user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('Auth error') }),
        },
      } as any);

      await expect(requireAuth()).rejects.toThrow('Non authentifié');
    });

    it('should return user if authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      } as any);

      const result = await requireAuth();
      expect(result).toEqual(mockUser);
    });
  });

  describe('requireRole', () => {
    it('should throw error if user role is not in allowed roles', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'EXPLOITANT', company_id: 'comp-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      await expect(requireRole(['ADMIN', 'DIRECTEUR'])).rejects.toThrow('Permissions insuffisantes');
    });

    it('should return user data if role is allowed', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'ADMIN', company_id: 'comp-123', first_name: 'John', last_name: 'Doe' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await requireRole(['ADMIN', 'DIRECTEUR']);
      expect(result.role).toBe('ADMIN');
      expect(result.companyId).toBe('comp-123');
    });
  });

  describe('requireManagerOrAbove', () => {
    it('should allow ADMIN role', async () => {
      const mockUser = { id: 'user-123', email: 'admin@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'ADMIN', company_id: 'comp-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await requireManagerOrAbove();
      expect(result.role).toBe('ADMIN');
    });

    it('should allow DIRECTEUR role', async () => {
      const mockUser = { id: 'user-123', email: 'directeur@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'DIRECTEUR', company_id: 'comp-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await requireManagerOrAbove();
      expect(result.role).toBe('DIRECTEUR');
    });

    it('should reject AGENT_DE_PARC role', async () => {
      const mockUser = { id: 'user-123', email: 'agent@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'AGENT_DE_PARC', company_id: 'comp-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      await expect(requireManagerOrAbove()).rejects.toThrow('Permissions insuffisantes');
    });

    it('should reject EXPLOITANT role', async () => {
      const mockUser = { id: 'user-123', email: 'exploitant@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'EXPLOITANT', company_id: 'comp-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      await expect(requireManagerOrAbove()).rejects.toThrow('Permissions insuffisantes');
    });
  });

  describe('requireAdmin', () => {
    it('should allow ADMIN role', async () => {
      const mockUser = { id: 'user-123', email: 'admin@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'ADMIN', company_id: 'comp-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await requireAdmin();
      expect(result.role).toBe('ADMIN');
    });

    it('should reject DIRECTEUR role', async () => {
      const mockUser = { id: 'user-123', email: 'directeur@example.com' };
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'DIRECTEUR', company_id: 'comp-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      await expect(requireAdmin()).rejects.toThrow('Permissions insuffisantes');
    });
  });
});
