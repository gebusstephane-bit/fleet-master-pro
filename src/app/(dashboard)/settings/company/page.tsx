'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUserContext } from '@/components/providers/user-provider';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Save, Loader2, Camera, Trash2, FileText, Calendar, Users, Code, ExternalLink, Key, Plus, Package, Snowflake, AlertTriangle, AlertOctagon, Truck, Construction, Heart, Star } from 'lucide-react';
import { getCompany, updateCompany, uploadCompanyLogo, deleteCompanyLogo, updateMonthlyReportSettings, ICompanyData } from '@/actions/company';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCompanyActivities, useAddCompanyActivity, useRemoveCompanyActivity, useUpdateCompanyPrimaryActivity, TRANSPORT_ACTIVITIES } from '@/hooks/use-company-activities';
import type { TransportActivity } from '@/actions/company-activities';

export default function CompanyPage() {
  const { user } = useUserContext();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<ICompanyData>({
    name: '',
    siret: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    phone: '',
    email: '',
    logo_url: null,
  });
  
  // Monthly report settings
  const [reportSettings, setReportSettings] = useState({
    monthly_report_enabled: true,
    monthly_report_day: 1,
    monthly_report_recipients: 'ADMIN' as 'ADMIN' | 'ADMIN_AND_DIRECTORS',
  });
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Load company data
  useEffect(() => {
    if (!user?.id) return;
    
    const loadCompany = async () => {
      setIsLoading(true);
      logger.debug('[CompanyPage] Loading company for user:', user.id);
      const result = await getCompany(user.id);
      logger.debug('[CompanyPage] Result:', result);
      if (result.data) {
        logger.debug('[CompanyPage] Company data:', result.data);
        setFormData({
          name: result.data.name || '',
          siret: result.data.siret || '',
          address: result.data.address || '',
          city: result.data.city || '',
          postal_code: result.data.postal_code || '',
          country: result.data.country || 'France',
          phone: result.data.phone || '',
          email: result.data.email || '',
          logo_url: result.data.logo_url,
        });
        setLogoUrl(result.data.logo_url || null);
        // Load monthly report settings
        setReportSettings({
          monthly_report_enabled: result.data.monthly_report_enabled ?? true,
          monthly_report_day: result.data.monthly_report_day ?? 1,
          monthly_report_recipients: (result.data.monthly_report_recipients as 'ADMIN' | 'ADMIN_AND_DIRECTORS') ?? 'ADMIN',
        });
      } else if (result.error) {
        logger.error('[CompanyPage] Error:', result.error);
        toast.error(result.error);
      }
      setIsLoading(false);
    };
    
    loadCompany();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsSaving(true);
    const result = await updateCompany(user.id, formData);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Entreprise mise à jour avec succès');
      router.push('/settings');
    }
    setIsSaving(false);
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    logger.debug('[CompanyPage] File selected:', file?.name, file?.type, file?.size);
    if (!file || !user?.id) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    const result = await uploadCompanyLogo(user.id, formData);
    logger.debug('[CompanyPage] Upload result:', result);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Logo mis à jour');
      setLogoUrl(result.data?.logo_url || null);
      // Mettre à jour formData aussi pour ne pas écraser lors du save
      setFormData(prev => ({ ...prev, logo_url: result.data?.logo_url || null }));
    }
    setIsUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!user?.id) return;
    
    const result = await deleteCompanyLogo(user.id);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Logo supprimé');
      setLogoUrl(null);
    }
  };
  
  const handleSaveReportSettings = async () => {
    if (!user?.id) return;
    
    setIsSavingReport(true);
    const result = await updateMonthlyReportSettings(user.id, reportSettings);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Paramètres du rapport mensuel mis à jour');
    }
    setIsSavingReport(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Entreprise</h1>
          <p className="text-muted-foreground">Informations de votre entreprise</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Logo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Logo Preview */}
              <div 
                onClick={handleLogoClick}
                className="relative h-32 w-32 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary cursor-pointer overflow-hidden bg-muted flex items-center justify-center transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : logoUrl ? (
                  <>
                    <img 
                      src={logoUrl} 
                      alt="Logo entreprise" 
                      className="h-full w-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Cliquer pour ajouter</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium">Logo de l&apos;entreprise</p>
                  <p className="text-sm text-muted-foreground">
                    Format recommandé : PNG ou SVG<br />
                    Taille max : 2 Mo
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleLogoClick}
                    disabled={isUploading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {logoUrl ? 'Changer' : 'Ajouter'}
                  </Button>
                  {logoUrl && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleDeleteLogo}
                      disabled={isUploading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l&apos;entreprise</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>SIRET</Label>
              <Input
                value={formData.siret}
                onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Le SIRET ne peut pas être modifié</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Adresse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Numéro et rue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code postal</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="75000"
                />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Téléphone
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="07 68 48 85 02"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@entreprise.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Report Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rapport mensuel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base">Recevoir le rapport mensuel</Label>
                <p className="text-sm text-muted-foreground">
                  Envoi automatique le 1er de chaque mois à 8h00
                </p>
              </div>
              <Switch
                checked={reportSettings.monthly_report_enabled}
                onCheckedChange={(checked) => 
                  setReportSettings(prev => ({ ...prev, monthly_report_enabled: checked }))
                }
              />
            </div>
            
            {reportSettings.monthly_report_enabled && (
              <>
                {/* Day Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Jour d&apos;envoi préféré
                  </Label>
                  <Select
                    value={String(reportSettings.monthly_report_day)}
                    onValueChange={(value) => 
                      setReportSettings(prev => ({ ...prev, monthly_report_day: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir le jour" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1er du mois</SelectItem>
                      <SelectItem value="5">5ème du mois</SelectItem>
                      <SelectItem value="-1">Dernier jour du mois</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Le rapport couvrira toujours le mois écoulé, quel que soit le jour choisi
                  </p>
                </div>
                
                {/* Recipients Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Destinataires
                  </Label>
                  <Select
                    value={reportSettings.monthly_report_recipients}
                    onValueChange={(value: 'ADMIN' | 'ADMIN_AND_DIRECTORS') => 
                      setReportSettings(prev => ({ ...prev, monthly_report_recipients: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir les destinataires" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrateur uniquement</SelectItem>
                      <SelectItem value="ADMIN_AND_DIRECTORS">Admin + Directeurs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleSaveReportSettings} 
                  disabled={isSavingReport}
                  className="w-full"
                  variant="outline"
                >
                  {isSavingReport ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer les paramètres
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Activités de Transport Section ─────────────────────────── */}
        <CompanyActivitiesSection />

        {/* ── API Section ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              API &amp; Intégrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez Fleet-Master à vos systèmes TMS/ERP via l&apos;API publique REST.
              Authentification par clé API, rate limiting par plan.
            </p>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Key className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium">Clés API</p>
                  <p className="text-xs text-muted-foreground">
                    Créez et gérez vos clés API (format{' '}
                    <code className="rounded bg-muted px-1 font-mono text-xs">sk_live_…</code>).
                  </p>
                  <Link
                    href="/settings/webhooks"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    Gérer les clés API
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Documentation Swagger</p>
                  <p className="text-xs text-muted-foreground">
                    Documentation interactive — testez les endpoints directement depuis le navigateur.
                  </p>
                  <Link
                    href="/api-docs"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    Ouvrir la documentation
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-xs text-amber-400">
              <strong>Rate limiting :</strong> ESSENTIAL 100 req/h · PRO 1 000 req/h · UNLIMITED 10 000 req/h
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

// Map des icônes pour les activités
const ACTIVITY_ICONS: Record<TransportActivity, React.ElementType> = {
  MARCHANDISES_GENERALES: Package,
  FRIGORIFIQUE: Snowflake,
  ADR_COLIS: AlertTriangle,
  ADR_CITERNE: AlertOctagon,
  CONVOI_EXCEPTIONNEL: Truck,
  BENNE_TRAVAUX_PUBLICS: Construction,
  ANIMAUX_VIVANTS: Heart,
};

// Map des couleurs pour les badges
const ACTIVITY_COLORS: Record<TransportActivity, string> = {
  MARCHANDISES_GENERALES: 'bg-gray-100 text-gray-800 border-gray-200',
  FRIGORIFIQUE: 'bg-blue-100 text-blue-800 border-blue-200',
  ADR_COLIS: 'bg-orange-100 text-orange-800 border-orange-200',
  ADR_CITERNE: 'bg-red-100 text-red-800 border-red-200',
  CONVOI_EXCEPTIONNEL: 'bg-purple-100 text-purple-800 border-purple-200',
  BENNE_TRAVAUX_PUBLICS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ANIMAUX_VIVANTS: 'bg-green-100 text-green-800 border-green-200',
};

/**
 * Section Activités de Transport dans les paramètres entreprise
 */
function CompanyActivitiesSection() {
  const { user } = useUserContext();
  const { data: activities, isLoading } = useCompanyActivities();
  const { mutate: addActivity, isPending: isAdding } = useAddCompanyActivity();
  const { mutate: removeActivity, isPending: isRemoving } = useRemoveCompanyActivity();
  const { mutate: setPrimaryActivity, isPending: isSettingPrimary } = useUpdateCompanyPrimaryActivity();
  const [selectedActivity, setSelectedActivity] = useState<TransportActivity | ''>('');

  // Filtrer les activités déjà assignées
  const availableActivities = TRANSPORT_ACTIVITIES.filter(
    (activity) => !activities?.some((a) => a.activity === activity.value)
  );

  const handleAddActivity = () => {
    if (!selectedActivity) return;
    
    addActivity({ 
      activity: selectedActivity, 
      isPrimary: activities?.length === 0 
    });
    setSelectedActivity('');
  };

  const handleRemoveActivity = (activityId: string) => {
    removeActivity(activityId);
  };

  const handleSetPrimary = (activity: TransportActivity) => {
    setPrimaryActivity(activity);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Activités de transport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-12 bg-muted animate-pulse rounded-lg" />
            <div className="h-12 bg-muted animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Activités de transport
        </CardTitle>
        <CardDescription>
          Définissez les types de transport que votre entreprise effectue. 
          Cela détermine les contrôles réglementaires à suivre.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Liste des activités actuelles */}
        <div className="space-y-2">
          {activities?.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg border-dashed">
              Aucune activité définie. Ajoutez votre première activité ci-dessous.
            </div>
          )}
          {activities?.map((activity) => {
            const activityConfig = TRANSPORT_ACTIVITIES.find(a => a.value === activity.activity);
            const Icon = ACTIVITY_ICONS[activity.activity];
            return (
              <div 
                key={activity.id} 
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={activity.is_primary 
                      ? 'bg-primary/10 text-primary border-primary/20' 
                      : 'bg-muted text-muted-foreground'
                    }
                  >
                    {activity.is_primary ? '⭐ Principale' : 'Secondaire'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium">{activityConfig?.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Bouton "Rendre principale" pour les activités secondaires */}
                  {!activity.is_primary && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSetPrimary(activity.activity)}
                      disabled={isSettingPrimary}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      title="Rendre activité principale"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Bouton supprimer uniquement pour les secondaires */}
                  {!activity.is_primary && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveActivity(activity.id)}
                      disabled={isRemoving}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ajouter une activité */}
        {availableActivities.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Select 
              value={selectedActivity} 
              onValueChange={(value) => setSelectedActivity(value as TransportActivity)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner une activité..." />
              </SelectTrigger>
              <SelectContent>
                {availableActivities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.value];
                  return (
                    <SelectItem key={activity.value} value={activity.value}>
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        <div className="flex flex-col">
                          <span>{activity.label}</span>
                          <span className="text-xs text-muted-foreground">{activity.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddActivity}
              disabled={!selectedActivity || isAdding}
              className="shrink-0"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Ajouter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
