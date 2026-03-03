'use client';

import { useState } from 'react';
import { Smartphone, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCreateDriverAccount, useRevokeDriverAccount, useResetDriverPassword } from '@/hooks/use-driver-auth';
import { useUserContext } from '@/components/providers/user-provider';

// ============================================================================
// TYPES
// ============================================================================

interface DriverAppAccessManagerProps {
  driverId: string;
  driver: {
    id: string;
    user_id: string | null;
    has_app_access: boolean;
    first_name: string;
    last_name: string;
    email: string;
    company_id: string;
  };
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function DriverAppAccessManager({ driverId, driver }: DriverAppAccessManagerProps) {
  const { user } = useUserContext();
  const createAccount = useCreateDriverAccount();
  const revokeAccount = useRevokeDriverAccount();
  const resetPassword = useResetDriverPassword();
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Form states
  const [appEmail, setAppEmail] = useState(driver.email || '');
  const [appPassword, setAppPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Vérifier si l'utilisateur est autorisé (Admin ou Director)
  const isAuthorized = user?.role === 'ADMIN' || user?.role === 'DIRECTEUR';
  
  // Handler : Créer le compte
  const handleCreate = async () => {
    if (!appEmail || !appPassword) return;
    
    await createAccount.mutateAsync({
      driverId,
      email: appEmail,
      password: appPassword,
      firstName: driver.first_name,
      lastName: driver.last_name,
      companyId: driver.company_id,
    });
    
    setShowCreateDialog(false);
    setAppPassword('');
  };
  
  // Handler : Révoquer le compte
  const handleRevoke = async () => {
    await revokeAccount.mutateAsync({
      driverId,
      companyId: driver.company_id,
    });
    
    setShowRevokeDialog(false);
  };
  
  // Handler : Réinitialiser le mot de passe
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) return;
    
    await resetPassword.mutateAsync({
      driverId,
      companyId: driver.company_id,
      newPassword,
    });
    
    setShowResetDialog(false);
    setNewPassword('');
  };
  
  // Si pas d'accès app
  if (!driver.has_app_access) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-white">Application mobile</p>
                  <p className="text-xs text-slate-400">
                    Ce conducteur n&apos;a pas encore d&apos;accès à l&apos;app FleetMaster
                  </p>
                </div>
              </div>
              
              {isAuthorized && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateDialog(true)}
                  disabled={createAccount.isPending}
                >
                  {createAccount.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Créer un accès app
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Dialog Création */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-[#0f172a] border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Smartphone className="h-5 w-5 text-blue-500" />
                Créer un accès application
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Créez un compte pour que {driver.first_name} {driver.last_name} puisse 
                se connecter à l&apos;application mobile FleetMaster.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="app-email">Email de connexion</Label>
                <Input
                  id="app-email"
                  type="email"
                  value={appEmail}
                  onChange={(e) => setAppEmail(e.target.value)}
                  placeholder="conducteur@entreprise.com"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="app-password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="app-password"
                    type={showPassword ? 'text' : 'password'}
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="bg-slate-800 border-slate-700 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
                {appPassword && appPassword.length < 8 && (
                  <p className="text-xs text-red-400">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                )}
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400">
                  <strong>Information :</strong> Le conducteur pourra modifier son mot de passe 
                  dans l&apos;application. Un email de confirmation ne sera pas envoyé (compte activé directement).
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!appEmail || !appPassword || appPassword.length < 8 || createAccount.isPending}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {createAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer le compte
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  
  // Si l'accès est actif
  return (
    <>
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-white">Application mobile</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                    <CheckCircle className="h-3 w-3" />
                    Activée
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Le conducteur peut se connecter à l&apos;app mobile FleetMaster
                </p>
              </div>
            </div>
            
            {isAuthorized && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetDialog(true)}
                  disabled={resetPassword.isPending}
                >
                  {resetPassword.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : null}
                  Réinitialiser MDP
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setShowRevokeDialog(true)}
                  disabled={revokeAccount.isPending}
                >
                  {revokeAccount.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-1.5" />
                  )}
                  Révoquer
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog Réinitialisation MDP */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-[#0f172a] border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription className="text-slate-400">
              Définissez un nouveau mot de passe pour {driver.first_name} {driver.last_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="bg-slate-800 border-slate-700 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-red-400">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 8 || resetPassword.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {resetPassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Révocation */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="bg-[#0f172a] border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Révoquer l&apos;accès
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Êtes-vous sûr de vouloir révoquer l&apos;accès de {driver.first_name} {driver.last_name} ?
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              <strong>Attention :</strong> Le conducteur ne pourra plus se connecter à l&apos;application mobile. 
              Cette action peut être annulée ultérieurement en réactivant le compte.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={revokeAccount.isPending}
              variant="destructive"
            >
              {revokeAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Révoquer l&apos;accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
