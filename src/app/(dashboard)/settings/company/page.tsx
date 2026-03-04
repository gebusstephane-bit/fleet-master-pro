'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserContext } from '@/components/providers/user-provider';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Save, Loader2, Camera, Trash2, FileText, Calendar, Users, Code, ExternalLink, Key } from 'lucide-react';
import { getCompany, updateCompany, uploadCompanyLogo, deleteCompanyLogo, updateMonthlyReportSettings, ICompanyData } from '@/actions/company';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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
                className="relative h-32 w-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary cursor-pointer overflow-hidden bg-slate-50 flex items-center justify-center transition-colors"
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
                    <Building2 className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                    <span className="text-xs text-slate-500">Cliquer pour ajouter</span>
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
                className="bg-slate-50"
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
              Connectez FleetMaster Pro à vos systèmes TMS/ERP via l&apos;API publique REST.
              Authentification par clé API, rate limiting par plan.
            </p>

            <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Key className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium">Clés API</p>
                  <p className="text-xs text-muted-foreground">
                    Créez et gérez vos clés API (format{' '}
                    <code className="rounded bg-slate-200 px-1 font-mono text-xs">sk_live_…</code>).
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
                <FileText className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
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

            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
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
