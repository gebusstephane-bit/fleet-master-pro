'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export interface CompanyData {
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
    
    const adminSupabase = createAdminClient();
    
    // Get user's company_id from profiles
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();
    
    logger.info('[getCompany] profile result', { profile, error: profileError });
    
    if (profileError || !profile?.company_id) {
      return { error: 'Entreprise non trouvée' };
    }
    
    // Get company data
    const { data: company, error: companyError } = await adminSupabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
    
    logger.info('[getCompany] company result', { company, error: companyError });
    
    if (companyError) {
      return { error: 'Erreur lors du chargement: ' + companyError.message };
    }
    
    return { data: company };
  } catch (error: any) {
    logger.error('[getCompany] error', error);
    return { error: 'Erreur serveur: ' + error.message };
  }
}

export async function updateCompany(userId: string, data: Partial<CompanyData>) {
  try {
    const adminSupabase = createAdminClient();
    
    // Check permissions - only ADMIN or DIRECTEUR can update
    const { data: profile, error: profileError } = await adminSupabase
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
    
    // Update company
    const { data: company, error: companyError } = await adminSupabase
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
    const adminSupabase = createAdminClient();
    
    // Check permissions
    const { data: profile, error: profileError } = await adminSupabase
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
    
    // Upload to Supabase Storage
    const { error: uploadError } = await adminSupabase.storage
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
    const { data: { publicUrl } } = adminSupabase.storage
      .from('logos')
      .getPublicUrl(filePath);
    
    // Update company with new logo URL
    const { error: updateError } = await adminSupabase
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
  } catch (error: any) {
    logger.error('Server error', error as Error);
    return { error: 'Erreur serveur: ' + error.message };
  }
}

export async function deleteCompanyLogo(userId: string) {
  try {
    const adminSupabase = createAdminClient();
    
    // Check permissions
    const { data: profile, error: profileError } = await adminSupabase
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
    
    // Update company to remove logo
    const { error: updateError } = await adminSupabase
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
  } catch (error: any) {
    logger.error('Server error', error as Error);
    return { error: 'Erreur serveur: ' + error.message };
  }
}
