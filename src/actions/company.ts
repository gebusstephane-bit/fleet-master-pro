'use server';

import { revalidatePath } from 'next/cache';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export interface ICompanyData {
  id?: string;
  name: string;
  siret: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  logo_url?: string | null;
}

export async function getCompany(userId: string) {
  try {
    logger.info('[getCompany] userId', { userId });
    
    const supabase = await createClient();
    
    // Get user's company_id from profiles (RLS gère la sécurité)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();
    
    logger.info('[getCompany] profile result', { profile, error: profileError });
    
    if (profileError || !profile?.company_id) {
      return { error: 'Entreprise non trouvée' };
    }
    
    // Get company data (RLS gère la sécurité)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
    
    logger.info('[getCompany] company result', { company, error: companyError });
    
    if (companyError) {
      return { error: 'Erreur lors du chargement: ' + companyError.message };
    }
    
    return { data: company };
  } catch (error) {
    logger.error('[getCompany] error', error instanceof Error ? error : new Error(String(error)));
    return { error: 'Erreur serveur: ' + (error instanceof Error ? error.message : String(error)) };
  }
}

export async function updateCompany(userId: string, data: Partial<ICompanyData>) {
  try {
    const supabase = await createClient();
    
    // Check permissions - only ADMIN or DIRECTEUR can update (RLS gère la sécurité)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile?.company_id) {
      return { error: 'Entreprise non trouvée' };
    }
    
    if (!['ADMIN', 'DIRECTEUR'].includes(profile.role)) {
      return { error: 'Permissions insuffisantes' };
    }
    
    // Vérifier que l'entreprise existe (RLS gère la sécurité)
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('id', profile.company_id)
      .single();
    
    if (!existing) {
      return { error: 'Entreprise non trouvée' };
    }
    
    // Update company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .update({
        name: data.name,
        siret: data.siret,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
        phone: data.phone,
        email: data.email,
        logo_url: data.logo_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.company_id)
      .select()
      .single();
    
    if (companyError) {
      logger.error('Update error', companyError);
      return { error: 'Erreur lors de la mise à jour' };
    }
    
    revalidatePath('/settings/company');
    return { data: company };
  } catch (error) {
    logger.error('Server error', error as Error);
    return { error: 'Erreur serveur' };
  }
}

export async function uploadCompanyLogo(userId: string, formData: FormData) {
  try {
    const supabase = await createClient();
    
    // Check permissions (RLS gère la sécurité)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile?.company_id) {
      return { error: 'Entreprise non trouvée' };
    }
    
    if (!['ADMIN', 'DIRECTEUR'].includes(profile.role)) {
      return { error: 'Permissions insuffisantes' };
    }
    
    const file = formData.get('logo') as File;
    if (!file) {
      return { error: 'Aucun fichier sélectionné' };
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Type de fichier non supporté (JPEG, PNG, WebP, SVG)' };
    }
    
    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { error: 'Fichier trop volumineux (max 2Mo)' };
    }
    
    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.company_id}-${Date.now()}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;
    
    // Upload to Supabase Storage (utilise le client standard avec RLS)
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
    
    if (uploadError) {
      logger.error('Upload error', uploadError);
      return { error: 'Erreur lors du téléchargement' };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath);
    
    // Update company with new logo URL (RLS gère la sécurité)
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        logo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.company_id);
    
    if (updateError) {
      logger.error('Update error', updateError);
      return { error: 'Erreur lors de la mise à jour' };
    }
    
    revalidatePath('/settings/company');
    return { data: { logo_url: publicUrl } };
  } catch (error) {
    logger.error('Server error', error instanceof Error ? error : new Error(String(error)));
    return { error: 'Erreur serveur: ' + (error instanceof Error ? error.message : String(error)) };
  }
}

export async function deleteCompanyLogo(userId: string) {
  try {
    const supabase = await createClient();
    
    // Check permissions (RLS gère la sécurité)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile?.company_id) {
      return { error: 'Entreprise non trouvée' };
    }
    
    if (!['ADMIN', 'DIRECTEUR'].includes(profile.role)) {
      return { error: 'Permissions insuffisantes' };
    }
    
    // Vérifier que l'entreprise existe (RLS gère la sécurité)
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('id', profile.company_id)
      .single();
    
    if (!existing) {
      return { error: 'Entreprise non trouvée' };
    }
    
    // Update company to remove logo
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.company_id);
    
    if (updateError) {
      return { error: 'Erreur lors de la suppression' };
    }
    
    revalidatePath('/settings/company');
    return { success: true };
  } catch (error) {
    logger.error('Server error', error instanceof Error ? error : new Error(String(error)));
    return { error: 'Erreur serveur: ' + (error instanceof Error ? error.message : String(error)) };
  }
}

// ============================================
// PARAMÈTRES DU RAPPORT MENSUEL
// ============================================

export interface IMonthlyReportSettings {
  monthly_report_enabled: boolean;
  monthly_report_day: number; // 1, 5, ou -1 (dernier)
  monthly_report_recipients: 'ADMIN' | 'ADMIN_AND_DIRECTORS';
}

export async function updateMonthlyReportSettings(
  userId: string, 
  settings: IMonthlyReportSettings
) {
  try {
    const supabase = await createClient();
    
    // Check permissions - only ADMIN or DIRECTEUR can update (RLS gère la sécurité)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile?.company_id) {
      return { error: 'Entreprise non trouvée' };
    }
    
    if (!['ADMIN', 'DIRECTEUR'].includes(profile.role)) {
      return { error: 'Permissions insuffisantes' };
    }
    
    // Vérifier que l'entreprise existe (RLS gère la sécurité)
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('id', profile.company_id)
      .single();
    
    if (!existing) {
      return { error: 'Entreprise non trouvée' };
    }
    
    // Valider les valeurs
    const validDays = [1, 5, -1];
    const validRecipients = ['ADMIN', 'ADMIN_AND_DIRECTORS'];
    
    if (!validDays.includes(settings.monthly_report_day)) {
      return { error: 'Jour d\'envoi invalide' };
    }
    
    if (!validRecipients.includes(settings.monthly_report_recipients)) {
      return { error: 'Destinataires invalides' };
    }
    
    // Update company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .update({
        monthly_report_enabled: settings.monthly_report_enabled,
        monthly_report_day: settings.monthly_report_day,
        monthly_report_recipients: settings.monthly_report_recipients,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.company_id)
      .select()
      .single();
    
    if (companyError) {
      logger.error('Update monthly report settings error', companyError);
      return { error: 'Erreur lors de la mise à jour des paramètres' };
    }
    
    revalidatePath('/settings/company');
    return { data: company };
  } catch (error) {
    logger.error('Server error', error instanceof Error ? error : new Error(String(error)));
    return { error: 'Erreur serveur: ' + (error instanceof Error ? error.message : String(error)) };
  }
}
