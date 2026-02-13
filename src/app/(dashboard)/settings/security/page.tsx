'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useUserContext } from '@/components/providers/user-provider';
import { ArrowLeft, Shield, Key, Smartphone, Lock, History, Save, Trash2 } from 'lucide-react';

export default function SecurityPage() {
  const { user } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Change password
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Sécurité</h1>
          <p className="text-muted-foreground">Mot de passe et authentification</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Mot de passe
          </CardTitle>
          <CardDescription>Changez votre mot de passe régulièrement</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label>Mot de passe actuel</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmer le mot de passe</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Modification...' : 'Modifier'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Authentification à deux facteurs
          </CardTitle>
          <CardDescription>Sécurisez votre compte avec 2FA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Activer 2FA</p>
              <p className="text-sm text-muted-foreground">Via application authentificator</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">SMS de secours</p>
              <p className="text-sm text-muted-foreground">Numéro de téléphone de secours</p>
            </div>
            <Button variant="outline" size="sm">Configurer</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sessions actives
          </CardTitle>
          <CardDescription>Gérez vos connexions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Chrome - Windows</p>
              <p className="text-sm text-muted-foreground">Actuel · Paris, France</p>
            </div>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Actif
            </span>
          </div>
          <Separator />
          <Button variant="outline" className="w-full">
            Déconnecter toutes les sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
