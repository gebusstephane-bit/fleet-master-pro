/**
 * Actions Server pour SuperAdmin
 * Fonctions sécurisées pour la gestion de la plateforme
 */

'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// Vérification SuperAdmin
async function verifySuperAdmin() {
  const supabase = createAdminClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || session.user.email !== 'contact@fleet-master.fr') {
    throw new Error('Unauthorized');
  }
  
  return session;
}

// ==================== CLIENTS ====================

export async function getCompanies(filters?: { search?: string; plan?: string; status?: string }) {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  let query = supabase
    .from('companies')
    .select('*, profiles(count), subscriptions(*)')
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  if (filters?.plan && filters.plan !== 'all') {
    query = query.eq('subscription_plan', filters.plan);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('subscription_status', filters.status);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function updateCompanyStatus(companyId: string, status: string) {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('companies')
    .update({ subscription_status: status })
    .eq('id', companyId);

  if (error) throw error;
  
  revalidatePath('/superadmin/clients');
  return { success: true };
}

export async function deleteCompany(companyId: string) {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  // Suppression en cascade via la DB
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (error) throw error;
  
  revalidatePath('/superadmin/clients');
  return { success: true };
}

// ==================== ABONNEMENTS ====================

export async function getSubscriptions() {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, companies:company_id(name, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSubscriptionPlan(subscriptionId: string, plan: string) {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  const limits: Record<string, { vehicle: number; user: number }> = {
    STARTER: { vehicle: 1, user: 1 },
    BASIC: { vehicle: 5, user: 2 },
    PRO: { vehicle: 15, user: 5 },
    ENTERPRISE: { vehicle: 999, user: 999 },
  };

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan,
      vehicle_limit: limits[plan]?.vehicle || 1,
      user_limit: limits[plan]?.user || 1,
    })
    .eq('id', subscriptionId);

  if (error) throw error;
  
  revalidatePath('/superadmin/subscriptions');
  return { success: true };
}

// ==================== STATS DASHBOARD ====================

export async function getDashboardStats() {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  const [
    { count: totalCompanies },
    { count: totalUsers },
    { count: activeSubscriptions },
    { count: trialSubscriptions },
    { data: recentCompanies },
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'TRIALING'),
    supabase.from('companies').select('id, name, email, created_at, subscription_plan').order('created_at', { ascending: false }).limit(5),
  ]);

  return {
    totalCompanies: totalCompanies || 0,
    totalUsers: totalUsers || 0,
    activeSubscriptions: activeSubscriptions || 0,
    trialSubscriptions: trialSubscriptions || 0,
    recentCompanies: recentCompanies || [],
  };
}

// ==================== SUPPORT TICKETS ====================

export async function getSupportTickets() {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, companies:company_id(name, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateTicketStatus(ticketId: string, status: string) {
  await verifySuperAdmin();
  
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) throw error;
  
  revalidatePath('/superadmin/support');
  return { success: true };
}
