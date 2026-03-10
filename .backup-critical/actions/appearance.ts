'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AppearanceSettings } from '@/types/appearance';

export async function getAppearanceSettings(userId: string) {
  try {
    const adminSupabase = createAdminClient();
    
    const { data, error } = await adminSupabase
      .from('user_appearance_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // Si pas de données, créer les paramètres par défaut
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: createError } = await adminSupabase
          .from('user_appearance_settings')
          .insert({ user_id: userId })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating appearance settings:', createError);
          return { data: null, error: createError.message };
        }
        
        return { data: newSettings, error: null };
      }
      
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error('getAppearanceSettings error:', error);
    return { data: null, error: error.message };
  }
}

export async function updateAppearanceSettings(
  userId: string, 
  settings: Partial<AppearanceSettings>
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Vérifier que l'utilisateur est authentifié
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { error: 'Non autorisé', data: null };
    }
    
    // Mapper les noms camelCase vers snake_case
    const dbSettings: any = {};
    if (settings.theme) dbSettings.theme = settings.theme;
    if (settings.primaryColor) dbSettings.primary_color = settings.primaryColor;
    if (settings.customColor) dbSettings.custom_color = settings.customColor;
    if (settings.density) dbSettings.density = settings.density;
    if (settings.font) dbSettings.font = settings.font;
    if (settings.fontSize) dbSettings.font_size = settings.fontSize;
    if (settings.language) dbSettings.language = settings.language;
    if (settings.dateFormat) dbSettings.date_format = settings.dateFormat;
    if (settings.timeFormat) dbSettings.time_format = settings.timeFormat;
    if (settings.currency) dbSettings.currency = settings.currency;
    if (settings.timezone) dbSettings.timezone = settings.timezone;
    if (settings.sidebarStyle) dbSettings.sidebar_style = settings.sidebarStyle;
    if (settings.sidebarAutoCollapse !== undefined) dbSettings.sidebar_auto_collapse = settings.sidebarAutoCollapse;
    if (settings.sidebarIconsOnly !== undefined) dbSettings.sidebar_icons_only = settings.sidebarIconsOnly;
    if (settings.reduceMotion !== undefined) dbSettings.reduce_motion = settings.reduceMotion;
    if (settings.glassEffects !== undefined) dbSettings.glass_effects = settings.glassEffects;
    if (settings.shadows !== undefined) dbSettings.shadows = settings.shadows;
    
    dbSettings.updated_at = new Date().toISOString();
    
    // Vérifier si l'entrée existe déjà
    const { data: existing } = await adminSupabase
      .from('user_appearance_settings')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    let result;
    if (existing) {
      // Mettre à jour
      result = await adminSupabase
        .from('user_appearance_settings')
        .update(dbSettings)
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Insérer
      result = await adminSupabase
        .from('user_appearance_settings')
        .insert({
          user_id: userId,
          ...dbSettings,
        })
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Error updating appearance settings:', result.error);
      return { error: result.error.message, data: null };
    }
    
    revalidatePath('/settings/appearance');
    
    return { data: result.data, error: null };
  } catch (error: any) {
    console.error('updateAppearanceSettings error:', error);
    return { error: error.message, data: null };
  }
}

export async function resetAppearanceSettings(userId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Vérifier que l'utilisateur est authentifié
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { error: 'Non autorisé', data: null };
    }
    
    const { data, error } = await adminSupabase
      .from('user_appearance_settings')
      .update({
        theme: 'system',
        primary_color: '#3b82f6',
        custom_color: null,
        density: 'comfortable',
        font: 'inter',
        font_size: 14,
        language: 'fr',
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        currency: 'EUR',
        timezone: 'Europe/Paris',
        sidebar_style: 'default',
        sidebar_auto_collapse: true,
        sidebar_icons_only: false,
        reduce_motion: false,
        glass_effects: true,
        shadows: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error resetting appearance settings:', error);
      return { error: error.message, data: null };
    }
    
    revalidatePath('/settings/appearance');
    
    return { data, error: null };
  } catch (error: any) {
    console.error('resetAppearanceSettings error:', error);
    return { error: error.message, data: null };
  }
}

export async function exportAppearanceSettings(userId: string) {
  try {
    const { data, error } = await getAppearanceSettings(userId);
    
    if (error || !data) {
      return { error: error || 'No settings found', data: null };
    }
    
    // Mapper les données pour l'export
    const exportData = {
      theme: data.theme,
      primaryColor: data.primary_color,
      customColor: data.custom_color,
      density: data.density,
      font: data.font,
      fontSize: data.font_size,
      language: data.language,
      dateFormat: data.date_format,
      timeFormat: data.time_format,
      currency: data.currency,
      timezone: data.timezone,
      sidebarStyle: data.sidebar_style,
      sidebarAutoCollapse: data.sidebar_auto_collapse,
      sidebarIconsOnly: data.sidebar_icons_only,
      reduceMotion: data.reduce_motion,
      glassEffects: data.glass_effects,
      shadows: data.shadows,
      exportedAt: new Date().toISOString(),
    };
    
    return { data: exportData, error: null };
  } catch (error: any) {
    console.error('exportAppearanceSettings error:', error);
    return { error: error.message, data: null };
  }
}
