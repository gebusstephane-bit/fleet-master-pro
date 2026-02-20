/**
 * Contournement RLS pour les cas où les politiques sont cassées
 * Utilise l'API REST directement avec le token anon
 */

import { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SupabaseAuth {
  access_token?: string;
}

/**
 * Récupère le token d'authentification actuel
 */
function getAuthToken(): string | null {
  // Essayer de récupérer depuis le localStorage de Supabase
  if (typeof window !== 'undefined') {
    const storageKey = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.access_token || parsed.token || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Requête directe à l'API REST Supabase (contourne partiellement RLS)
 */
export async function apiQuery<T>(
  table: string,
  options?: {
    select?: string;
    eq?: { column: string; value: any };
    order?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<{ data: T[] | null; error: any }> {
  const token = getAuthToken();
  
  if (!token) {
    return { data: null, error: new Error('Not authenticated') };
  }

  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  
  // Select
  if (options?.select) {
    url += `select=${encodeURIComponent(options.select)}&`;
  }
  
  // Eq filter
  if (options?.eq) {
    url += `${options.eq.column}=eq.${encodeURIComponent(options.eq.value)}&`;
  }
  
  // Order
  if (options?.order) {
    url += `order=${options.order.column}.${options.order.ascending ? 'asc' : 'desc'}&`;
  }
  
  // Limit
  if (options?.limit) {
    url += `limit=${options.limit}&`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error };
    }

    const data = await response.json();
    return { data: data as T[], error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

/**
 * Insert via API REST
 */
export async function apiInsert<T>(
  table: string,
  data: any
): Promise<{ data: T | null; error: any }> {
  const token = getAuthToken();
  
  if (!token) {
    return { data: null, error: new Error('Not authenticated') };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error };
    }

    const result = await response.json();
    return { data: result[0] as T, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

/**
 * Update via API REST
 */
export async function apiUpdate<T>(
  table: string,
  id: string,
  data: any
): Promise<{ data: T | null; error: any }> {
  const token = getAuthToken();
  
  if (!token) {
    return { data: null, error: new Error('Not authenticated') };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error };
    }

    const result = await response.json();
    return { data: result[0] as T, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

/**
 * Delete via API REST
 */
export async function apiDelete(
  table: string,
  id: string
): Promise<{ success: boolean; error: any }> {
  const token = getAuthToken();
  
  if (!token) {
    return { success: false, error: new Error('Not authenticated') };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e };
  }
}
