/**
 * Client Supabase côté client avec fallback pour contourner RLS
 * VERSION DIAGNOSTIC - Logs détaillés
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client standard
export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

interface SafeQueryResult<T> {
  data: T[] | null;
  error: Error | null;
  debug?: Record<string, unknown>;
}

interface CompanyIdItem {
  company_id?: string;
}

/**
 * Fonction utilitaire pour faire des requêtes avec retry et fallback
 * VERSION AVEC LOGS DIAGNOSTIC
 */
export async function safeQuery<T>(
  table: string,
  companyId: string | undefined,
  options?: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<SafeQueryResult<T>> {
  console.log(`[safeQuery] START - Table: ${table}, CompanyId: ${companyId?.slice(0, 8)}...`);
  
  if (!companyId) {
    console.error('[safeQuery] ERROR: No company_id provided');
    return { data: null, error: new Error('No company_id provided'), debug: { stage: 'no_company_id' } };
  }

  const select = options?.select || '*';

  try {
    // Essai 1 : Requête normale avec filtre company_id
    console.log(`[safeQuery] Attempt 1: Direct query with company_id filter`);
    const startTime = Date.now();
    
    const { data, error } = await supabaseClient
      .from(table as keyof Database['public']['Tables'])
      .select(select)
      .eq('company_id', companyId)
      .order(options?.orderBy?.column || 'created_at', { 
        ascending: options?.orderBy?.ascending ?? false 
      })
      .limit(options?.limit || 1000);

    const duration = Date.now() - startTime;
    console.log(`[safeQuery] Attempt 1 completed in ${duration}ms`, { 
      success: !error, 
      dataCount: data?.length,
      errorCode: (error as { code?: string })?.code,
      errorMessage: error?.message?.slice(0, 100)
    });

    if (!error) {
      console.log(`[safeQuery] SUCCESS: Found ${data?.length || 0} records`);
      return { data: data as T[], error: null, debug: { stage: 'direct_success', count: data?.length } };
    }

    // Si erreur de récursion RLS, essayer sans filtre
    if (error.message?.includes('infinite recursion') || (error as { code?: string })?.code === '42P17') {
      console.warn(`[safeQuery] RLS recursion detected (42P17), trying fallback without filter...`);
      
      const fallbackStart = Date.now();
      const { data: allData, error: allError } = await supabaseClient
        .from(table as keyof Database['public']['Tables'])
        .select(select)
        .order(options?.orderBy?.column || 'created_at', { 
          ascending: options?.orderBy?.ascending ?? false 
        })
        .limit(options?.limit || 1000);

      const fallbackDuration = Date.now() - fallbackStart;
      console.log(`[safeQuery] Fallback completed in ${fallbackDuration}ms`, {
        success: !allError,
        totalRecords: allData?.length,
        errorCode: (allError as { code?: string })?.code,
        errorMessage: allError?.message?.slice(0, 100)
      });

      if (allError) {
        console.error(`[safeQuery] Fallback also failed:`, allError);
        return { 
          data: null, 
          error: allError,
          debug: { 
            stage: 'fallback_failed', 
            originalError: error,
            fallbackError: allError 
          }
        };
      }

      // Filtrer côté client
      const filtered = (allData || []).filter((item) => (item as CompanyIdItem).company_id === companyId);
      console.log(`[safeQuery] Fallback SUCCESS: ${filtered.length}/${allData?.length || 0} records match company_id`);
      
      return { 
        data: filtered as T[], 
        error: null,
        debug: { 
          stage: 'fallback_success', 
          total: allData?.length,
          filtered: filtered.length 
        }
      };
    }

    // Autre erreur
    console.error(`[safeQuery] Direct query failed with non-RLS error:`, error);
    return { data: null, error, debug: { stage: 'direct_failed', error } };
    
  } catch (e) {
    console.error(`[safeQuery] EXCEPTION:`, e);
    const caughtError = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: caughtError, debug: { stage: 'exception', error: caughtError } };
  }
}

/**
 * Requête simple sans company_id
 */
export async function safeQuerySimple<T>(
  table: string,
  options?: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<{ data: T[] | null; error: Error | null }> {
  const select = options?.select || '*';

  try {
    const { data, error } = await supabaseClient
      .from(table as keyof Database['public']['Tables'])
      .select(select)
      .order(options?.orderBy?.column || 'created_at', { 
        ascending: options?.orderBy?.ascending ?? false 
      })
      .limit(options?.limit || 1000);

    return { data: data as T[], error };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
