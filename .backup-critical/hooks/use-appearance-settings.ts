'use client';

import { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { AppearanceSettings, defaultAppearanceSettings } from '@/types/appearance';
import { getAppearanceSettings, updateAppearanceSettings, resetAppearanceSettings } from '@/actions/appearance';
import { toast } from 'sonner';
// @ts-ignore
import { applyAppearanceToDOM } from '@/components/providers/appearance-provider';

export function useAppearanceSettings(userId: string) {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultAppearanceSettings as AppearanceSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  // Charger les préférences
  const loadSettings = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    const result = await getAppearanceSettings(userId);
    
    if (result.data && !result.error) {
      const dbSettings = result.data as any;
      const formattedSettings = {
        theme: dbSettings.theme || 'system',
        primaryColor: dbSettings.primary_color || '#3b82f6',
        customColor: dbSettings.custom_color,
        density: dbSettings.density || 'comfortable',
        font: dbSettings.font || 'inter',
        fontSize: dbSettings.font_size || 14,
        language: dbSettings.language || 'fr',
        dateFormat: dbSettings.date_format || 'DD/MM/YYYY',
        timeFormat: dbSettings.time_format || '24h',
        currency: dbSettings.currency || 'EUR',
        timezone: dbSettings.timezone || 'Europe/Paris',
        sidebarStyle: dbSettings.sidebar_style || 'default',
        sidebarAutoCollapse: dbSettings.sidebar_auto_collapse ?? true,
        sidebarIconsOnly: dbSettings.sidebar_icons_only ?? false,
        reduceMotion: dbSettings.reduce_motion ?? false,
        glassEffects: dbSettings.glass_effects ?? true,
        shadows: dbSettings.shadows ?? true,
      };
      setSettings(formattedSettings as AppearanceSettings);
      
      // Appliquer les settings au DOM
      applyAppearanceToDOM(formattedSettings as any);
    }
    
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Mettre à jour les préférences
  const updateSettings = async (newSettings: Partial<AppearanceSettings>) => {
    setIsSaving(true);
    
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    const result = await updateAppearanceSettings(userId, newSettings);
    
    if (result.error) {
      toast.error('Impossible de sauvegarder les préférences');
    }
    
    setIsSaving(false);
    return result;
  };

  // Réinitialiser
  const resetSettings = async () => {
    setIsSaving(true);
    
    setSettings(defaultAppearanceSettings as AppearanceSettings);
    
    const result = await resetAppearanceSettings(userId);
    
    if (result.error) {
      toast.error('Impossible de réinitialiser les préférences');
    } else {
      toast.success('Préférences réinitialisées');
    }
    
    setIsSaving(false);
    return result;
  };

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    resetSettings,
    refresh: loadSettings,
  };
}
