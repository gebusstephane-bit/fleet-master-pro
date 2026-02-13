'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUsers, getUserById, createUser, updateUser, toggleUserStatus, deleteUser, updateNotificationPreferences, type CreateUserData, type UpdateUserData } from '@/actions/users';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT';
  is_active: boolean;
  email_notifications: boolean;
  company_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface NotificationPreferences {
  alert_maintenance: boolean;
  alert_inspection: boolean;
  alert_routes: boolean;
  alert_documents_expiry: boolean;
  alert_fuel: boolean;
  alert_critical_only: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
}

// Hook pour récupérer tous les utilisateurs
export function useUsers(companyId?: string) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await getUsers(companyId);
    
    if (result.error) {
      setError(result.error);
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.data) {
      setUsers(result.data as User[]);
    }
    
    setIsLoading(false);
  }, [companyId, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    data: users,
    isLoading,
    error,
    refetch: fetchUsers,
  };
}

// Hook pour récupérer un utilisateur spécifique
export function useUser(userId: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const result = await getUserById(userId);
    
    if (result.error) {
      setError(result.error);
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.data) {
      setUser(result.data as User);
      if (result.data.user_notification_preferences) {
        setPreferences(result.data.user_notification_preferences[0] as NotificationPreferences);
      }
    }
    
    setIsLoading(false);
  }, [userId, toast]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    data: user,
    preferences,
    isLoading,
    error,
    refetch: fetchUser,
  };
}

// Hook pour créer un utilisateur
export function useCreateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const create = async (data: CreateUserData, creatorId: string) => {
    setIsLoading(true);
    
    const result = await createUser(data, creatorId);
    
    if (result.error) {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
      setIsLoading(false);
      return { success: false, error: result.error };
    }
    
    toast({
      title: 'Succès',
      description: 'Utilisateur créé avec succès',
    });
    
    setIsLoading(false);
    return { success: true, data: result.data };
  };

  return { create, isLoading };
}

// Hook pour mettre à jour un utilisateur
export function useUpdateUser() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const update = async (data: UpdateUserData, updaterId: string) => {
    setIsLoading(true);
    
    const result = await updateUser(data, updaterId);
    
    if (result.error) {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
      setIsLoading(false);
      return { success: false, error: result.error };
    }
    
    toast({
      title: 'Succès',
      description: 'Utilisateur mis à jour avec succès',
    });
    
    setIsLoading(false);
    return { success: true, data: result.data };
  };

  return { update, isLoading };
}

// Hook pour activer/désactiver un utilisateur
export function useToggleUserStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const toggle = async (userId: string, isActive: boolean, actorId: string) => {
    setIsLoading(true);
    
    const result = await toggleUserStatus(userId, isActive, actorId);
    
    if (result.error) {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
      setIsLoading(false);
      return { success: false, error: result.error };
    }
    
    toast({
      title: 'Succès',
      description: isActive ? 'Utilisateur activé' : 'Utilisateur désactivé',
    });
    
    setIsLoading(false);
    return { success: true };
  };

  return { toggle, isLoading };
}

// Hook pour supprimer un utilisateur
export function useDeleteUser() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const remove = async (userId: string, actorId: string) => {
    setIsLoading(true);
    
    const result = await deleteUser(userId, actorId);
    
    if (result.error) {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
      setIsLoading(false);
      return { success: false, error: result.error };
    }
    
    toast({
      title: 'Succès',
      description: 'Utilisateur supprimé avec succès',
    });
    
    setIsLoading(false);
    return { success: true };
  };

  return { remove, isLoading };
}

// Hook pour mettre à jour les préférences de notifications
export function useUpdateNotificationPreferences() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const update = async (userId: string, preferences: Partial<NotificationPreferences>) => {
    setIsLoading(true);
    
    const result = await updateNotificationPreferences(userId, preferences);
    
    if (result.error) {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
      setIsLoading(false);
      return { success: false, error: result.error };
    }
    
    toast({
      title: 'Succès',
      description: 'Préférences mises à jour',
    });
    
    setIsLoading(false);
    return { success: true, data: result.data };
  };

  return { update, isLoading };
}

// Helper pour vérifier les permissions
export function useUserPermissions(currentUser: User | null) {
  if (!currentUser) {
    return {
      canManageUsers: false,
      canCreateUsers: false,
      canDeleteUsers: false,
      canEditUsers: false,
      canCreateAdmin: false,
      canCreateDirecteur: false,
    };
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const isDirecteur = currentUser.role === 'DIRECTEUR';
  const isAgent = currentUser.role === 'AGENT_DE_PARC';

  return {
    canManageUsers: isAdmin || isDirecteur,
    canCreateUsers: isAdmin || isDirecteur,
    canDeleteUsers: isAdmin,
    canEditUsers: isAdmin || isDirecteur,
    canCreateAdmin: isAdmin,
    canCreateDirecteur: isAdmin,
    canCreateAgent: isAdmin || isDirecteur,
    canCreateExploitant: isAdmin || isDirecteur,
    isAdmin,
    isDirecteur,
    isAgent,
    isExploitant: currentUser.role === 'EXPLOITANT',
  };
}
