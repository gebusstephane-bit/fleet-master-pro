'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  User as UserIcon,
  Bell,
  Clock,
  Save
} from 'lucide-react';
import { useUserContext } from '@/components/providers/user-provider';
import { useUser, useUpdateUser, useUpdateNotificationPreferences, useUserPermissions, type User, type NotificationPreferences } from '@/hooks/use-users';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const roleConfig = {
  ADMIN: { label: 'Administrateur', color: 'bg-purple-100 text-purple-700' },
  DIRECTEUR: { label: 'Directeur', color: 'bg-blue-100 text-blue-700' },
  AGENT_DE_PARC: { label: 'Agent de parc', color: 'bg-green-100 text-green-700' },
  EXPLOITANT: { label: 'Exploitant', color: 'bg-gray-100 text-gray-700' },
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUser } = useUserContext();
  const { data: user, preferences, isLoading, refetch } = useUser(userId);
  const { update, isLoading: isUpdating } = useUpdateUser();
  const { update: updateNotifPrefs } = useUpdateNotificationPreferences();
  const permissions = useUserPermissions(currentUser as User);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    role: 'EXPLOITANT' as 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT',
    is_active: true,
  });
  
  const [notifPrefs, setNotifPrefs] = useState<Partial<NotificationPreferences>>({});
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        role: user.role,
        is_active: user.is_active,
      });
    }
    if (preferences) {
      setNotifPrefs(preferences);
    }
  }, [user, preferences]);

  // Vérifier permissions
  if (!permissions.canEditUsers && currentUser?.id !== userId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold">Accès non autorisé</h1>
        <p className="text-gray-500 mt-2">
          Vous n&apos;avez pas les permissions pour modifier cet utilisateur.
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

    if (!formData.first_name || !formData.last_name) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!currentUser?.id) {
      setError('Erreur: utilisateur non authentifié');
      return;
    }

    const result = await update({
      user_id: userId,
      ...formData,
    }, currentUser.id);

    if (result.success) {
      router.push('/settings/users');
    } else {
      setError(result.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleSaveNotifPrefs = async () => {
    if (!currentUser?.id) return;
    
    const result = await updateNotifPrefs(userId, notifPrefs);
    if (result.success) {
      refetch();
    }
  };

  if (isLoading) {
    return <EditUserSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold">Utilisateur non trouvé</h1>
        <Button asChild className="mt-4">
          <Link href="/settings/users">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const isSelf = currentUser?.id === userId;
  const canChangeRole = permissions.isAdmin && !isSelf;

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
          <h1 className="text-2xl font-bold">Modifier l&apos;utilisateur</h1>
          <p className="text-muted-foreground">
            {user.first_name} {user.last_name} • {user.email}
          </p>
        </div>
        <Badge className={roleConfig[user.role].color}>
          {roleConfig[user.role].label}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">
            <UserIcon className="h-4 w-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">
                      Prénom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
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
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-slate-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    L&apos;email ne peut pas être modifié
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rôle et statut */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rôle et statut
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                    disabled={!canChangeRole}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrateur</SelectItem>
                      <SelectItem value="DIRECTEUR">Directeur</SelectItem>
                      <SelectItem value="AGENT_DE_PARC">Agent de parc</SelectItem>
                      <SelectItem value="EXPLOITANT">Exploitant</SelectItem>
                    </SelectContent>
                  </Select>
                  {!canChangeRole && (
                    <p className="text-sm text-muted-foreground">
                      {isSelf 
                        ? 'Vous ne pouvez pas modifier votre propre rôle' 
                        : 'Seul un administrateur peut modifier le rôle'}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Compte actif</Label>
                    <p className="text-sm text-muted-foreground">
                      Un compte inactif ne peut pas se connecter
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    disabled={isSelf}
                  />
                </div>
                {isSelf && (
                  <p className="text-sm text-amber-600">
                    Vous ne pouvez pas désactiver votre propre compte
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Informations système */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Informations système
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span>{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière connexion</span>
                  <span>
                    {user.last_login 
                      ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true, locale: fr })
                      : 'Jamais'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isUpdating}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push('/settings/users')}
                disabled={isUpdating}
              >
                Annuler
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Préférences de notifications
              </CardTitle>
              <CardDescription>
                Choisissez les alertes que vous souhaitez recevoir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alertes */}
              <div className="space-y-4">
                <h3 className="font-medium">Types d&apos;alertes</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenances</Label>
                    <p className="text-sm text-muted-foreground">
                      Nouvelles demandes et validations
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs.alert_maintenance}
                    onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, alert_maintenance: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Inspections</Label>
                    <p className="text-sm text-muted-foreground">
                      Nouveaux contrôles et anomalies
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs.alert_inspection}
                    onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, alert_inspection: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tournées</Label>
                    <p className="text-sm text-muted-foreground">
                      Assignations et modifications
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs.alert_routes}
                    onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, alert_routes: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Documents expirants</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertes avant expiration
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs.alert_documents_expiry}
                    onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, alert_documents_expiry: checked })}
                  />
                </div>
              </div>

              <Separator />

              {/* Canaux */}
              <div className="space-y-4">
                <h3 className="font-medium">Canaux de notification</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir les notifications par email
                    </p>
                  </div>
                  <Switch
                    checked={notifPrefs.email_enabled}
                    onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, email_enabled: checked })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifPrefs} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer les préférences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditUserSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-12" />
      <Skeleton className="h-96" />
    </div>
  );
}
