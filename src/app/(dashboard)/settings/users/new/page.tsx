'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Shield,
  UserCog,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  User,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useUserContext } from '@/components/providers/user-provider';
import { useCreateUser, useUserPermissions, type User } from '@/hooks/use-users';
import { useToast } from '@/hooks/use-toast';

const roleDescriptions: Record<string, { title: string; description: string; permissions: string[] }> = {
  ADMIN: {
    title: 'Administrateur',
    description: 'Contrôle total de la plateforme',
    permissions: [
      'Gérer tous les utilisateurs',
      'Configurer l\'entreprise',
      'Accès à tous les rapports',
      'Valider les maintenances',
      'Supprimer des données',
    ],
  },
  DIRECTEUR: {
    title: 'Directeur',
    description: 'Gestion opérationnelle complète',
    permissions: [
      'Gérer son équipe (sauf admins)',
      'Valider les maintenances',
      'Voir tous les rapports',
      'Gérer les tournées',
      'Créer des inspections',
    ],
  },
  AGENT_DE_PARC: {
    title: 'Agent de parc',
    description: 'Opérations terrain',
    permissions: [
      'Créer des inspections',
      'Créer des demandes de maintenance',
      'Voir la flotte',
      'Gérer les carburants',
      'Voir ses tournées assignées',
    ],
  },
  EXPLOITANT: {
    title: 'Exploitant',
    description: 'Chauffeur / Opérateur',
    permissions: [
      'Voir ses tournées',
      'Signer les inspections',
      'Signaler des problèmes',
      'Voir ses véhicules assignés',
    ],
  },
};

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useUserContext();
  const { create, isLoading } = useCreateUser();
  const permissions = useUserPermissions(currentUser as User);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'EXPLOITANT' as 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Vérifier permissions
  if (!permissions.canCreateUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold">Accès non autorisé</h1>
        <p className="text-gray-500 mt-2">
          Vous n&apos;avez pas les permissions pour créer des utilisateurs.
        </p>
        <Button asChild className="mt-4">
          <Link href="/settings/users">Retour</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    if (!currentUser?.company_id || !currentUser?.id) {
      setError('Erreur: impossible de déterminer votre entreprise');
      return;
    }

    const result = await create({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      company_id: currentUser.company_id,
      password: formData.password,
    }, currentUser.id);

    if (result.success) {
      toast({
        title: '✅ Utilisateur créé',
        description: `${formData.first_name} ${formData.last_name} a été ajouté avec succès.`,
      });
      router.push('/settings/users');
    } else {
      setError(result.error || 'Erreur lors de la création');
    }
  };

  const selectedRole = roleDescriptions[formData.role];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouvel utilisateur</h1>
          <p className="text-muted-foreground">
            Ajoutez un collaborateur à votre entreprise
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Les informations de base du collaborateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="Jean"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Dupont"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-1" />
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jean.dupont@entreprise.fr"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground">
                L&apos;utilisateur recevra les alertes et notifications sur cette adresse
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-1" />
                Téléphone
              </Label>
              <Input
                id="phone"
                placeholder="06 12 34 56 78"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Pour les notifications SMS (optionnel)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mot de passe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Mot de passe
            </CardTitle>
            <CardDescription>
              Définissez le mot de passe de l&apos;utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Minimum 6 caractères. L&apos;utilisateur pourra le changer plus tard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Rôle et permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Rôle et permissions
            </CardTitle>
            <CardDescription>
              Définissez les accès et permissions de l&apos;utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rôle <span className="text-red-500">*</span></Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {permissions.canCreateAdmin && (
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <div className="flex flex-col">
                          <span className="font-medium">Administrateur</span>
                          <span className="text-xs text-muted-foreground">
                            Accès complet, gestion utilisateurs
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  )}
                  
                  {permissions.canCreateDirecteur && (
                    <SelectItem value="DIRECTEUR">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-blue-600" />
                        <div className="flex flex-col">
                          <span className="font-medium">Directeur</span>
                          <span className="text-xs text-muted-foreground">
                            Gestion équipe, validation, rapports
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  )}
                  
                  <SelectItem value="AGENT_DE_PARC">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <div className="flex flex-col">
                        <span className="font-medium">Agent de parc</span>
                        <span className="text-xs text-muted-foreground">
                          Inspections, maintenances, opérations
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                  
                  <SelectItem value="EXPLOITANT">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <div className="flex flex-col">
                        <span className="font-medium">Exploitant</span>
                        <span className="text-xs text-muted-foreground">
                          Chauffeur, ses tournées uniquement
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Description du rôle sélectionné */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">{selectedRole.title}</h3>
                <Badge variant="outline" className="ml-auto">
                  {selectedRole.description}
                </Badge>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {selectedRole.permissions.map((permission, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-400 rounded-full" />
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer l\'utilisateur'}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => router.push('/settings/users')}
            disabled={isLoading}
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
