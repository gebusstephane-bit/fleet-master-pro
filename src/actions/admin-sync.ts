'use server';

/**
 * Action pour synchroniser manuellement companies avec subscriptions
 * Utile si les données sont désynchronisées
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function syncCompanyWithSubscription(companyId?: string) {
  try {
    const supabase = createAdminClient();
    
    let query = supabase.from('subscriptions').select('company_id, plan, vehicle_limit, user_limit, status');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data: subscriptions, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    let updated = 0;
    for (const sub of subscriptions || []) {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_plan: sub.plan,
          subscription_status: sub.status?.toLowerCase(),
          max_vehicles: sub.vehicle_limit,
          max_drivers: sub.user_limit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.company_id);
      
      if (!updateError) {
        updated++;
      }
    }
    
    revalidatePath('/dashboard');
    revalidatePath('/settings/billing');
    
    return { 
      success: true, 
      message: `${updated} entreprise(s) synchronisée(s)`,
      updated 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

export async function getSubscriptionMismatch() {
  try {
    const supabase = createAdminClient();
    
    // Récupérer les incohérences
    const { data, error } = await supabase.rpc('check_subscription_sync');
    
    if (error) {
      // Fallback si la fonction RPC n'existe pas
      const { data: mismatches, error: queryError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          subscription_plan,
          max_vehicles,
          max_drivers,
          subscriptions:subscriptions!inner(plan, vehicle_limit, user_limit)
        `)
        .neq('subscription_plan', 'subscriptions.plan')
        .limit(100);
      
      if (queryError) {
        return { success: false, error: queryError.message };
      }
      
      return { success: true, mismatches: mismatches || [] };
    }
    
    return { success: true, mismatches: data || [] };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}
