'use client';

import { useState } from 'react';
import { Smartphone, Eye, EyeOff, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface DriverAppAccessData {
  enabled: boolean;
  email: string;
  password: string;
}

interface DriverAppAccessSectionProps {
  value: DriverAppAccessData;
  onChange: (value: DriverAppAccessData) => void;
  disabled?: boolean;
}

// ============================================================================
// COMPOSANT : Indicateur de force du mot de passe
// ============================================================================

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;
  
  const length = password.length;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const score = [
    length >= 8,
    hasUppercase && hasLowercase,
    hasNumber,
    hasSpecial,
    length >= 12,
  ].filter(Boolean).length;
  
  let variant: 'weak' | 'medium' | 'strong' = 'weak';
  let label = 'Faible';
  let colorClass = 'bg-red-500';
  
  if (score >= 4) {
    variant = 'strong';
    label = 'Fort';
    colorClass = 'bg-green-500';
  } else if (score >= 2) {
    variant = 'medium';
    label = 'Moyen';
    colorClass = 'bg-yellow-500';
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Force du mot de passe</span>
        <span className={cn(
          'text-xs font-medium',
          variant === 'weak' && 'text-red-500',
          variant === 'medium' && 'text-yellow-500',
          variant === 'strong' && 'text-green-500'
        )}>
          {label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={cn('h-full transition-all duration-300', colorClass)}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={cn(length >= 8 ? 'text-green-500' : 'text-muted-foreground')}>
          <CheckCircle className="inline h-3 w-3 mr-0.5" />
          8+ caractères
        </span>
        <span className={cn(hasUppercase && hasLowercase ? 'text-green-500' : 'text-muted-foreground')}>
          <CheckCircle className="inline h-3 w-3 mr-0.5" />
          Majuscules/minuscules
        </span>
        <span className={cn(hasNumber ? 'text-green-500' : 'text-muted-foreground')}>
          <CheckCircle className="inline h-3 w-3 mr-0.5" />
          Chiffres
        </span>
        <span className={cn(hasSpecial ? 'text-green-500' : 'text-muted-foreground')}>
          <CheckCircle className="inline h-3 w-3 mr-0.5" />
          Caractères spéciaux
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function DriverAppAccessSection({ 
  value, 
  onChange, 
  disabled = false 
}: DriverAppAccessSectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const handleToggle = (enabled: boolean) => {
    onChange({ ...value, enabled });
  };
  
  const handleEmailChange = (email: string) => {
    onChange({ ...value, email });
  };
  
  const handlePasswordChange = (password: string) => {
    onChange({ ...value, password });
  };
  
  return (
    <Card className={cn(
      'border-dashed transition-colors',
      value.enabled && 'border-blue-500/50 bg-blue-500/5'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'p-2 rounded-lg transition-colors',
              value.enabled ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'
            )}>
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Accès Application Conducteur</CardTitle>
              <CardDescription className="text-xs">
                Permettre au conducteur d&apos;utiliser l&apos;app mobile FleetMaster
              </CardDescription>
            </div>
          </div>
          <Switch
            id="enable-app-access"
            checked={value.enabled}
            onCheckedChange={handleToggle}
            disabled={disabled}
          />
        </div>
      </CardHeader>
      
      {value.enabled && (
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="driver-app-email" className="flex items-center gap-1">
                Email de connexion
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="driver-app-email"
                type="email"
                placeholder="conducteur@entreprise.com"
                value={value.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={disabled}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Identifiant de connexion à l&apos;application mobile
              </p>
            </div>
            
            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="driver-app-password" className="flex items-center gap-1">
                Mot de passe
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="driver-app-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8 caractères minimum"
                  value={value.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={disabled}
                  className="bg-background pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={disabled}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Le conducteur pourra le modifier dans l&apos;app
              </p>
            </div>
          </div>
          
          {/* Indicateur de force */}
          {value.password && <PasswordStrengthIndicator password={value.password} />}
          
          {/* Info box */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-400 space-y-1">
              <p>
                <strong>Accès restreint :</strong> Ce compte donne accès uniquement à l&apos;application 
                mobile conducteur. Il ne permet pas d&apos;accéder au tableau de bord de gestion.
              </p>
              <p>
                Le conducteur sera automatiquement rattaché à votre entreprise et pourra :
              </p>
              <ul className="list-disc list-inside ml-1 space-y-0.5">
                <li>Voir son véhicule assigné</li>
                <li>Saisir ses pleins de carburant</li>
                <li>Effectuer des inspections</li>
                <li>Signaler des incidents</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// COMPOSANT : Affichage du statut d'accès (pour la page détail)
// ============================================================================

export interface DriverAppAccessStatusProps {
  hasAccess: boolean;
  onCreateAccess?: () => void;
  onRevokeAccess?: () => void;
  onResetPassword?: () => void;
  disabled?: boolean;
}

export function DriverAppAccessStatus({
  hasAccess,
  onCreateAccess,
  onRevokeAccess,
  onResetPassword,
  disabled = false,
}: DriverAppAccessStatusProps) {
  if (!hasAccess) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Application mobile</p>
                <p className="text-xs text-muted-foreground">
                  Ce conducteur n&apos;a pas encore d&apos;accès à l&apos;app
                </p>
              </div>
            </div>
            {onCreateAccess && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateAccess}
                disabled={disabled}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Créer un accès
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Application mobile</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Activée
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Le conducteur peut se connecter à l&apos;app mobile
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onResetPassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetPassword}
                disabled={disabled}
              >
                Réinitialiser MDP
              </Button>
            )}
            {onRevokeAccess && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onRevokeAccess}
                disabled={disabled}
              >
                <AlertCircle className="h-4 w-4 mr-1.5" />
                Révoquer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
