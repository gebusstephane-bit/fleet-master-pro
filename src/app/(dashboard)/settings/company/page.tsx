'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserContext } from '@/components/providers/user-provider';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Save, Loader2, Camera, Trash2 } from 'lucide-react';
import { getCompany, updateCompany, uploadCompanyLogo, deleteCompanyLogo, ICompanyData } from '@/actions/company';
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

  // Load company data
  useEffect(() => {
    if (!user?.id) return;
    
    const loadCompany = async () => {
      setIsLoading(true);
      console.log('[CompanyPage] Loading company for user:', user.id);
      const result = await getCompany(user.id);
      console.log('[CompanyPage] Result:', result);
      if (result.data) {
        console.log('[CompanyPage] Company data:', result.data);
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
      } else if (result.error) {
        console.error('[CompanyPage] Error:', result.error);
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
    console.log('[CompanyPage] File selected:', file?.name, file?.type, file?.size);
    if (!file || !user?.id) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    const result = await uploadCompanyLogo(user.id, formData);
    console.log('[CompanyPage] Upload result:', result);
    
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
