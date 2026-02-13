'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/components/providers/user-provider';
import { useAppearanceSettings } from '@/hooks/use-appearance-settings';
import { useTheme } from '@/components/theme-provider';
import { applyAppearanceToDOM } from '@/components/providers/appearance-provider';
import {
  colorOptions,
  fontOptions,
  languageOptions,
  dateFormatOptions,
  currencyOptions,
  timezoneOptions,
} from '@/types/appearance';
import {
  ArrowLeft,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Type,
  Layout,
  Globe,
  Clock,
  DollarSign,
  MapPin,
  PanelLeft,
  Sparkles,
  Eye,
  Save,
  RotateCcw,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS, es, de } from 'date-fns/locale';

const locales = { fr, en: enUS, es, de };

export default function AppearancePage() {
  const router = useRouter();
  const { user } = useUserContext();
  const { settings, isLoading, isSaving, updateSettings, resetSettings } = useAppearanceSettings(user?.id || '');
  const { setTheme } = useTheme();
  const [customColor, setCustomColor] = useState(settings.customColor || '#3b82f6');
  const [showSaved, setShowSaved] = useState(false);

  // Appliquer les changements en temps réel
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme); // Synchroniser avec ThemeProvider
    updateSettings({ theme });
  };

  const handleColorChange = (color: string) => {
    const primaryColor = color === 'custom' ? customColor : color;
    const newSettings = { ...settings, primaryColor, customColor: color === 'custom' ? customColor : undefined };
    applyAppearanceToDOM(newSettings);
    updateSettings({ primaryColor, customColor: color === 'custom' ? customColor : undefined });
  };

  const handleDensityChange = (density: 'compact' | 'comfortable' | 'spacious') => {
    const newSettings = { ...settings, density };
    applyAppearanceToDOM(newSettings);
    updateSettings({ density });
  };

  const handleFontChange = (font: 'inter' | 'roboto' | 'poppins') => {
    const newSettings = { ...settings, font };
    applyAppearanceToDOM(newSettings);
    updateSettings({ font });
  };

  const handleFontSizeChange = (fontSize: number) => {
    const newSettings = { ...settings, fontSize };
    applyAppearanceToDOM(newSettings);
    updateSettings({ fontSize });
  };

  const handleSave = async () => {
    await updateSettings(settings);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `fleetmaster-settings-${user?.id}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isLoading) {
    return <AppearanceSkeleton />;
  }

  const isCustomColor = settings.primaryColor && !colorOptions.find(c => c.value === settings.primaryColor);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Thème et personnalisation</h1>
          <p className="text-muted-foreground">
            Personnalisez l&apos;apparence de FleetMaster Pro
          </p>
        </div>
      </div>

      {showSaved && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Préférences sauvegardées avec succès
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Thème */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Thème de l&apos;interface
            </CardTitle>
            <CardDescription>
              Choisissez l&apos;apparence générale de FleetMaster Pro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={settings.theme} 
              onValueChange={(v) => handleThemeChange(v as any)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Thème Clair */}
              <div>
                <RadioGroupItem value="light" id="light" className="sr-only" />
                <Label 
                  htmlFor="light" 
                  className={cn(
                    "flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg",
                    settings.theme === 'light' 
                      ? "border-blue-500 bg-blue-50 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="w-full h-24 bg-white rounded-lg border border-gray-200 mb-4 shadow-sm overflow-hidden">
                    <div className="h-4 bg-gray-100 w-full" />
                    <div className="p-2 space-y-2">
                      <div className="h-2 bg-blue-500 rounded w-3/4" />
                      <div className="h-2 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <Sun className="w-8 h-8 mb-2 text-amber-500" />
                  <span className="font-semibold">Clair</span>
                  <span className="text-xs text-muted-foreground mt-1">Interface lumineuse</span>
                </Label>
              </div>

              {/* Thème Sombre */}
              <div>
                <RadioGroupItem value="dark" id="dark" className="sr-only" />
                <Label 
                  htmlFor="dark" 
                  className={cn(
                    "flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg",
                    settings.theme === 'dark' 
                      ? "border-blue-500 bg-blue-50 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="w-full h-24 bg-gray-900 rounded-lg border border-gray-700 mb-4 shadow-sm overflow-hidden">
                    <div className="h-4 bg-gray-800 w-full" />
                    <div className="p-2 space-y-2">
                      <div className="h-2 bg-blue-400 rounded w-3/4" />
                      <div className="h-2 bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                  <Moon className="w-8 h-8 mb-2 text-indigo-400" />
                  <span className="font-semibold">Sombre</span>
                  <span className="text-xs text-muted-foreground mt-1">Interface sombre</span>
                </Label>
              </div>

              {/* Thème Système */}
              <div>
                <RadioGroupItem value="system" id="system" className="sr-only" />
                <Label 
                  htmlFor="system" 
                  className={cn(
                    "flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg",
                    settings.theme === 'system' 
                      ? "border-blue-500 bg-blue-50 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="w-full h-24 rounded-lg border border-gray-200 mb-4 shadow-sm overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-100 to-gray-900" />
                    <div className="relative h-4 bg-gray-200/50 w-full" />
                  </div>
                  <Monitor className="w-8 h-8 mb-2 text-gray-600" />
                  <span className="font-semibold">Automatique</span>
                  <span className="text-xs text-muted-foreground mt-1">Selon votre système</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Couleurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Couleur principale
            </CardTitle>
            <CardDescription>
              Personnalisez la couleur dominante de l&apos;interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
              {colorOptions.map((color) => {
                const isSelected = settings.primaryColor === color.value || (color.value === 'custom' && isCustomColor);
                return (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    style={{
                      height: '64px',
                      borderRadius: '12px',
                      border: isSelected ? '3px solid #3b82f6' : '2px solid transparent',
                      background: color.value === 'custom' 
                        ? 'linear-gradient(135deg, #ef4444, #22c55e, #3b82f6)' 
                        : color.value,
                      cursor: 'pointer',
                      position: 'relative',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 0 0 4px #bfdbfe' : 'none',
                    }}
                    title={color.name}
                  >
                    {isSelected && (
                      <Check style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        width: '24px', 
                        height: '24px', 
                        color: 'white',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {isCustomColor && (
              <div className="mt-4 flex items-center gap-4">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    handleColorChange('custom');
                  }}
                  className="w-16 h-16 rounded-lg cursor-pointer"
                />
                <div className="flex-1">
                  <Label>Code hexadécimal</Label>
                  <Input 
                    value={customColor} 
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      handleColorChange('custom');
                    }}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Densité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Densité d&apos;affichage
              </CardTitle>
              <CardDescription>
                Ajustez l&apos;espacement entre les éléments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={settings.density} 
                onValueChange={(v) => handleDensityChange(v as any)}
                className="space-y-3"
              >
                {[
                  { value: 'compact', label: 'Compact', desc: 'Plus d\'informations visibles', gap: 'gap-1' },
                  { value: 'comfortable', label: 'Confortable', desc: 'Équilibre par défaut', gap: 'gap-2' },
                  { value: 'spacious', label: 'Aéré', desc: 'Grandes marges', gap: 'gap-3' },
                ].map((option) => (
                  <div 
                    key={option.value}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                      settings.density === option.value ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    )}
                    onClick={() => handleDensityChange(option.value as any)}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.desc}</p>
                      </Label>
                    </div>
                    <div className={cn("flex", option.gap)}>
                      <div className="w-2 h-8 bg-gray-300 rounded" />
                      <div className="w-2 h-8 bg-gray-300 rounded" />
                      <div className="w-2 h-8 bg-gray-300 rounded" />
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Typographie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Police de caractères
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {fontOptions.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => handleFontChange(font.value as any)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all hover:shadow-md",
                      settings.font === font.value 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    style={{ fontFamily: font.value }}
                  >
                    <span className="text-3xl font-bold block mb-2">{font.sample}</span>
                    <span className="font-medium block text-sm">{font.name}</span>
                    <span className="text-xs text-muted-foreground">{font.desc}</span>
                  </button>
                ))}
              </div>

              <div>
                <Label>Taille de police de base: {settings.fontSize}px</Label>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm">A</span>
                  <Slider 
                    value={[settings.fontSize]} 
                    onValueChange={([v]) => handleFontSizeChange(v)}
                    min={12} 
                    max={18} 
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg">A</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Format régional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Format régional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Langue */}
              <div className="space-y-3">
                <Label>Langue</Label>
                <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Format date */}
              <div className="space-y-3">
                <Label>Format des dates</Label>
                <Select value={settings.dateFormat} onValueChange={(v) => updateSettings({ dateFormat: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFormatOptions.map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Exemple : {format(new Date(), settings.dateFormat.replace(/YYYY/g, 'yyyy').replace(/DD/g, 'dd').replace(/MM/g, 'MM'), { locale: locales[settings.language as keyof typeof locales] || fr })}
                </p>
              </div>

              {/* Format heure */}
              <div className="space-y-3">
                <Label>Format des heures</Label>
                <div className="flex gap-4">
                  <button
                    onClick={() => updateSettings({ timeFormat: '24h' })}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 text-center transition-all",
                      settings.timeFormat === '24h' 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200"
                    )}
                  >
                    <Clock className="w-6 h-6 mx-auto mb-2" />
                    <span className="font-medium">24 heures</span>
                    <p className="text-sm text-muted-foreground">14:30</p>
                  </button>
                  <button
                    onClick={() => updateSettings({ timeFormat: '12h' })}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 text-center transition-all",
                      settings.timeFormat === '12h' 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200"
                    )}
                  >
                    <Clock className="w-6 h-6 mx-auto mb-2" />
                    <span className="font-medium">12 heures</span>
                    <p className="text-sm text-muted-foreground">2:30 PM</p>
                  </button>
                </div>
              </div>

              {/* Devise */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Devise
                </Label>
                <Select value={settings.currency} onValueChange={(v) => updateSettings({ currency: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        <span className="flex items-center gap-2">
                          <span>{curr.flag}</span>
                          <span>{curr.name} ({curr.symbol})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fuseau horaire */}
              <div className="space-y-3 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Fuseau horaire
                </Label>
                <Select value={settings.timezone} onValueChange={(v) => updateSettings({ timezone: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {timezoneOptions.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PanelLeft className="w-5 h-5" />
              Barre latérale
            </CardTitle>
            <CardDescription>
              Personnalisez l&apos;apparence et le comportement du menu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Style */}
            <div className="space-y-3">
              <Label>Style</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'default', label: 'Défaut', className: 'bg-white border border-gray-200' },
                  { value: 'floating', label: 'Flottant', className: 'bg-white border border-gray-200 shadow-lg rounded-lg' },
                  { value: 'compact', label: 'Compact', className: 'bg-gray-900' },
                ].map((style) => (
                  <button
                    key={style.value}
                    onClick={() => updateSettings({ sidebarStyle: style.value as any })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition-all",
                      settings.sidebarStyle === style.value ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    )}
                  >
                    <div className={cn("w-full h-12 rounded mb-2", style.className)} />
                    <span className="text-sm">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Réduire automatiquement</p>
                  <p className="text-sm text-muted-foreground">Sur les petits écrans</p>
                </div>
                <Switch 
                  checked={settings.sidebarAutoCollapse}
                  onCheckedChange={(v) => updateSettings({ sidebarAutoCollapse: v })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Afficher les icônes uniquement</p>
                  <p className="text-sm text-muted-foreground">Masquer les labels de menu</p>
                </div>
                <Switch 
                  checked={settings.sidebarIconsOnly}
                  onCheckedChange={(v) => updateSettings({ sidebarIconsOnly: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Animations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Animations et effets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Réduire les animations</p>
                <p className="text-sm text-muted-foreground">Pour améliorer les performances</p>
              </div>
              <Switch 
                checked={settings.reduceMotion}
                onCheckedChange={(v) => updateSettings({ reduceMotion: v })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Effets de transparence (Glassmorphism)</p>
                <p className="text-sm text-muted-foreground">Arrière-plans floutés</p>
              </div>
              <Switch 
                checked={settings.glassEffects}
                onCheckedChange={(v) => updateSettings({ glassEffects: v })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Ombres portées</p>
                <p className="text-sm text-muted-foreground">Profondeur des éléments</p>
              </div>
              <Switch 
                checked={settings.shadows}
                onCheckedChange={(v) => updateSettings({ shadows: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <Button 
            onClick={handleSave}
            className="flex-1"
            size="lg"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder les préférences'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={resetSettings}
            className="flex-1"
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser par défaut
          </Button>
          
          <Button 
            variant="ghost"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-96" />
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}
