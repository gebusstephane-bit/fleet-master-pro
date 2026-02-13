export interface AppearanceSettings {
  // Thème
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  customColor?: string;
  
  // Densité
  density: 'compact' | 'comfortable' | 'spacious';
  
  // Typographie
  font: 'inter' | 'roboto' | 'poppins';
  fontSize: number;
  
  // Format régional
  language: 'fr' | 'en' | 'es' | 'de';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD.MM.YYYY';
  timeFormat: '12h' | '24h';
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF';
  timezone: string;
  
  // Sidebar
  sidebarStyle: 'default' | 'floating' | 'compact';
  sidebarAutoCollapse: boolean;
  sidebarIconsOnly: boolean;
  
  // Animations
  reduceMotion: boolean;
  glassEffects: boolean;
  shadows: boolean;
}

export const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  primaryColor: '#3b82f6',
  density: 'comfortable',
  font: 'inter',
  fontSize: 14,
  language: 'fr',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  currency: 'EUR',
  timezone: 'Europe/Paris',
  sidebarStyle: 'default',
  sidebarAutoCollapse: true,
  sidebarIconsOnly: false,
  reduceMotion: false,
  glassEffects: true,
  shadows: true,
};

export const colorOptions = [
  { name: 'Bleu', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' },
  { name: 'Rose', value: '#ec4899', class: 'bg-pink-500' },
  { name: 'Rouge', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
  { name: 'Ambre', value: '#f59e0b', class: 'bg-amber-500' },
  { name: 'Vert', value: '#10b981', class: 'bg-emerald-500' },
  { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500' },
  { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'Slate', value: '#64748b', class: 'bg-slate-500' },
  { name: 'Personnalisé', value: 'custom', class: 'bg-gradient-to-br from-red-500 via-green-500 to-blue-500' },
];

export const fontOptions = [
  { name: 'Inter', value: 'inter', sample: 'Aa', desc: 'Moderne et lisible' },
  { name: 'Roboto', value: 'roboto', sample: 'Aa', desc: 'Google Material' },
  { name: 'Poppins', value: 'poppins', sample: 'Aa', desc: 'Arrondie et amicale' },
];

export const languageOptions = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export const dateFormatOptions = [
  { value: 'DD/MM/YYYY', label: '31/12/2024 (Français)', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/31/2024 (US)', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31 (ISO)', example: '2024-12-31' },
  { value: 'DD.MM.YYYY', label: '31.12.2024 (Allemand)', example: '31.12.2024' },
];

export const currencyOptions = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'Livre', symbol: '£', flag: '🇬🇧' },
  { code: 'CHF', name: 'Franc suisse', symbol: 'CHF', flag: '🇨🇭' },
];

export const timezoneOptions = [
  { value: 'Europe/Paris', label: 'Paris (UTC+1)', offset: '+1' },
  { value: 'Europe/London', label: 'Londres (UTC+0)', offset: '+0' },
  { value: 'America/New_York', label: 'New York (UTC-5)', offset: '-5' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)', offset: '-8' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)', offset: '+9' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)', offset: '+4' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+11)', offset: '+11' },
];
