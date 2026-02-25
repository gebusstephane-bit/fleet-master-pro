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
import { ArrowLeft, Shield, Key, Smartphone, Lock, History, Save, Trash2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword } from '@/actions/account/update-password';

export default function SecurityPage() {
  const { user } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Validation en temps réel du mot de passe
  const passwordCriteria = {
    minLength: passwordForm.newPassword.length >= 12,
    hasUppercase: /[A-Z]/.test(passwordForm.newPassword),
    hasNumber: /[0-9]/.test(passwordForm.newPassword),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordForm.newPassword),
  };

  const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
  const passwordsMatch = passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword !== '';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allCriteriaMet) {
      toast.error('Le mot de passe ne respecte pas tous les critères de sécurité');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      if (result.success) {
        toast.success(result.message || 'Mot de passe mis à jour avec succès');
        // Réinitialiser le formulaire
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour du mot de passe');
      }
    } catch (error) {
      toast.error('Une erreur est survenue lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  const CriteriaItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={met ? 'text-green-600' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

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
          <CardDescription>Changez votre mot de passe régulièrement pour sécuriser votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Votre mot de passe actuel"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimum 12 caractères"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Répétez le nouveau mot de passe"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordForm.confirmPassword && !passwordsMatch && (
                <p className="text-sm text-red-500">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {/* Critères de mot de passe */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium mb-3">Critères de sécurité :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CriteriaItem met={passwordCriteria.minLength} label="12 caractères minimum" />
                <CriteriaItem met={passwordCriteria.hasUppercase} label="1 majuscule" />
                <CriteriaItem met={passwordCriteria.hasNumber} label="1 chiffre" />
                <CriteriaItem met={passwordCriteria.hasSpecial} label="1 caractère spécial" />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !allCriteriaMet || !passwordsMatch || !passwordForm.currentPassword}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Modification...' : 'Modifier le mot de passe'}
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
