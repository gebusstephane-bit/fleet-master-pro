'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppearanceSettings, defaultAppearanceSettings } from '@/types/appearance';
import { updateAppearanceSettings } from '@/actions/appearance';
import { useTheme } from '@/components/theme-provider';

interface AppearanceContextType {
  settings: AppearanceSettings;
  updateSettings: (newSettings: Partial<AppearanceSettings>) => Promise<void>;
  isLoading: boolean;
  resetSettings: () => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ 
  children, 
  initialSettings,
  userId 
}: { 
  children: ReactNode;
  initialSettings?: AppearanceSettings | null;
  userId: string;
}) {
  const [settings, setSettings] = useState<AppearanceSettings>(
    initialSettings || defaultAppearanceSettings
  );
  const [isLoading, setIsLoading] = useState(false);
  const { setTheme } = useTheme();

  // Appliquer les changements au DOM (sauf le thème qui est géré par ThemeProvider)
  useEffect(() => {
    // Ne rien appliquer automatiquement - tout est sauvegardé en DB
    // et sera appliqué au prochain rechargement
  }, [settings]);

  const updateSettings = async (newSettings: Partial<AppearanceSettings>) => {
    setIsLoading(true);
    
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // Si le thème change, le synchroniser avec ThemeProvider
      if (newSettings.theme) {
        setTheme(newSettings.theme as 'light' | 'dark' | 'system');
      }
      
      // Sauvegarder en base
      await updateAppearanceSettings(userId, newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSettings = async () => {
    setIsLoading(true);
    
    try {
      setSettings(defaultAppearanceSettings);
      setTheme(defaultAppearanceSettings.theme);
      await updateAppearanceSettings(userId, defaultAppearanceSettings);
    } catch (error) {
      console.error('Error resetting settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppearanceContext.Provider value={{ settings, updateSettings, isLoading, resetSettings }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return context;
}

// Fonction vide - on n'applique rien en temps réel pour éviter les bugs
export function applyAppearanceToDOM(settings: AppearanceSettings) {
  // Ne rien faire - tout sera appliqué au prochain rechargement
  console.log('Settings saved:', settings);
}
